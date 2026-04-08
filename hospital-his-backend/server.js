// No changes needed.

require('dotenv').config();
console.log("Mongo URI found:", !!process.env.MONGODB_URI);
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Configuration
const config = require('./config/config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/error.middleware');

// Route imports
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const opdRoutes = require('./routes/opd.routes');
const ipdRoutes = require('./routes/ipd.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const emergencyOrderSetRoutes = require('./routes/emergency.orderSet.routes');
const emrRoutes = require('./routes/emr.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const labRoutes = require('./routes/lab.routes');
const radiologyRoutes = require('./routes/radiology.routes');
const pharmacyRoutes = require('./routes/pharmacy.routes');
const billingRoutes = require('./routes/billing.routes');
const paymentRoutes = require('./routes/payment.routes');
const insuranceRoutes = require('./routes/insurance.routes');
const surgeryRoutes = require('./routes/surgery.routes');
// const inventoryRoutes = require('./routes/inventory.routes');
const bedRoutes = require('./routes/bed.routes');
const staffRoutes = require('./routes/staff.routes');
const departmentRoutes = require('./routes/department.routes');
const tariffRoutes = require('./routes/tariff.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const nursingRoutes = require('./routes/nursing.routes');
const carePlanRoutes = require('./routes/careplan.routes');
const nurseAssignmentRoutes = require('./routes/nurseAssignment.routes');
const masterdataRoutes = require('./routes/masterdata.routes');
const userManagementRoutes = require('./routes/userManagement.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const revenueAnomalyRoutes = require('./routes/revenueAnomaly.routes');
const breakGlassRoutes = require('./routes/breakGlass.routes');
const adminBreakGlassRoutes = require('./routes/adminBreakGlass.routes');
const inventoryManagerRoutes = require('./routes/inventoryManager.routes');
const clinicalCodingRoutes = require('./routes/clinicalCoding.routes');
const incidentRoutes = require('./routes/incident.routes');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Make io accessible to routes
app.set('io', io);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (lab reports, etc.)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// HTTP request logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim()),
        },
    }));
}

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Hospital HIS API is running',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/opd`, opdRoutes);
app.use(`${API_PREFIX}/ipd`, ipdRoutes);
app.use(`${API_PREFIX}/emergency`, emergencyRoutes);
app.use(`${API_PREFIX}/emergency`, emergencyOrderSetRoutes);
app.use(`${API_PREFIX}/emr`, emrRoutes);
app.use(`${API_PREFIX}/prescriptions`, prescriptionRoutes);
app.use(`${API_PREFIX}/lab`, labRoutes);
app.use(`${API_PREFIX}/radiology`, radiologyRoutes);
app.use(`${API_PREFIX}/pharmacy`, pharmacyRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/insurance`, insuranceRoutes);
app.use(`${API_PREFIX}/surgery`, surgeryRoutes);
// app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/beds`, bedRoutes);
app.use(`${API_PREFIX}/staff`, staffRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);
app.use(`${API_PREFIX}/tariffs`, tariffRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/nursing`, nursingRoutes);
app.use(`${API_PREFIX}/care-plans`, carePlanRoutes);
app.use(`${API_PREFIX}/nurse-assignments`, nurseAssignmentRoutes);
app.use(`${API_PREFIX}/admin/master`, masterdataRoutes);
app.use(`${API_PREFIX}/admin/users`, userManagementRoutes);
app.use(`${API_PREFIX}/admin/dashboard`, adminDashboardRoutes);
app.use(`${API_PREFIX}/admin/revenue-anomalies`, revenueAnomalyRoutes);
app.use(`${API_PREFIX}/break-glass`, breakGlassRoutes);
app.use(`${API_PREFIX}/admin/break-glass`, adminBreakGlassRoutes);
app.use(`${API_PREFIX}/inventory-manager`, inventoryManagerRoutes);
app.use(`${API_PREFIX}/clinical-coding`, clinicalCodingRoutes);
app.use(`${API_PREFIX}/incidents`, incidentRoutes);
app.use(`${API_PREFIX}/nursing`, nursingRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
    });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// ============================================
// SOCKET.IO EVENTS
// ============================================

io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join user to their personal room (for notifications)
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        logger.info(`User ${userId} joined personal room`);
    });

    // Join department room
    socket.on('join-department', (departmentId) => {
        socket.join(`department-${departmentId}`);
        logger.info(`Socket ${socket.id} joined department ${departmentId}`);
    });

    // Join ward room (for bed updates)
    socket.on('join-ward', (wardId) => {
        socket.join(`ward-${wardId}`);
        logger.info(`Socket ${socket.id} joined ward ${wardId}`);
    });

    // Join emergency room (for live ER dashboard)
    socket.on('join-emergency', () => {
        socket.join('emergency-room');
        logger.info(`Socket ${socket.id} joined emergency room`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = config.port;

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start HTTP server
        httpServer.listen(PORT, () => {
            logger.info('═══════════════════════════════════════════════════════════════');
            logger.info('       HOSPITAL INFORMATION SYSTEM (HIS) BACKEND SERVER        ');
            logger.info('═══════════════════════════════════════════════════════════════');
            logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
            logger.info(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
            logger.info(`🔌 WebSocket enabled`);
            logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
            logger.info('═══════════════════════════════════════════════════════════════');
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
