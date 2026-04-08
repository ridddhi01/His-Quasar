const Prescription = require('../models/Prescription');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create prescription
 * @route   POST /api/prescriptions
 */
exports.createPrescription = asyncHandler(async (req, res, next) => {
    req.body.doctor = req.user.id;

    const prescription = await Prescription.create(req.body);
    await prescription.populate(['patient', 'doctor', 'medicines.medicine']);

    res.status(201).json({
        success: true,
        data: prescription,
    });
});

/**
 * @desc    Get all prescriptions
 * @route   GET /api/prescriptions
 */
exports.getAllPrescriptions = asyncHandler(async (req, res, next) => {
    const { isDispensed, page = 1, limit = 20 } = req.query;

    const query = {};
    if (isDispensed !== undefined) query.isDispensed = isDispensed === 'true';

    const skip = (page - 1) * limit;

    const prescriptions = await Prescription.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('doctor', 'profile.firstName profile.lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Prescription.countDocuments(query);

    res.status(200).json({
        success: true,
        count: prescriptions.length,
        total,
        page: parseInt(page),
        data: prescriptions,
    });
});

/**
 * @desc    Get prescription by ID
 * @route   GET /api/prescriptions/:id
 */
exports.getPrescriptionById = asyncHandler(async (req, res, next) => {
    const prescription = await Prescription.findById(req.params.id)
        .populate('patient')
        .populate('doctor', 'profile')
        .populate('medicines.medicine');

    if (!prescription) {
        return next(new ErrorResponse('Prescription not found', 404));
    }

    res.status(200).json({
        success: true,
        data: prescription,
    });
});

/**
 * @desc    Update prescription
 * @route   PUT /api/prescriptions/:id
 */
exports.updatePrescription = asyncHandler(async (req, res, next) => {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    }).populate(['patient', 'doctor', 'medicines.medicine']);

    if (!prescription) {
        return next(new ErrorResponse('Prescription not found', 404));
    }

    res.status(200).json({
        success: true,
        data: prescription,
    });
});

/**
 * @desc    Get prescriptions for a patient
 * @route   GET /api/prescriptions/patient/:patientId
 */
exports.getPatientPrescriptions = asyncHandler(async (req, res, next) => {
    const prescriptions = await Prescription.find({ patient: req.params.patientId })
        .populate('doctor', 'profile.firstName profile.lastName')
        .populate('medicines.medicine')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: prescriptions.length,
        data: prescriptions,
    });
});

/**
 * @desc    Dispense prescription
 * @route   POST /api/prescriptions/:id/dispense
 */
exports.dispensePrescription = asyncHandler(async (req, res, next) => {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
        return next(new ErrorResponse('Prescription not found', 404));
    }

    if (prescription.isDispensed) {
        return next(new ErrorResponse('Prescription already dispensed', 400));
    }

    prescription.isDispensed = true;
    prescription.dispensedBy = req.user.id;
    prescription.dispensedAt = new Date();
    await prescription.save();

    res.status(200).json({
        success: true,
        message: 'Prescription dispensed successfully',
        data: prescription,
    });
});
