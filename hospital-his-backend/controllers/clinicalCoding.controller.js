/**
 * Clinical Coding Controller
 * Handles API requests for clinical coding operations with status-driven workflow
 */

const ClinicalCodingRecord = require('../models/ClinicalCodingRecord');
const ProcedureCode = require('../models/ProcedureCode');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const clinicalCodingService = require('../services/clinicalCoding.service');
const { CLINICAL_CODING_STATUS } = require('../config/constants');

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE CODES (Master Data)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all procedure codes
 * @route   GET /api/v1/clinical-coding/procedure-codes
 */
exports.getAllProcedureCodes = asyncHandler(async (req, res, next) => {
    const { search, codeType, category, isActive, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
        query.$or = [
            { code: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { shortDescription: { $regex: search, $options: 'i' } },
        ];
    }
    if (codeType) query.codeType = codeType;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [codes, total] = await Promise.all([
        ProcedureCode.find(query)
            .sort({ code: 1 })
            .skip(skip)
            .limit(parseInt(limit)),
        ProcedureCode.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        count: codes.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: codes,
    });
});

/**
 * @desc    Get single procedure code
 * @route   GET /api/v1/clinical-coding/procedure-codes/:id
 */
exports.getProcedureCodeById = asyncHandler(async (req, res, next) => {
    const code = await ProcedureCode.findById(req.params.id);

    if (!code) {
        return next(new ErrorResponse('Procedure code not found', 404));
    }

    res.status(200).json({
        success: true,
        data: code,
    });
});

/**
 * @desc    Create new procedure code
 * @route   POST /api/v1/clinical-coding/procedure-codes
 */
exports.createProcedureCode = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user.id;

    const code = await ProcedureCode.create(req.body);

    res.status(201).json({
        success: true,
        data: code,
    });
});

/**
 * @desc    Update procedure code
 * @route   PUT /api/v1/clinical-coding/procedure-codes/:id
 */
exports.updateProcedureCode = asyncHandler(async (req, res, next) => {
    req.body.updatedBy = req.user.id;

    const code = await ProcedureCode.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!code) {
        return next(new ErrorResponse('Procedure code not found', 404));
    }

    res.status(200).json({
        success: true,
        data: code,
    });
});

/**
 * @desc    Delete (deactivate) procedure code
 * @route   DELETE /api/v1/clinical-coding/procedure-codes/:id
 */
exports.deleteProcedureCode = asyncHandler(async (req, res, next) => {
    const code = await ProcedureCode.findById(req.params.id);

    if (!code) {
        return next(new ErrorResponse('Procedure code not found', 404));
    }

    // Soft delete
    code.isActive = false;
    code.updatedBy = req.user.id;
    await code.save();

    res.status(200).json({
        success: true,
        message: 'Procedure code deactivated',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL CODING RECORDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all coding records
 * @route   GET /api/v1/clinical-coding/records
 */
exports.getCodingRecords = asyncHandler(async (req, res, next) => {
    const { status, encounterType, patient, startDate, endDate, page, limit } = req.query;

    const result = await clinicalCodingService.getCodingRecords(
        { status, encounterType, patient, startDate, endDate },
        { page, limit }
    );

    res.status(200).json({
        success: true,
        count: result.records.length,
        total: result.total,
        page: result.page,
        pages: result.pages,
        data: result.records,
    });
});

/**
 * @desc    Get records pending review (for review panel)
 * @route   GET /api/v1/clinical-coding/pending-review
 */
exports.getPendingReview = asyncHandler(async (req, res, next) => {
    const { page, limit } = req.query;

    const result = await clinicalCodingService.getPendingReview({ page, limit });

    res.status(200).json({
        success: true,
        count: result.records.length,
        total: result.total,
        page: result.page,
        pages: result.pages,
        data: result.records,
    });
});

/**
 * @desc    Get coding record by ID
 * @route   GET /api/v1/clinical-coding/records/:id
 */
exports.getCodingRecordById = asyncHandler(async (req, res, next) => {
    const record = await ClinicalCodingRecord.findById(req.params.id)
        .populate('patient', 'patientId firstName lastName phone')
        .populate('encounter')
        .populate('finalizingDoctor', 'profile')
        .populate('codedBy', 'profile')
        .populate('submittedBy', 'profile')
        .populate('approvedBy', 'profile')
        .populate('reviewedBy', 'profile')
        .populate('assignedCodes.code')
        .populate('assignedCodes.addedBy', 'profile')
        .populate('returnHistory.returnedBy', 'profile')
        .populate('linkedBill', 'billNumber grandTotal paymentStatus');

    if (!record) {
        return next(new ErrorResponse('Coding record not found', 404));
    }

    // Include allowed transitions for the current status
    const allowedTransitions = clinicalCodingService.getAllowedTransitions(record.status);

    res.status(200).json({
        success: true,
        data: record,
        allowedTransitions,
    });
});

/**
 * @desc    Get coding record by encounter
 * @route   GET /api/v1/clinical-coding/encounter/:encounterId
 */
exports.getCodingByEncounter = asyncHandler(async (req, res, next) => {
    const { encounterId } = req.params;
    const { encounterModel } = req.query;

    if (!encounterModel) {
        return next(new ErrorResponse('encounterModel query param is required', 400));
    }

    const record = await clinicalCodingService.getCodingByEncounter(encounterId, encounterModel);

    if (!record) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No coding record found for this encounter',
        });
    }

    // Include allowed transitions
    const allowedTransitions = clinicalCodingService.getAllowedTransitions(record.status);

    res.status(200).json({
        success: true,
        data: record,
        allowedTransitions,
    });
});

/**
 * @desc    Update coding record (notes, diagnosis codes)
 * @route   PUT /api/v1/clinical-coding/records/:id
 */
exports.updateCodingRecord = asyncHandler(async (req, res, next) => {
    const record = await ClinicalCodingRecord.findById(req.params.id);

    if (!record) {
        return next(new ErrorResponse('Coding record not found', 404));
    }

    // Check if record is in editable state
    const editableStatuses = [
        CLINICAL_CODING_STATUS.AWAITING_CODING,
        CLINICAL_CODING_STATUS.IN_PROGRESS,
        CLINICAL_CODING_STATUS.RETURNED,
    ];
    if (!editableStatuses.includes(record.status)) {
        return next(new ErrorResponse(`Cannot modify record in ${record.status} status`, 400));
    }

    const { coderNotes, diagnosisCodes } = req.body;

    // Update basic fields
    if (coderNotes !== undefined) record.coderNotes = coderNotes;
    if (diagnosisCodes) record.diagnosisCodes = diagnosisCodes;

    await record.save();

    // Re-fetch with populated fields
    const updatedRecord = await ClinicalCodingRecord.findById(req.params.id)
        .populate('patient', 'patientId firstName lastName')
        .populate('assignedCodes.code');

    res.status(200).json({
        success: true,
        data: updatedRecord,
    });
});

/**
 * @desc    Add procedure codes to record
 * @route   POST /api/v1/clinical-coding/records/:id/codes
 */
exports.addCodesToRecord = asyncHandler(async (req, res, next) => {
    const { codes } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
        return next(new ErrorResponse('Please provide codes array', 400));
    }

    try {
        const record = await clinicalCodingService.addProcedureCodes(
            req.params.id,
            codes,
            req.user.id
        );

        // Re-fetch with populated fields
        const updatedRecord = await ClinicalCodingRecord.findById(req.params.id)
            .populate('assignedCodes.code')
            .populate('assignedCodes.addedBy', 'profile');

        res.status(200).json({
            success: true,
            message: `${codes.length} code(s) added`,
            data: updatedRecord,
        });
    } catch (err) {
        return next(new ErrorResponse(err.message, 400));
    }
});

/**
 * @desc    Remove procedure code from record
 * @route   DELETE /api/v1/clinical-coding/records/:id/codes/:codeId
 */
exports.removeCodeFromRecord = asyncHandler(async (req, res, next) => {
    const { id, codeId } = req.params;

    try {
        const record = await clinicalCodingService.removeProcedureCode(id, codeId, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Code removed',
            data: record,
        });
    } catch (err) {
        return next(new ErrorResponse(err.message, 400));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Start coding (move from awaiting-coding to in-progress)
 * @route   POST /api/v1/clinical-coding/records/:id/start
 */
exports.startCoding = asyncHandler(async (req, res, next) => {
    try {
        const record = await clinicalCodingService.startCoding(req.params.id, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Coding started',
            data: record,
        });
    } catch (err) {
        return next(new ErrorResponse(err.message, 400));
    }
});

/**
 * @desc    Submit coding for review (move from in-progress/returned to pending-review)
 * @route   POST /api/v1/clinical-coding/records/:id/submit
 */
exports.submitForReview = asyncHandler(async (req, res, next) => {
    try {
        const record = await clinicalCodingService.submitForReview(req.params.id, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Coding submitted for review',
            data: record,
        });
    } catch (err) {
        return next(new ErrorResponse(err.message, 400));
    }
});

/**
 * @desc    Approve coding (move from pending-review to approved)
 * @route   POST /api/v1/clinical-coding/records/:id/approve
 */
exports.approveCoding = asyncHandler(async (req, res, next) => {
    try {
        const record = await clinicalCodingService.approveCoding(req.params.id, req.user.id);

        res.status(200).json({
            success: true,
            message: 'Coding approved for billing',
            data: record,
        });
    } catch (err) {
        return next(new ErrorResponse(err.message, 400));
    }
});

/**
 * @desc    Return coding for correction (move from pending-review to returned)
 * @route   POST /api/v1/clinical-coding/records/:id/return
 */
exports.returnForCorrection = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
        return next(new ErrorResponse('Return reason is required', 400));
    }

    try {
        const record = await clinicalCodingService.returnForCorrection(
            req.params.id,
            req.user.id,
            reason
        );

        res.status(200).json({
            success: true,
            message: 'Coding returned for correction',
            data: record,
        });
    } catch (err) {
        return next(new ErrorResponse(err.message, 400));
    }
});

/**
 * @desc    Get coding record audit trail
 * @route   GET /api/v1/clinical-coding/records/:id/audit
 */
exports.getRecordAudit = asyncHandler(async (req, res, next) => {
    const record = await ClinicalCodingRecord.findById(req.params.id)
        .select('codingNumber status auditTrail returnHistory')
        .populate('auditTrail.performedBy', 'profile.firstName profile.lastName')
        .populate('returnHistory.returnedBy', 'profile.firstName profile.lastName');

    if (!record) {
        return next(new ErrorResponse('Coding record not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            codingNumber: record.codingNumber,
            status: record.status,
            auditTrail: record.auditTrail,
            returnHistory: record.returnHistory,
        },
    });
});

/**
 * @desc    Get coding dashboard stats
 * @route   GET /api/v1/clinical-coding/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        awaitingCoding,
        inProgress,
        pendingReview,
        approved,
        returned,
        todayRecords,
    ] = await Promise.all([
        ClinicalCodingRecord.countDocuments({ status: CLINICAL_CODING_STATUS.AWAITING_CODING }),
        ClinicalCodingRecord.countDocuments({ status: CLINICAL_CODING_STATUS.IN_PROGRESS }),
        ClinicalCodingRecord.countDocuments({ status: CLINICAL_CODING_STATUS.PENDING_REVIEW }),
        ClinicalCodingRecord.countDocuments({ status: CLINICAL_CODING_STATUS.APPROVED }),
        ClinicalCodingRecord.countDocuments({ status: CLINICAL_CODING_STATUS.RETURNED }),
        ClinicalCodingRecord.countDocuments({ createdAt: { $gte: today } }),
    ]);

    // Get recent awaiting coding records
    const recentAwaiting = await ClinicalCodingRecord.find({
        status: CLINICAL_CODING_STATUS.AWAITING_CODING
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('finalizingDoctor', 'profile')
        .sort({ createdAt: -1 })
        .limit(10);

    // Get records pending review (for senior coder)
    const recentPendingReview = await ClinicalCodingRecord.find({
        status: CLINICAL_CODING_STATUS.PENDING_REVIEW
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('codedBy', 'profile')
        .populate('submittedBy', 'profile')
        .sort({ submittedAt: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        data: {
            stats: {
                awaitingCoding,
                inProgress,
                pendingReview,
                approved,
                returned,
                todayRecords,
            },
            recentAwaiting,
            recentPendingReview,
        },
    });
});

/**
 * @desc    Get status transition info for a record
 * @route   GET /api/v1/clinical-coding/records/:id/transitions
 */
exports.getTransitions = asyncHandler(async (req, res, next) => {
    const record = await ClinicalCodingRecord.findById(req.params.id).select('status');

    if (!record) {
        return next(new ErrorResponse('Coding record not found', 404));
    }

    const allowedTransitions = clinicalCodingService.getAllowedTransitions(record.status);
    const allStatuses = Object.values(CLINICAL_CODING_STATUS);

    // Build transition info with reasons for blocked transitions
    const transitionInfo = allStatuses.map(status => ({
        status,
        allowed: allowedTransitions.includes(status),
        reason: !allowedTransitions.includes(status)
            ? clinicalCodingService.getTransitionBlockedReason(record.status, status)
            : null,
    }));

    res.status(200).json({
        success: true,
        data: {
            currentStatus: record.status,
            allowedTransitions,
            transitionInfo,
        },
    });
});
