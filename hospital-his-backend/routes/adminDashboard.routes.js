/**
 * Admin Dashboard Routes
 * Governance-focused monitoring endpoints
 * 
 * All routes require: authenticate + authorize('admin')
 * 
 * Refresh Strategies:
 * - Real-time: WebSocket preferred, 30s polling fallback
 * - Polling: Specified intervals per endpoint
 */

const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get complete admin dashboard
 */
router.get('/', adminDashboardController.getFullDashboard);

/**
 * @route   GET /api/admin/dashboard/kpis
 * @desc    Get KPI summary cards
 */
router.get('/kpis', adminDashboardController.getKPISummary);

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/dashboard/revenue
 * @desc    Get revenue leakage metrics
 * @refresh 5 minutes
 */
router.get('/revenue', adminDashboardController.getRevenueMetrics);

/**
 * @route   GET /api/admin/dashboard/beds
 * @desc    Get bed occupancy overview
 * @refresh Real-time / 1 minute
 */
router.get('/beds', adminDashboardController.getBedOccupancy);

/**
 * @route   GET /api/admin/dashboard/er
 * @desc    Get ER congestion indicators
 * @refresh Real-time / 30 seconds
 */
router.get('/er', adminDashboardController.getERMetrics);

/**
 * @route   GET /api/admin/dashboard/incidents
 * @desc    Get incident and near-miss counts
 * @refresh 15 minutes
 */
router.get('/incidents', adminDashboardController.getIncidentMetrics);

/**
 * @route   GET /api/admin/dashboard/compliance
 * @desc    Get compliance status
 * @refresh 30 minutes
 */
router.get('/compliance', adminDashboardController.getComplianceStatus);

/**
 * @route   GET /api/admin/dashboard/users
 * @desc    Get user activity metrics
 * @refresh 5 minutes
 */
router.get('/users', adminDashboardController.getUserMetrics);

/**
 * @route   GET /api/admin/dashboard/system
 * @desc    Get system health status
 * @refresh 1 minute
 */
router.get('/system', adminDashboardController.getSystemHealth);

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    Get all active alerts
 * @refresh Real-time / 30 seconds
 */
router.get('/alerts', adminDashboardController.getAlerts);

/**
 * @route   POST /api/admin/dashboard/alerts/:alertType/acknowledge
 * @desc    Acknowledge an alert
 */
router.post('/alerts/:alertType/acknowledge', adminDashboardController.acknowledgeAlert);

module.exports = router;
