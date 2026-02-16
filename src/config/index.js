require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    email: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    mongoUri: process.env.MONGO_URI, // Optional if using SQLite
    dbPath: process.env.DB_PATH || './database.sqlite',
    scrapper: {
        maxConcurrent: 5,
        timeout: 45000,
        cacheTtl: 600
    }
};

module.exports = config;
