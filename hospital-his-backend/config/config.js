require('dotenv').config();

/**
 * Application Configuration
 * Centralized environment variables and configuration settings
 */

const config = {
    // Server Configuration
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // MongoDB Configuration
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_his',

    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',

    // ML Services URLs
    mlRevenueServiceUrl: process.env.ML_REVENUE_SERVICE_URL || 'http://localhost:5001',
    mlPredictServiceUrl: process.env.ML_PREDICT_SERVICE_URL || 'http://localhost:5002',

    // Email/SMTP Configuration
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@hospital-his.com',
    },

    // AWS Configuration
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_KEY || '',
        bucketName: process.env.AWS_BUCKET_NAME || 'hospital-his-files',
        region: process.env.AWS_REGION || 'ap-south-1',
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000,
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // Cors
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
};

module.exports = config;
