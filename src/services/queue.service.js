const { getDB } = require('../db');
const searchService = require('../services/search.service');
const logger = require('../utils/logger');
const config = require('../config');

class JobQueue {
    constructor() {
        this.isWorking = false;
        this.workerInterval = null;
        this.maxConcurrent = config.scrapper.maxConcurrent || 2; // Default to 2 if not set
        this.activeJobs = 0;
    }

    /**
     * Adds a new search job to the queue
     */
    async addJob(userId, queryData) {
        const db = await getDB();
        const { q, location, lat, lng } = queryData;

        // Serialize query params for later use
        const jobPayload = JSON.stringify({ q, location, lat, lng });

        const result = await db.run(
            `INSERT INTO search_jobs (user_id, query, location, status, result) VALUES (?, ?, ?, 'pending', ?)`,
            [userId, q, location || (lat + ',' + lng), jobPayload]
        );

        return result.lastID;
    }

    /**
     * Retrieves job status and result
     */
    async getJob(jobId, userId) {
        const db = await getDB();
        // Ensure user owns job or is admin (simplify to userId check for now)
        const job = await db.get('SELECT * FROM search_jobs WHERE id = ? AND user_id = ?', [jobId, userId]);
        if (job && job.result && (job.status === 'completed' || job.status === 'failed')) {
            try {
                // If completed/failed, result field might contain the output or error details
                // But for 'pending', result stores the input payload.
                // Let's differentiate:
                // When we complete, we overwrite 'result' with actual output.
                // When pending, it holds input. 
                // Wait, design flaw. Better to have separate input_payload column.
                // For simplicity now: parse result. If status is completed/failed, it's output.
                job.data = JSON.parse(job.result);
            } catch (e) {
                job.data = null;
            }
        }
        return job;
    }

    /**
     * Start the background worker
     */
    startWorker() {
        if (this.workerInterval) return;
        logger.info('Starting Job Queue Worker...');

        this.workerInterval = setInterval(async () => {
            if (this.activeJobs >= this.maxConcurrent) return;

            await this.processNextJob();
        }, 2000); // Check every 2 seconds
    }

    /**
     * Stop the worker
     */
    stopWorker() {
        if (this.workerInterval) clearInterval(this.workerInterval);
        this.workerInterval = null;
    }

    async processNextJob() {
        const db = await getDB();

        // Find a pending job
        // Transaction to lock? SQLite doesn't support select..for update easily.
        // Simple optimistic approach: Set status to processing immediately.

        try {
            const job = await db.get(`SELECT * FROM search_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`);

            if (!job) return;

            // Mark as processing
            await db.run(`UPDATE search_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [job.id]);

            this.activeJobs++;
            logger.info(`Processing Job #${job.id}: ${job.query}`);

            // Perform Search
            // The 'result' column currently holds the input payload JSON.
            let queryData;
            try {
                queryData = JSON.parse(job.result);
            } catch (e) {
                // If payload is corrupted, fail job
                await this.completeJob(job.id, 'failed', null, 'Invalid job payload');
                return;
            }

            // Execute Service logic (which includes validation, geocoding, scraping)
            searchService.performSearch(queryData)
                .then(async (data) => {
                    await this.completeJob(job.id, 'completed', data);
                })
                .catch(async (err) => {
                    await this.completeJob(job.id, 'failed', null, err.message);
                });

        } catch (err) {
            logger.error(`Worker Error: ${err.message}`);
        }
    }

    async completeJob(id, status, data, errorMsg = null) {
        const db = await getDB();
        try {
            const jsonResult = JSON.stringify(data || {});
            await db.run(
                `UPDATE search_jobs SET status = ?, result = ?, error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [status, jsonResult, errorMsg, id]
            );
            logger.info(`Job #${id} finished with status: ${status}`);
        } catch (err) {
            logger.error(`Failed to update job #${id}: ${err.message}`);
        } finally {
            this.activeJobs--; // free up slot
        }
    }
}

module.exports = new JobQueue();
