const searchService = require('../services/search.service');
const jobQueue = require('../services/queue.service');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// Endpoint: POST /api/v1/search (Async Job Creation)
exports.createSearchJob = async (req, res, next) => {
    try {
        logger.info(`Incoming search job request: ${JSON.stringify(req.body)}`);

        // Use query params for GET or body for POST - supporting both for flexibility 
        // But standardized rest usually implies POST for creating resource (Job)
        const queryPayload = Object.keys(req.body).length > 0 ? req.body : req.query;

        // Basic validation before queuing
        if (!queryPayload.q) {
            throw new AppError('Search query (q) is required.', 400);
        }

        // Add to Queue
        const jobId = await jobQueue.addJob(req.user.id, queryPayload);

        res.status(202).json({
            success: true,
            message: 'Search job accepted. Please poll the status endpoint for results.',
            jobId: jobId,
            statusUrl: `/api/v1/search/status/${jobId}`
        });

    } catch (error) {
        next(error);
    }
};

// Endpoint: GET /api/v1/search/status/:id
exports.getSearchStatus = async (req, res, next) => {
    try {
        const jobId = req.params.id;
        const job = await jobQueue.getJob(jobId, req.user.id);

        if (!job) {
            throw new AppError('Job not found or unauthorized.', 404);
        }

        res.status(200).json({
            success: true,
            status: job.status,
            data: job.data, // This will be null if pending/processing
            error: job.error,
            created_at: job.created_at,
            updated_at: job.updated_at
        });

    } catch (error) {
        next(error);
    }
};

exports.getMostSearched = (req, res, next) => {
    try {
        const popularCategories = [
            "Restaurants",
            "Tech",
            "IT Company",
            "Tea & Coffee"
        ];

        res.status(200).json({
            success: true,
            data: { categories: popularCategories }
        });
    } catch (error) {
        next(error);
    }
};
