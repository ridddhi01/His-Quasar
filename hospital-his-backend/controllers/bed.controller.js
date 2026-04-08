const Bed = require('../models/Bed');
const Ward = require('../models/Ward');
const { BED_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all beds
 * @route   GET /api/beds
 */
exports.getAllBeds = asyncHandler(async (req, res, next) => {
    const { ward, status, bedType } = req.query;

    const query = {};
    if (ward) query.ward = ward;
    if (status) query.status = status;
    if (bedType) query.bedType = bedType;

    const beds = await Bed.find(query)
        .populate('ward', 'name')
        .populate('currentPatient', 'patientId firstName lastName')
        .populate('currentAdmission', '_id admissionNumber')
        .sort({ bedNumber: 1 });

    res.status(200).json({
        success: true,
        count: beds.length,
        data: beds,
    });
});

/**
 * @desc    Get bed by ID
 * @route   GET /api/beds/:id
 */
exports.getBedById = asyncHandler(async (req, res, next) => {
    const bed = await Bed.findById(req.params.id)
        .populate('ward')
        .populate('currentPatient')
        .populate('currentAdmission');

    if (!bed) {
        return next(new ErrorResponse('Bed not found', 404));
    }

    res.status(200).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Update bed
 * @route   PUT /api/beds/:id
 */
exports.updateBed = asyncHandler(async (req, res, next) => {
    const bed = await Bed.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!bed) {
        return next(new ErrorResponse('Bed not found', 404));
    }

    res.status(200).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Add new bed
 * @route   POST /api/beds
 */
exports.addBed = asyncHandler(async (req, res, next) => {
    const bed = await Bed.create(req.body);

    // Update ward total beds count
    await Ward.findByIdAndUpdate(req.body.ward, { $inc: { totalBeds: 1 } });

    res.status(201).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Allocate bed
 * @route   POST /api/beds/allocate
 */
exports.allocateBed = asyncHandler(async (req, res, next) => {
    const { bedId, patientId, admissionId } = req.body;

    const bed = await Bed.findById(bedId);
    if (!bed) {
        return next(new ErrorResponse('Bed not found', 404));
    }

    if (bed.status !== BED_STATUS.AVAILABLE) {
        return next(new ErrorResponse('Bed is not available', 400));
    }

    bed.status = BED_STATUS.OCCUPIED;
    bed.currentPatient = patientId;
    bed.currentAdmission = admissionId;
    await bed.save();

    res.status(200).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Transfer bed
 * @route   POST /api/beds/transfer
 */
exports.transferBed = asyncHandler(async (req, res, next) => {
    const { fromBedId, toBedId } = req.body;

    const fromBed = await Bed.findById(fromBedId);
    const toBed = await Bed.findById(toBedId);

    if (!fromBed || !toBed) {
        return next(new ErrorResponse('Bed not found', 404));
    }

    if (toBed.status !== BED_STATUS.AVAILABLE) {
        return next(new ErrorResponse('Target bed is not available', 400));
    }

    // Transfer patient to new bed
    toBed.status = BED_STATUS.OCCUPIED;
    toBed.currentPatient = fromBed.currentPatient;
    toBed.currentAdmission = fromBed.currentAdmission;
    await toBed.save();

    // Free up old bed
    fromBed.status = BED_STATUS.AVAILABLE;
    fromBed.currentPatient = null;
    fromBed.currentAdmission = null;
    await fromBed.save();

    res.status(200).json({
        success: true,
        message: 'Patient transferred successfully',
    });
});

/**
 * @desc    Get bed availability
 * @route   GET /api/beds/availability
 */
exports.getAvailability = asyncHandler(async (req, res, next) => {
    const { ward, bedType } = req.query;

    const query = { status: BED_STATUS.AVAILABLE };
    if (ward) query.ward = ward;
    if (bedType) query.bedType = bedType;

    const availableBeds = await Bed.find(query)
        .populate('ward', 'name')
        .sort({ bedNumber: 1 });

    res.status(200).json({
        success: true,
        count: availableBeds.length,
        data: availableBeds,
    });
});

/**
 * @desc    Get bed occupancy stats
 * @route   GET /api/beds/occupancy
 */
exports.getOccupancy = asyncHandler(async (req, res, next) => {
    const stats = await Bed.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const total = stats.reduce((acc, curr) => acc + curr.count, 0);
    const occupied = stats.find((s) => s._id === BED_STATUS.OCCUPIED)?.count || 0;

    res.status(200).json({
        success: true,
        data: {
            total,
            occupied,
            available: stats.find((s) => s._id === BED_STATUS.AVAILABLE)?.count || 0,
            occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : 0,
            statusBreakdown: stats.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

/**
 * @desc    Get all wards
 * @route   GET /api/beds/wards
 */
exports.getWards = asyncHandler(async (req, res, next) => {
    const wards = await Ward.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: wards.length,
        data: wards,
    });
});
