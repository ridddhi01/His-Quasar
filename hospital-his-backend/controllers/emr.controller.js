const EMR = require('../models/EMR');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create a new EMR record
 * @route   POST /api/emr
 */
exports.createEMR = asyncHandler(async (req, res, next) => {
    req.body.doctor = req.user.id;

    const emr = await EMR.create(req.body);
    await emr.populate(['patient', 'doctor']);

    res.status(201).json({
        success: true,
        data: emr,
    });
});

/**
 * @desc    Get all EMR records for a patient
 * @route   GET /api/emr/:patientId
 */
exports.getPatientEMRs = asyncHandler(async (req, res, next) => {
    const emrs = await EMR.find({ patient: req.params.patientId })
        .populate('doctor', 'profile.firstName profile.lastName')
        .sort({ date: -1 });

    res.status(200).json({
        success: true,
        count: emrs.length,
        data: emrs,
    });
});

/**
 * @desc    Get EMR by visit ID
 * @route   GET /api/emr/visit/:visitId
 */
exports.getEMRByVisit = asyncHandler(async (req, res, next) => {
    const emr = await EMR.findOne({ visit: req.params.visitId })
        .populate('patient')
        .populate('doctor', 'profile');

    if (!emr) {
        return next(new ErrorResponse('EMR not found for this visit', 404));
    }

    res.status(200).json({
        success: true,
        data: emr,
    });
});

/**
 * @desc    Update EMR record
 * @route   PUT /api/emr/:id
 */
exports.updateEMR = asyncHandler(async (req, res, next) => {
    const emr = await EMR.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    }).populate(['patient', 'doctor']);

    if (!emr) {
        return next(new ErrorResponse('EMR not found', 404));
    }

    res.status(200).json({
        success: true,
        data: emr,
    });
});

/**
 * @desc    Add vitals to EMR
 * @route   POST /api/emr/:id/vitals
 */
exports.addVitals = asyncHandler(async (req, res, next) => {
    const emr = await EMR.findById(req.params.id);

    if (!emr) {
        return next(new ErrorResponse('EMR not found', 404));
    }

    emr.vitals = { ...emr.vitals, ...req.body };
    await emr.save();

    res.status(200).json({
        success: true,
        data: emr,
    });
});

/**
 * @desc    Get patient timeline
 * @route   GET /api/emr/:id/timeline
 */
exports.getPatientTimeline = asyncHandler(async (req, res, next) => {
    const emr = await EMR.findById(req.params.id);

    if (!emr) {
        return next(new ErrorResponse('EMR not found', 404));
    }

    // Get all EMRs for this patient
    const timeline = await EMR.find({ patient: emr.patient })
        .populate('doctor', 'profile.firstName profile.lastName')
        .sort({ date: -1 });

    res.status(200).json({
        success: true,
        count: timeline.length,
        data: timeline,
    });
});
