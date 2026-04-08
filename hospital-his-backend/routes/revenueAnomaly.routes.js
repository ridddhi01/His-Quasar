/**
 * Revenue Anomaly Routes
 * Admin-only routes for AI-detected revenue anomaly management
 * 
 * Key Principle: Admin can REVIEW, ASSIGN, RESOLVE - but NOT EDIT billing
 * All actions are fully audited
 */

const express = require('express');
const router = express.Router();
const revenueAnomalyController = require('../controllers/revenueAnomaly.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, auditAdminAction } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY & DASHBOARD (Must be before /:id routes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/revenue-anomalies/scan
 * @desc    Trigger AI Scan
 */
router.post('/scan', revenueAnomalyController.runScan);

/**
 * @route   GET /api/admin/revenue-anomalies/summary
 * @desc    Get dashboard summary of anomalies
 */
router.get('/summary', revenueAnomalyController.getDashboardSummary);

// ═══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS (Must be before /:id routes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/revenue-anomalies/bulk/assign
 * @desc    Bulk assign anomalies
 */
router.post(
    '/bulk/assign',
    auditAdminAction('ANOMALY_BULK_ASSIGN', 'RevenueAnomaly'),
    revenueAnomalyController.bulkAssign
);

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/revenue-anomalies
 * @desc    Get all anomalies with filtering
 */
router.get('/', revenueAnomalyController.getAnomalies);

/**
 * @route   GET /api/admin/revenue-anomalies/:id
 * @desc    Get anomaly by ID
 */
router.get('/:id', revenueAnomalyController.getAnomalyById);

/**
 * @route   GET /api/admin/revenue-anomalies/:id/investigate
 * @desc    Get investigation details (read-only, no patient data)
 */
router.get('/:id/investigate', revenueAnomalyController.getInvestigationDetails);

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/revenue-anomalies/:id/review
 * @desc    Start review of anomaly (new -> under_review)
 */
router.post(
    '/:id/review',
    auditAdminAction('ANOMALY_REVIEW_START', 'RevenueAnomaly'),
    revenueAnomalyController.startReview
);

/**
 * @route   POST /api/admin/revenue-anomalies/:id/assign
 * @desc    Assign anomaly for investigation
 */
router.post(
    '/:id/assign',
    auditAdminAction('ANOMALY_ASSIGN', 'RevenueAnomaly'),
    revenueAnomalyController.assignAnomaly
);

/**
 * @route   POST /api/admin/revenue-anomalies/:id/false-positive
 * @desc    Mark anomaly as false positive
 */
router.post(
    '/:id/false-positive',
    auditAdminAction('ANOMALY_FALSE_POSITIVE', 'RevenueAnomaly'),
    revenueAnomalyController.markFalsePositive
);

/**
 * @route   POST /api/admin/revenue-anomalies/:id/send-for-action
 * @desc    Send to billing team for action
 * @note    Admin flags issue; Billing team corrects
 */
router.post(
    '/:id/send-for-action',
    auditAdminAction('ANOMALY_SEND_FOR_ACTION', 'RevenueAnomaly'),
    revenueAnomalyController.sendForAction
);

/**
 * @route   POST /api/admin/revenue-anomalies/:id/escalate
 * @desc    Escalate anomaly to higher authority
 */
router.post(
    '/:id/escalate',
    auditAdminAction('ANOMALY_ESCALATE', 'RevenueAnomaly'),
    revenueAnomalyController.escalateAnomaly
);

/**
 * @route   POST /api/admin/revenue-anomalies/:id/resolve
 * @desc    Resolve anomaly (after billing team action)
 */
router.post(
    '/:id/resolve',
    auditAdminAction('ANOMALY_RESOLVE', 'RevenueAnomaly'),
    revenueAnomalyController.resolveAnomaly
);

/**
 * @route   POST /api/admin/revenue-anomalies/:id/close
 * @desc    Close anomaly (final state)
 */
router.post(
    '/:id/close',
    auditAdminAction('ANOMALY_CLOSE', 'RevenueAnomaly'),
    revenueAnomalyController.closeAnomaly
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/revenue-anomalies/:id/comments
 * @desc    Add comment to anomaly
 */
router.post(
    '/:id/comments',
    auditAdminAction('ANOMALY_COMMENT', 'RevenueAnomaly'),
    revenueAnomalyController.addComment
);

module.exports = router;
