const AIAnomaly = require('../models/AIAnomaly');
const AIPrediction = require('../models/AIPrediction');
const axios = require('axios');
const config = require('../config/config');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// ==========================================
// Revenue Leakage Detection
// ==========================================

/**
 * @desc    Trigger revenue scan
 * @route   POST /api/ai/revenue/scan
 */
exports.triggerRevenueScan = asyncHandler(async (req, res, next) => {
    try {
        // Call ML service
        const response = await axios.post(`${config.ml.revenueServiceUrl}/detect`, req.body);

        // Store detected anomalies
        if (response.data.anomalies && response.data.anomalies.length > 0) {
            await AIAnomaly.insertMany(response.data.anomalies);
        }

        res.status(200).json({
            success: true,
            message: 'Revenue scan completed',
            data: {
                anomaliesDetected: response.data.anomalies?.length || 0,
            },
        });
    } catch (error) {
        return next(new ErrorResponse('ML service unavailable', 503));
    }
});

/**
 * @desc    Get anomalies
 * @route   GET /api/ai/revenue/anomalies
 */
exports.getAnomalies = asyncHandler(async (req, res, next) => {
    const { status, type, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.anomalyType = type;

    const skip = (page - 1) * limit;

    const anomalies = await AIAnomaly.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('reviewedBy', 'profile.firstName profile.lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ detectionDate: -1, anomalyScore: -1 });

    const total = await AIAnomaly.countDocuments(query);

    res.status(200).json({
        success: true,
        count: anomalies.length,
        total,
        page: parseInt(page),
        data: anomalies,
    });
});

/**
 * @desc    Get anomaly by ID
 * @route   GET /api/ai/revenue/anomalies/:id
 */
exports.getAnomalyById = asyncHandler(async (req, res, next) => {
    const anomaly = await AIAnomaly.findById(req.params.id)
        .populate('patient')
        .populate('reviewedBy', 'profile');

    if (!anomaly) {
        return next(new ErrorResponse('Anomaly not found', 404));
    }

    res.status(200).json({
        success: true,
        data: anomaly,
    });
});

/**
 * @desc    Update anomaly status
 * @route   PUT /api/ai/revenue/anomalies/:id
 */
exports.updateAnomalyStatus = asyncHandler(async (req, res, next) => {
    const anomaly = await AIAnomaly.findById(req.params.id);

    if (!anomaly) {
        return next(new ErrorResponse('Anomaly not found', 404));
    }

    anomaly.status = req.body.status;
    anomaly.resolutionNotes = req.body.resolutionNotes;
    anomaly.reviewedBy = req.user.id;
    anomaly.reviewedAt = new Date();
    await anomaly.save();

    res.status(200).json({
        success: true,
        data: anomaly,
    });
});

/**
 * @desc    Get revenue dashboard
 * @route   GET /api/ai/revenue/dashboard
 */
exports.getRevenueDashboard = asyncHandler(async (req, res, next) => {
    const [totalAnomalies, byStatus, byType, totalLeakage] = await Promise.all([
        AIAnomaly.countDocuments(),
        AIAnomaly.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        AIAnomaly.aggregate([
            { $group: { _id: '$anomalyType', count: { $sum: 1 } } },
        ]),
        AIAnomaly.aggregate([
            { $match: { status: { $ne: 'false-positive' } } },
            { $group: { _id: null, total: { $sum: '$details.leakageAmount' } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalAnomalies,
            totalLeakage: totalLeakage[0]?.total || 0,
            byStatus: byStatus.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            byType: byType.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

// ==========================================
// Predictive Analytics
// ==========================================

/**
 * @desc    Predict OPD rush
 * @route   POST /api/ai/predict/opd-rush
 */
exports.predictOPDRush = asyncHandler(async (req, res, next) => {
    try {
        const response = await axios.post(`${config.ml.predictServiceUrl}/predict/opd-rush`, req.body);

        const prediction = await AIPrediction.create({
            predictionType: 'opd-rush',
            forecastPeriod: req.body.forecastPeriod,
            predictions: response.data.predictions,
            modelVersion: response.data.modelVersion,
        });

        res.status(200).json({
            success: true,
            data: prediction,
        });
    } catch (error) {
        return next(new ErrorResponse('ML service unavailable', 503));
    }
});

/**
 * @desc    Predict bed occupancy
 * @route   POST /api/ai/predict/bed-occupancy
 */
exports.predictBedOccupancy = asyncHandler(async (req, res, next) => {
    try {
        const response = await axios.post(`${config.ml.predictServiceUrl}/predict/bed-occupancy`, req.body);

        const prediction = await AIPrediction.create({
            predictionType: 'bed-occupancy',
            forecastPeriod: req.body.forecastPeriod,
            predictions: response.data.predictions,
            modelVersion: response.data.modelVersion,
        });

        res.status(200).json({
            success: true,
            data: prediction,
        });
    } catch (error) {
        return next(new ErrorResponse('ML service unavailable', 503));
    }
});

/**
 * @desc    Predict lab workload
 * @route   POST /api/ai/predict/lab-workload
 */
exports.predictLabWorkload = asyncHandler(async (req, res, next) => {
    try {
        const response = await axios.post(`${config.ml.predictServiceUrl}/predict/lab-workload`, req.body);

        const prediction = await AIPrediction.create({
            predictionType: 'lab-workload',
            forecastPeriod: req.body.forecastPeriod,
            predictions: response.data.predictions,
            modelVersion: response.data.modelVersion,
        });

        res.status(200).json({
            success: true,
            data: prediction,
        });
    } catch (error) {
        return next(new ErrorResponse('ML service unavailable', 503));
    }
});

/**
 * @desc    Get all predictions
 * @route   GET /api/ai/predictions
 */
exports.getAllPredictions = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const predictions = await AIPrediction.find()
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ predictionDate: -1 });

    const total = await AIPrediction.countDocuments();

    res.status(200).json({
        success: true,
        count: predictions.length,
        total,
        page: parseInt(page),
        data: predictions,
    });
});

/**
 * @desc    Get predictions by type
 * @route   GET /api/ai/predictions/:type
 */
exports.getPredictionsByType = asyncHandler(async (req, res, next) => {
    const predictions = await AIPrediction.find({ predictionType: req.params.type })
        .sort({ predictionDate: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        count: predictions.length,
        data: predictions,
    });
});
