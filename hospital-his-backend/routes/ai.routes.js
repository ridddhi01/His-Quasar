const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

// ==========================================
// Revenue Leakage Detection
// ==========================================

/**
 * @route   POST /api/ai/revenue/scan
 * @desc    Trigger anomaly detection scan
 */
router.post('/revenue/scan', authorize('admin', 'compliance'), aiController.triggerRevenueScan);

/**
 * @route   GET /api/ai/revenue/anomalies
 * @desc    Get detected anomalies
 */
router.get('/revenue/anomalies', authorize('admin', 'compliance', 'billing'), aiController.getAnomalies);

/**
 * @route   GET /api/ai/revenue/anomalies/:id
 * @desc    Get specific anomaly
 */
router.get('/revenue/anomalies/:id', authorize('admin', 'compliance', 'billing'), aiController.getAnomalyById);

/**
 * @route   PUT /api/ai/revenue/anomalies/:id
 * @desc    Update anomaly status (review)
 */
router.put('/revenue/anomalies/:id', authorize('admin', 'compliance'), aiController.updateAnomalyStatus);

/**
 * @route   GET /api/ai/revenue/dashboard
 * @desc    Get revenue leakage dashboard
 */
router.get('/revenue/dashboard', authorize('admin', 'compliance'), aiController.getRevenueDashboard);

// ==========================================
// Predictive Analytics
// ==========================================

/**
 * @route   POST /api/ai/predict/opd-rush
 * @desc    Predict OPD rush hours
 */
router.post('/predict/opd-rush', authorize('admin'), aiController.predictOPDRush);

/**
 * @route   POST /api/ai/predict/bed-occupancy
 * @desc    Predict bed occupancy
 */
router.post('/predict/bed-occupancy', authorize('admin'), aiController.predictBedOccupancy);

/**
 * @route   POST /api/ai/predict/lab-workload
 * @desc    Predict lab workload
 */
router.post('/predict/lab-workload', authorize('admin', 'lab_tech'), aiController.predictLabWorkload);

/**
 * @route   GET /api/ai/predictions
 * @desc    Get all predictions
 */
router.get('/predictions', authorize('admin'), aiController.getAllPredictions);

/**
 * @route   GET /api/ai/predictions/:type
 * @desc    Get predictions by type
 */
router.get('/predictions/:type', authorize('admin'), aiController.getPredictionsByType);

module.exports = router;
