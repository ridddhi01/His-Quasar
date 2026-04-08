const Insurance = require('../models/Insurance');
const InsuranceProvider = require('../models/InsuranceProvider');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create insurance claim
 * @route   POST /api/insurance/claims
 */
exports.createClaim = asyncHandler(async (req, res, next) => {
    const claim = await Insurance.create(req.body);
    await claim.populate(['patient', 'provider']);

    res.status(201).json({
        success: true,
        data: claim,
    });
});

/**
 * @desc    Get all claims
 * @route   GET /api/insurance/claims
 */
exports.getAllClaims = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const claims = await Insurance.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('provider', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ submittedDate: -1 });

    const total = await Insurance.countDocuments(query);

    res.status(200).json({
        success: true,
        count: claims.length,
        total,
        page: parseInt(page),
        data: claims,
    });
});

/**
 * @desc    Get claim by ID
 * @route   GET /api/insurance/claims/:id
 */
exports.getClaimById = asyncHandler(async (req, res, next) => {
    const claim = await Insurance.findById(req.params.id)
        .populate('patient')
        .populate('provider')
        .populate('admission')
        .populate('handledBy', 'profile');

    if (!claim) {
        return next(new ErrorResponse('Claim not found', 404));
    }

    res.status(200).json({
        success: true,
        data: claim,
    });
});

/**
 * @desc    Update claim
 * @route   PUT /api/insurance/claims/:id
 */
exports.updateClaim = asyncHandler(async (req, res, next) => {
    req.body.handledBy = req.user.id;

    const claim = await Insurance.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!claim) {
        return next(new ErrorResponse('Claim not found', 404));
    }

    res.status(200).json({
        success: true,
        data: claim,
    });
});

/**
 * @desc    Request pre-authorization
 * @route   POST /api/insurance/pre-authorization
 */
exports.requestPreAuth = asyncHandler(async (req, res, next) => {
    const claim = await Insurance.create({
        ...req.body,
        status: 'pending',
    });

    res.status(201).json({
        success: true,
        message: 'Pre-authorization request submitted',
        data: claim,
    });
});

/**
 * @desc    Get insurance providers
 * @route   GET /api/insurance/providers
 */
exports.getProviders = asyncHandler(async (req, res, next) => {
    const providers = await InsuranceProvider.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: providers.length,
        data: providers,
    });
});

/**
 * @desc    Add insurance provider
 * @route   POST /api/insurance/providers
 */
exports.addProvider = asyncHandler(async (req, res, next) => {
    const provider = await InsuranceProvider.create(req.body);

    res.status(201).json({
        success: true,
        data: provider,
    });
});

/**
 * @desc    Submit claim with ICD validation
 * @route   POST /api/insurance/claims/:id/submit
 */
const insuranceService = require('../services/insurance.service');

exports.submitClaim = asyncHandler(async (req, res, next) => {
    const claim = await insuranceService.submitClaimWithICD(req.params.id, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Claim submitted successfully',
        data: claim,
    });
});

/**
 * @desc    Update pre-authorization status
 * @route   PUT /api/insurance/claims/:id/pre-auth
 */
exports.updatePreAuthStatus = asyncHandler(async (req, res, next) => {
    const { status, amount, remarks } = req.body;

    const claim = await insuranceService.updatePreAuthStatus(
        req.params.id,
        status,
        amount,
        remarks,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Pre-authorization status updated',
        data: claim,
    });
});

/**
 * @desc    Approve claim
 * @route   POST /api/insurance/claims/:id/approve
 */
exports.approveClaim = asyncHandler(async (req, res, next) => {
    const { approvedAmount, remarks } = req.body;

    const claim = await insuranceService.approveClaim(
        req.params.id,
        approvedAmount,
        req.user.id,
        remarks
    );

    res.status(200).json({
        success: true,
        message: 'Claim approved',
        data: claim,
    });
});

/**
 * @desc    Reject claim
 * @route   POST /api/insurance/claims/:id/reject
 */
exports.rejectClaim = asyncHandler(async (req, res, next) => {
    const { rejectionReason } = req.body;

    const claim = await insuranceService.rejectClaim(
        req.params.id,
        rejectionReason,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Claim rejected',
        data: claim,
    });
});

/**
 * @desc    Settle claim
 * @route   POST /api/insurance/claims/:id/settle
 */
exports.settleClaim = asyncHandler(async (req, res, next) => {
    const { settlementAmount, settlementReference, remarks } = req.body;

    const claim = await insuranceService.settleClaim(
        req.params.id,
        settlementAmount,
        settlementReference,
        remarks,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Claim settled successfully',
        data: claim,
    });
});

/**
 * @desc    Get claim timeline
 * @route   GET /api/insurance/claims/:id/timeline
 */
exports.getClaimTimeline = asyncHandler(async (req, res, next) => {
    const timeline = await insuranceService.getClaimTimeline(req.params.id);

    res.status(200).json({
        success: true,
        data: timeline,
    });
});

/**
 * @desc    Get TPA providers  
 * @route   GET /api/insurance/tpa-providers
 */
const TPAProvider = require('../models/TPAProvider');

exports.getTPAProviders = asyncHandler(async (req, res, next) => {
    const providers = await TPAProvider.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: providers.length,
        data: providers,
    });
});

/**
 * @desc    Add TPA provider
 * @route   POST /api/insurance/tpa-providers
 */
exports.addTPAProvider = asyncHandler(async (req, res, next) => {
    const provider = await TPAProvider.create(req.body);

    res.status(201).json({
        success: true,
        data: provider,
    });
});
