/**
 * Admin Break-Glass Routes
 * Admin oversight for emergency access management
 * 
 * All routes require: authenticate + authorize('admin')
 * All actions are audit logged
 */

const express = require('express');
const router = express.Router();
const breakGlassController = require('../controllers/breakGlass.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, auditAdminAction } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// MONITORING ROUTES (Must be before /:id routes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/break-glass/pending
 * @desc    Get pending break-glass requests
 */
router.get('/pending', breakGlassController.getPendingRequests);

/**
 * @route   GET /api/admin/break-glass/active
 * @desc    Get active break-glass sessions
 */
router.get('/active', breakGlassController.getActiveSessions);

/**
 * @route   GET /api/admin/break-glass/pending-review
 * @desc    Get sessions pending post-use review
 */
router.get('/pending-review', breakGlassController.getPendingReviews);

/**
 * @route   GET /api/admin/break-glass/flagged
 * @desc    Get flagged sessions for investigation
 */
router.get('/flagged', breakGlassController.getFlaggedSessions);

/**
 * @route   GET /api/admin/break-glass/statistics
 * @desc    Get break-glass statistics
 */
router.get('/statistics', breakGlassController.getStatistics);

// ═══════════════════════════════════════════════════════════════════════════════
// GRANT/REVOKE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/break-glass/grant
 * @desc    Admin grants break-glass access directly
 */
router.post(
    '/grant',
    auditAdminAction('BREAK_GLASS_ADMIN_GRANT', 'BreakGlassLog'),
    breakGlassController.adminGrant
);

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL LOG ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/break-glass/:id
 * @desc    Get break-glass log details
 */
router.get('/:id', breakGlassController.getLogDetails);

/**
 * @route   POST /api/admin/break-glass/:id/approve
 * @desc    Approve pending request
 */
router.post(
    '/:id/approve',
    auditAdminAction('BREAK_GLASS_APPROVE', 'BreakGlassLog'),
    breakGlassController.approveRequest
);

/**
 * @route   POST /api/admin/break-glass/:id/reject
 * @desc    Reject pending request
 */
router.post(
    '/:id/reject',
    auditAdminAction('BREAK_GLASS_REJECT', 'BreakGlassLog'),
    breakGlassController.rejectRequest
);

/**
 * @route   POST /api/admin/break-glass/:id/revoke
 * @desc    Revoke active access
 */
router.post(
    '/:id/revoke',
    auditAdminAction('BREAK_GLASS_REVOKE', 'BreakGlassLog'),
    breakGlassController.revokeAccess
);

/**
 * @route   POST /api/admin/break-glass/:id/review
 * @desc    Review completed session (MANDATORY post-use)
 */
router.post(
    '/:id/review',
    auditAdminAction('BREAK_GLASS_REVIEW', 'BreakGlassLog'),
    breakGlassController.reviewSession
);

/**
 * @route   POST /api/admin/break-glass/:id/flag
 * @desc    Flag session for investigation
 */
router.post(
    '/:id/flag',
    auditAdminAction('BREAK_GLASS_FLAG', 'BreakGlassLog'),
    breakGlassController.flagSession
);

module.exports = router;
