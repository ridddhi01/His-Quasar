const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   GET /api/analytics/executive-dashboard
 * @desc    Get executive dashboard data
 */
router.get('/executive-dashboard', authorize('admin'), analyticsController.getExecutiveDashboard);

/**
 * @route   GET /api/analytics/clinical
 * @desc    Get clinical analytics
 */
router.get('/clinical', authorize('doctor', 'nurse', 'head_nurse', 'admin'), analyticsController.getClinicalAnalytics);

/**
 * @route   GET /api/analytics/financial
 * @desc    Get financial analytics
 */
router.get('/financial', authorize('billing', 'admin'), analyticsController.getFinancialAnalytics);

/**
 * @route   GET /api/analytics/operational
 * @desc    Get operational analytics
 */
router.get('/operational', authorize('admin'), analyticsController.getOperationalAnalytics);

/**
 * @route   GET /api/analytics/reports
 * @desc    Get available reports
 */
router.get('/reports', authorize('admin'), analyticsController.getReports);

/**
 * @route   POST /api/analytics/custom-report
 * @desc    Generate custom report
 */
router.post('/custom-report', authorize('admin'), analyticsController.generateCustomReport);

/**
 * @route   GET /api/analytics/reports/:id/download
 * @desc    Download report
 */
router.get('/reports/:id/download', authorize('admin'), analyticsController.downloadReport);

module.exports = router;
