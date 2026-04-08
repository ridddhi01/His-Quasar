const Radiology = require('../models/Radiology');
const RadiologyMaster = require('../models/RadiologyMaster');
const { RADIOLOGY_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create radiology order
 * @route   POST /api/radiology/orders
 */
exports.createRadiologyOrder = asyncHandler(async (req, res, next) => {
    req.body.orderedBy = req.user.id;

    const order = await Radiology.create(req.body);
    await order.populate(['patient', 'orderedBy', 'test']);

    res.status(201).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Get all radiology orders
 * @route   GET /api/radiology/orders
 */
exports.getAllRadiologyOrders = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const orders = await Radiology.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('orderedBy', 'profile.firstName profile.lastName')
        .populate('test', 'testName modality')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Radiology.countDocuments(query);

    res.status(200).json({
        success: true,
        count: orders.length,
        total,
        page: parseInt(page),
        data: orders,
    });
});

/**
 * @desc    Get radiology order by ID
 * @route   GET /api/radiology/orders/:id
 */
exports.getRadiologyOrderById = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id)
        .populate('patient')
        .populate('orderedBy', 'profile')
        .populate('test')
        .populate('performedBy', 'profile');

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Update radiology order
 * @route   PUT /api/radiology/orders/:id
 */
exports.updateRadiologyOrder = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Schedule radiology test
 * @route   POST /api/radiology/orders/:id/schedule
 */
exports.scheduleTest = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    order.scheduledAt = req.body.scheduledAt;
    order.status = RADIOLOGY_STATUS.SCHEDULED;
    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Enter radiology report
 * @route   POST /api/radiology/orders/:id/enter-report
 */
exports.enterReport = asyncHandler(async (req, res, next) => {
    const order = await Radiology.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Radiology order not found', 404));
    }

    order.findings = req.body.findings;
    order.impression = req.body.impression;
    order.recommendations = req.body.recommendations;
    order.images = req.body.images || [];
    order.status = RADIOLOGY_STATUS.COMPLETED;
    order.performedBy = req.user.id;
    order.completedAt = new Date();
    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Get radiology queue
 * @route   GET /api/radiology/queue
 */
exports.getRadiologyQueue = asyncHandler(async (req, res, next) => {
    const queue = await Radiology.find({
        status: { $in: [RADIOLOGY_STATUS.ORDERED, RADIOLOGY_STATUS.SCHEDULED, RADIOLOGY_STATUS.IN_PROGRESS] },
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('test', 'testName modality')
        .sort({ scheduledAt: 1, createdAt: 1 });

    res.status(200).json({
        success: true,
        count: queue.length,
        data: queue,
    });
});

/**
 * @desc    Get radiology dashboard
 * @route   GET /api/radiology/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, completed, modalityBreakdown] = await Promise.all([
        Radiology.countDocuments({ status: { $in: [RADIOLOGY_STATUS.ORDERED, RADIOLOGY_STATUS.SCHEDULED] } }),
        Radiology.countDocuments({ completedAt: { $gte: today } }),
        Radiology.aggregate([
            { $lookup: { from: 'radiologymasters', localField: 'test', foreignField: '_id', as: 'testInfo' } },
            { $unwind: '$testInfo' },
            { $group: { _id: '$testInfo.modality', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            pending,
            completedToday: completed,
            modalityBreakdown: modalityBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

/**
 * @desc    Get available radiology tests
 * @route   GET /api/radiology/tests
 */
exports.getRadiologyTests = asyncHandler(async (req, res, next) => {
    const tests = await RadiologyMaster.find({ isActive: true }).sort({ testName: 1 });

    res.status(200).json({
        success: true,
        count: tests.length,
        data: tests,
    });
});
