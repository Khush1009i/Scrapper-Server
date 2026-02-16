const express = require('express');
const cors = require('cors');
const authController = require('./controllers/auth.controller');
const searchController = require('./controllers/search.controller');
const authMiddleware = require('./middleware/auth.middleware');
const rateLimitMiddleware = require('./middleware/rateLimiter');



// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// General Rate Limiter
app.use(rateLimitMiddleware.generalLimiter);

// Routes
// 1. Authentication
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.post('/auth/send-otp', authController.sendVerificationCode);
app.get('/auth/me', authMiddleware.verifyToken, authController.getUserProfile);

// 2. Search
// Authenticated + Dedicated Rate Limit
app.get('/search', authMiddleware.verifyToken, rateLimitMiddleware.searchLimiter, searchController.search);

// 3. Popular Searches (No Auth Required)
app.get('/search/popular', searchController.getMostSearched);

// 4. Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke inside the server.' });
});

module.exports = app;
