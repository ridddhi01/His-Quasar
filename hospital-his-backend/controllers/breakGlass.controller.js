/**
 * Break-Glass Controller
 * Handles emergency access requests and admin oversight
 * 
 * Two flows:
 * 1. Clinical user self-request -> Admin approval -> Active -> Review
 * 2. Admin proactive grant -> Active -> Review
 */

const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const breakGlassService = require('../services/breakGlass.service');

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL USER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Request break-glass access (pending admin approval)
 * @route   POST /api/break-glass/request
 * @access  Clinical roles only
 */
exports.requestBreakGlass = asyncHandler(async (req, res, next) => {
    try {
        const log = await breakGlassService.requestBreakGlass(
            req.user._id,
            req.body,
            req.ip,
            req.headers['user-agent']
        );

        res.status(201).json({
            success: true,
            message: 'Break-glass request submitted. Pending admin approval.',
            data: {
                logCode: log.logCode,
                status: log.status,
                expiresAt: log.expiresAt,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Self-activate break-glass (immediate, for emergencies)
 * @route   POST /api/break-glass/activate
 * @access  Clinical roles only
 * @note    Activates immediately but requires post-use review
 */
exports.selfActivate = asyncHandler(async (req, res, next) => {
    try {
        const log = await breakGlassService.selfActivate(
            req.user._id,
            req.body,
            req.ip,
            req.headers['user-agent']
        );

        res.status(201).json({
            success: true,
            message: 'Break-glass access ACTIVATED. All actions will be logged.',
            warning: 'This session will be reviewed by Admin after expiry.',
            data: {
                logCode: log.logCode,
                accessLevel: log.accessLevel,
                expiresAt: log.expiresAt,
                status: log.status,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Check current break-glass status
 * @route   GET /api/break-glass/status
 * @access  Authenticated
 */
exports.checkStatus = asyncHandler(async (req, res, next) => {
    const status = await breakGlassService.hasActiveAccess(req.user._id);

    res.status(200).json({
        success: true,
        data: status,
    });
});

/**
 * @desc    Get my break-glass history
 * @route   GET /api/break-glass/history
 * @access  Authenticated
 */
exports.getMyHistory = asyncHandler(async (req, res, next) => {
    const history = await breakGlassService.getUserHistory(req.user._id);

    res.status(200).json({
        success: true,
        count: history.length,
        data: history,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get pending break-glass requests
 * @route   GET /api/admin/break-glass/pending
 * @access  Admin only
 */
exports.getPendingRequests = asyncHandler(async (req, res, next) => {
    const BreakGlassLog = require('../models/BreakGlassLog');
    const pending = await BreakGlassLog.find({ status: 'pending_approval' })
        .populate('requestedBy', 'username profile.firstName profile.lastName role department')
        .sort({ requestedAt: -1 });

    res.status(200).json({
        success: true,
        count: pending.length,
        data: pending,
    });
});

/**
 * @desc    Approve break-glass request
 * @route   POST /api/admin/break-glass/:id/approve
 * @access  Admin only
 */
exports.approveRequest = asyncHandler(async (req, res, next) => {
    try {
        const log = await breakGlassService.approveRequest(
            req.params.id,
            req.user._id,
            req.body.notes
        );

        res.status(200).json({
            success: true,
            message: 'Break-glass request approved and activated',
            data: {
                logCode: log.logCode,
                accessLevel: log.accessLevel,
                expiresAt: log.expiresAt,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Reject break-glass request
 * @route   POST /api/admin/break-glass/:id/reject
 * @access  Admin only
 */
exports.rejectRequest = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Rejection reason is required', 400));
    }

    try {
        const log = await breakGlassService.rejectRequest(
            req.params.id,
            req.user._id,
            reason
        );

        res.status(200).json({
            success: true,
            message: 'Break-glass request rejected',
            data: { logCode: log.logCode },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Admin grants break-glass access directly
 * @route   POST /api/admin/break-glass/grant
 * @access  Admin only
 */
exports.adminGrant = asyncHandler(async (req, res, next) => {
    const { userId, accessLevel, reason, emergencyType, durationHours } = req.body;

    if (!userId) {
        return next(new ErrorResponse('Target user ID is required', 400));
    }
    if (!reason) {
        return next(new ErrorResponse('Reason is required', 400));
    }

    try {
        const log = await breakGlassService.adminGrant(
            userId,
            req.user._id,
            { accessLevel, reason, emergencyType, durationHours }
        );

        res.status(201).json({
            success: true,
            message: 'Break-glass access granted',
            data: {
                logCode: log.logCode,
                accessLevel: log.accessLevel,
                expiresAt: log.expiresAt,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Revoke active break-glass access
 * @route   POST /api/admin/break-glass/:id/revoke
 * @access  Admin only
 */
exports.revokeAccess = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Revocation reason is required', 400));
    }

    try {
        const log = await breakGlassService.revokeAccess(
            req.params.id,
            req.user._id,
            reason
        );

        res.status(200).json({
            success: true,
            message: 'Break-glass access revoked',
            data: { logCode: log.logCode },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Get active break-glass sessions
 * @route   GET /api/admin/break-glass/active
 * @access  Admin only
 */
exports.getActiveSessions = asyncHandler(async (req, res, next) => {
    const active = await breakGlassService.getActiveSessions();

    res.status(200).json({
        success: true,
        count: active.length,
        data: active,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST-USE REVIEW ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get sessions pending review
 * @route   GET /api/admin/break-glass/pending-review
 * @access  Admin only
 */
exports.getPendingReviews = asyncHandler(async (req, res, next) => {
    const pending = await breakGlassService.getPendingReviews();

    res.status(200).json({
        success: true,
        count: pending.length,
        data: pending,
    });
});

/**
 * @desc    Get break-glass log details
 * @route   GET /api/admin/break-glass/:id
 * @access  Admin only
 */
exports.getLogDetails = asyncHandler(async (req, res, next) => {
    const BreakGlassLog = require('../models/BreakGlassLog');
    const log = await BreakGlassLog.findById(req.params.id)
        .populate('requestedBy', 'username profile.firstName profile.lastName role department')
        .populate('approvedBy', 'username profile.firstName profile.lastName')
        .populate('revokedBy', 'username profile.firstName profile.lastName')
        .populate('review.reviewedBy', 'username profile.firstName profile.lastName')
        .populate('accessedRecords.patient', 'mrn profile.firstName profile.lastName');

    if (!log) {
        return next(new ErrorResponse('Break-glass log not found', 404));
    }

    res.status(200).json({
        success: true,
        data: log,
    });
});

/**
 * @desc    Review completed break-glass session
 * @route   POST /api/admin/break-glass/:id/review
 * @access  Admin only
 */
exports.reviewSession = asyncHandler(async (req, res, next) => {
    const { outcome, notes, followUpRequired, followUpActions } = req.body;

    if (!outcome) {
        return next(new ErrorResponse('Review outcome is required', 400));
    }

    try {
        const log = await breakGlassService.reviewSession(
            req.params.id,
            req.user._id,
            { outcome, notes, followUpRequired, followUpActions }
        );

        res.status(200).json({
            success: true,
            message: `Session reviewed: ${outcome}`,
            data: {
                logCode: log.logCode,
                outcome,
                status: log.status,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Flag session for investigation
 * @route   POST /api/admin/break-glass/:id/flag
 * @access  Admin only
 */
exports.flagSession = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Flag reason is required', 400));
    }

    try {
        const log = await breakGlassService.flagForInvestigation(
            req.params.id,
            req.user._id,
            reason
        );

        res.status(200).json({
            success: true,
            message: 'Session flagged for investigation',
            data: { logCode: log.logCode },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Get flagged sessions
 * @route   GET /api/admin/break-glass/flagged
 * @access  Admin only
 */
exports.getFlaggedSessions = asyncHandler(async (req, res, next) => {
    const BreakGlassLog = require('../models/BreakGlassLog');
    const flagged = await BreakGlassLog.getFlagged();

    res.status(200).json({
        success: true,
        count: flagged.length,
        data: flagged,
    });
});

/**
 * @desc    Get break-glass statistics
 * @route   GET /api/admin/break-glass/statistics
 * @access  Admin only
 */
exports.getStatistics = asyncHandler(async (req, res, next) => {
    const { dateFrom, dateTo } = req.query;
    const stats = await breakGlassService.getStatistics(dateFrom, dateTo);

    res.status(200).json({
        success: true,
        data: stats,
    });
});

module.exports = exports;
