const rateLimit = require('express-rate-limit');

exports.searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per windowMs
    // keyGenerator removed to use default IP handling which supports IPv6
    message: { error: 'Too many search requests. Please try again later.' }
});

exports.generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 mins
    message: { error: 'Too many requests from this IP, please try again later.' }
});
