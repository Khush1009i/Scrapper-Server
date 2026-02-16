require('dotenv').config();
const app = require('./app');
const { initDB } = require('./db');
const jobQueue = require('./services/queue.service');

const PORT = process.env.PORT || 3000;

// Initialize Database and Start Server
initDB().then(() => {
    // Start background worker for scraping
    jobQueue.startWorker();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database or worker:', err);
});
