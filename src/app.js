const express = require('express');
const cors = require('cors');
const authController = require('./controllers/auth.controller');
const searchController = require('./controllers/search.controller');
const authMiddleware = require('./middleware/auth.middleware');
const rateLimitMiddleware = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/error.middleware');
const logger = require('./utils/logger');



// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// General Rate Limiter
app.use(rateLimitMiddleware.generalLimiter);

// Routes
// 2. Search
// Authenticated + Dedicated Rate Limit
// Versioning: /api/v1
const apiRouter = express.Router();
app.use('/api/v1', apiRouter);

apiRouter.post('/auth/register', authController.register);
apiRouter.post('/auth/login', authController.login);
apiRouter.post('/auth/send-otp', authController.sendVerificationCode);
apiRouter.get('/auth/me', authMiddleware.verifyToken, authController.getUserProfile);

apiRouter.post('/search', authMiddleware.verifyToken, rateLimitMiddleware.searchLimiter, searchController.createSearchJob);
apiRouter.get('/search/status/:id', authMiddleware.verifyToken, searchController.getSearchStatus);
apiRouter.get('/search/popular', searchController.getMostSearched);

// Support legacy routes for backward compatibility if needed, or redirect
// For now, I will just map /api/v1. The user complained about no versioning.

// 4. Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'System operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res, next) => {
    next(new Error('Endpoint not found')); // Or custom AppError
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
