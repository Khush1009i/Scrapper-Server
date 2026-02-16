const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    // Send response
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
