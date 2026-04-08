/**
 * Revenue Anomaly Controller
 * Admin endpoints for managing AI-detected revenue anomalies
 * 
 * Key Principle: READ and ASSIGN only - NO direct billing edits
 * All actions are fully audited for compliance
 */

const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const revenueAnomalyService = require('../services/revenueAnomaly.service');
const aiDetectionService = require('../services/aiDetection.service');

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Trigger AI Scan
 * @route   POST /api/admin/revenue-anomalies/scan
 * @access  Admin only
 */
exports.runScan = asyncHandler(async (req, res, next) => {
    try {
        const results = await aiDetectionService.runFullScan();

        res.status(200).json({
            success: true,
            message: 'AI Scan completed successfully',
            data: results
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 500));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RETRIEVAL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all anomalies with filtering
 * @route   GET /api/admin/revenue-anomalies
 * @access  Admin only
 */
exports.getAnomalies = asyncHandler(async (req, res, next) => {
    const filters = {
        status: req.query.status,
        category: req.query.category,
        severity: req.query.severity,
        department: req.query.department,
        assignedTo: req.query.assignedTo,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        isOverdue: req.query.isOverdue,
    };

    const pagination = {
        page: req.query.page,
        limit: req.query.limit,
    };

    const result = await revenueAnomalyService.getAnomalies(filters, pagination);

    res.status(200).json({
        success: true,
        count: result.anomalies.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        data: result.anomalies,
    });
});

/**
 * @desc    Get anomaly by ID
 * @route   GET /api/admin/revenue-anomalies/:id
 * @access  Admin only
 */
exports.getAnomalyById = asyncHandler(async (req, res, next) => {
    try {
        const anomaly = await revenueAnomalyService.getAnomalyById(req.params.id);

        res.status(200).json({
            success: true,
            data: anomaly,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 404));
    }
});

/**
 * @desc    Get dashboard summary
 * @route   GET /api/admin/revenue-anomalies/summary
 * @access  Admin only
 */
exports.getDashboardSummary = asyncHandler(async (req, res, next) => {
    const summary = await revenueAnomalyService.getDashboardSummary();

    res.status(200).json({
        success: true,
        data: summary,
    });
});

/**
 * @desc    Get investigation details (read-only)
 * @route   GET /api/admin/revenue-anomalies/:id/investigate
 * @access  Admin only
 * @note    No patient-identifiable data exposed
 */
exports.getInvestigationDetails = asyncHandler(async (req, res, next) => {
    try {
        const details = await revenueAnomalyService.getInvestigationDetails(req.params.id);

        res.status(200).json({
            success: true,
            data: details,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 404));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Start review of anomaly
 * @route   POST /api/admin/revenue-anomalies/:id/review
 * @access  Admin only
 */
exports.startReview = asyncHandler(async (req, res, next) => {
    try {
        const anomaly = await revenueAnomalyService.startReview(req.params.id, req.user._id);

        res.status(200).json({
            success: true,
            message: 'Review started',
            data: anomaly,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Assign anomaly for investigation
 * @route   POST /api/admin/revenue-anomalies/:id/assign
 * @access  Admin only
 */
exports.assignAnomaly = asyncHandler(async (req, res, next) => {
    const { assigneeId, notes } = req.body;

    if (!assigneeId) {
        return next(new ErrorResponse('Assignee ID is required', 400));
    }

    try {
        const anomaly = await revenueAnomalyService.assignAnomaly(
            req.params.id,
            assigneeId,
            req.user._id,
            notes
        );

        res.status(200).json({
            success: true,
            message: 'Anomaly assigned successfully',
            data: anomaly,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Mark anomaly as false positive
 * @route   POST /api/admin/revenue-anomalies/:id/false-positive
 * @access  Admin only
 */
exports.markFalsePositive = asyncHandler(async (req, res, next) => {
    const { reason, justification } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Reason is required', 400));
    }
    if (!justification) {
        return next(new ErrorResponse('Justification is required', 400));
    }

    try {
        const anomaly = await revenueAnomalyService.markFalsePositive(
            req.params.id,
            reason,
            justification,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Marked as false positive',
            data: anomaly,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Send anomaly to billing team for action
 * @route   POST /api/admin/revenue-anomalies/:id/send-for-action
 * @access  Admin only
 * @note    Admin flags the issue; Billing team makes corrections
 */
exports.sendForAction = asyncHandler(async (req, res, next) => {
    const { notes } = req.body;

    try {
        const anomaly = await revenueAnomalyService.sendForAction(
            req.params.id,
            notes,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Sent to billing team for action',
            data: anomaly,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Escalate anomaly
 * @route   POST /api/admin/revenue-anomalies/:id/escalate
 * @access  Admin only
 */
exports.escalateAnomaly = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Escalation reason is required', 400));
    }

    try {
        const anomaly = await revenueAnomalyService.escalateAnomaly(
            req.params.id,
            reason,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Anomaly escalated',
            data: anomaly,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Resolve anomaly
 * @route   POST /api/admin/revenue-anomalies/:id/resolve
 * @access  Admin only
 * @note    Admin confirms resolution after billing team action
 */
exports.resolveAnomaly = asyncHandler(async (req, res, next) => {
    const { type, notes, amountRecovered } = req.body;

    if (!type) {
        return next(new ErrorResponse('Resolution type is required', 400));
    }

    try {
        const anomaly = await revenueAnomalyService.resolveAnomaly(
            req.params.id,
            { type, notes, amountRecovered },
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Anomaly resolved',
            data: {
                anomalyCode: anomaly.anomalyCode,
                resolution: anomaly.resolution,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Close anomaly
 * @route   POST /api/admin/revenue-anomalies/:id/close
 * @access  Admin only
 */
exports.closeAnomaly = asyncHandler(async (req, res, next) => {
    const { notes } = req.body;

    try {
        const anomaly = await revenueAnomalyService.closeAnomaly(
            req.params.id,
            notes,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Anomaly closed',
            data: { anomalyCode: anomaly.anomalyCode, status: anomaly.status },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS & NOTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add comment to anomaly
 * @route   POST /api/admin/revenue-anomalies/:id/comments
 * @access  Admin only
 */
exports.addComment = asyncHandler(async (req, res, next) => {
    const { text, isInternal } = req.body;

    if (!text) {
        return next(new ErrorResponse('Comment text is required', 400));
    }

    try {
        const anomaly = await revenueAnomalyService.addComment(
            req.params.id,
            text,
            req.user._id,
            isInternal !== false  // Default to internal
        );

        res.status(201).json({
            success: true,
            message: 'Comment added',
            data: { comments: anomaly.comments },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Bulk assign anomalies
 * @route   POST /api/admin/revenue-anomalies/bulk/assign
 * @access  Admin only
 */
exports.bulkAssign = asyncHandler(async (req, res, next) => {
    const { anomalyIds, assigneeId } = req.body;

    if (!anomalyIds || !Array.isArray(anomalyIds) || anomalyIds.length === 0) {
        return next(new ErrorResponse('Anomaly IDs array is required', 400));
    }
    if (!assigneeId) {
        return next(new ErrorResponse('Assignee ID is required', 400));
    }

    const results = await revenueAnomalyService.bulkAssign(
        anomalyIds,
        assigneeId,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: `Assigned ${results.success.length} anomalies. ${results.failed.length} failed.`,
        data: results,
    });
});

module.exports = exports;
