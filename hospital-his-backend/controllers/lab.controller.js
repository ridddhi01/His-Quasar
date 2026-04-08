const LabTest = require('../models/LabTest');
const LabTestMaster = require('../models/LabTestMaster');
const { LAB_TEST_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create lab order
 * @route   POST /api/lab/orders
 */
exports.createLabOrder = asyncHandler(async (req, res, next) => {
    req.body.orderedBy = req.user.id;

    const labOrder = await LabTest.create(req.body);
    await labOrder.populate(['patient', 'orderedBy', 'test']);

    res.status(201).json({
        success: true,
        data: labOrder,
    });
});

/**
 * @desc    Get all lab orders
 * @route   GET /api/lab/orders
 */
exports.getAllLabOrders = asyncHandler(async (req, res, next) => {
    const { status, patient, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (patient) query.patient = patient;

    const skip = (page - 1) * limit;

    const orders = await LabTest.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('orderedBy', 'profile.firstName profile.lastName')
        .populate('test', 'testName testCode')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await LabTest.countDocuments(query);

    res.status(200).json({
        success: true,
        count: orders.length,
        total,
        page: parseInt(page),
        data: orders,
    });
});

/**
 * @desc    Get lab order by ID
 * @route   GET /api/lab/orders/:id
 */
exports.getLabOrderById = asyncHandler(async (req, res, next) => {
    const order = await LabTest.findById(req.params.id)
        .populate('patient')
        .populate('orderedBy', 'profile')
        .populate('test')
        .populate('performedBy', 'profile');

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Update lab order
 * @route   PUT /api/lab/orders/:id
 */
exports.updateLabOrder = asyncHandler(async (req, res, next) => {
    const order = await LabTest.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Collect sample
 * @route   POST /api/lab/orders/:id/collect-sample
 */
exports.collectSample = asyncHandler(async (req, res, next) => {
    const order = await LabTest.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    order.status = LAB_TEST_STATUS.SAMPLE_COLLECTED;
    order.sampleCollectedAt = new Date();
    order.sampleCollectedBy = req.user.id;
    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Enter lab results
 * @route   POST /api/lab/orders/:id/enter-results
 */
exports.enterResults = asyncHandler(async (req, res, next) => {
    const order = await LabTest.findById(req.params.id).populate('test');

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    order.results = req.body.results;
    order.remarks = req.body.remarks;
    order.status = LAB_TEST_STATUS.COMPLETED;
    order.performedBy = req.user.id;
    order.completedAt = new Date();

    // Billing Integration
    if (!order.isBilled) {
        try {
            const { addItemToBill } = require('../services/billing.internal.service');
            await addItemToBill({
                patientId: order.patient,
                visitId: order.visit,
                visitType: 'opd', // Need to handle IPD dynamically if needed, or assume opd/ipd based on visitModel
                itemType: 'lab',
                itemReference: order._id,
                description: `Lab: ${order.test.testName}`,
                quantity: 1,
                rate: order.test.price,
                generatedBy: req.user.id
            });
            order.isBilled = true;
        } catch (err) {
            console.error('Failed to trigger lab billing:', err);
        }
    }

    await order.save();

    res.status(200).json({
        success: true,
        data: order,
    });
});

/**
 * @desc    Generate lab report
 * @route   POST /api/lab/orders/:id/generate-report
 */
exports.generateReport = asyncHandler(async (req, res, next) => {
    const order = await LabTest.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    // TODO: Generate PDF report
    order.isReportGenerated = true;
    order.reportUrl = `/reports/lab/${order._id}.pdf`;
    await order.save();

    res.status(200).json({
        success: true,
        message: 'Report generated successfully',
        data: order,
    });
});

/**
 * @desc    Get lab queue
 * @route   GET /api/lab/queue
 */
exports.getLabQueue = asyncHandler(async (req, res, next) => {
    const queue = await LabTest.find({
        status: { $in: [LAB_TEST_STATUS.ORDERED, LAB_TEST_STATUS.SAMPLE_COLLECTED, LAB_TEST_STATUS.IN_PROGRESS] },
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('test', 'testName')
        .sort({ createdAt: 1 });

    res.status(200).json({
        success: true,
        count: queue.length,
        data: queue,
    });
});

/**
 * @desc    Get lab dashboard stats
 * @route   GET /api/lab/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, completed, statusBreakdown] = await Promise.all([
        LabTest.countDocuments({ status: { $in: [LAB_TEST_STATUS.ORDERED, LAB_TEST_STATUS.SAMPLE_COLLECTED] } }),
        LabTest.countDocuments({ completedAt: { $gte: today } }),
        LabTest.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            pending,
            completedToday: completed,
            statusBreakdown: statusBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});

/**
 * @desc    Get available lab tests
 * @route   GET /api/lab/tests
 */
exports.getLabTests = asyncHandler(async (req, res, next) => {
    const tests = await LabTestMaster.find({ isActive: true }).sort({ testName: 1 });

    res.status(200).json({
        success: true,
        count: tests.length,
        data: tests,
    });
});

/**
 * @desc    Upload PDF report and generate AI summary
 * @route   POST /api/lab/orders/:id/upload-report
 */
exports.uploadReport = asyncHandler(async (req, res, next) => {
    const { extractTextFromPdf, generateLabSummary } = require('../services/ai.service');

    const order = await LabTest.findById(req.params.id).populate('test');

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    if (!req.file) {
        return next(new ErrorResponse('Please upload a PDF file', 400));
    }

    // Save relative file path (URL-friendly)
    const relativePath = req.file.path.split('uploads')[1];
    order.reportPdf = 'uploads' + relativePath.replace(/\\/g, '/');
    order.isReportGenerated = true;

    try {
        // Extract text from PDF
        const extractedText = await extractTextFromPdf(req.file.path);
        order.extractedText = extractedText;

        // AI Summary disabled temporarily (enable later when rate limits are resolved)
        // const aiSummary = await generateLabSummary(extractedText);
        // order.aiSummary = aiSummary;
        order.aiSummary = null;  // Disabled for now
        order.summaryGeneratedAt = null;
    } catch (error) {
        console.error('PDF processing error:', error.message);
        // Still save the file even if extraction fails
        order.extractedText = null;
        order.aiSummary = null;
    }

    // Mark as completed and bill
    order.status = require('../config/constants').LAB_TEST_STATUS.COMPLETED;
    order.completedAt = new Date();

    if (!order.isBilled) {
        try {
            const { addItemToBill } = require('../services/billing.internal.service');
            await addItemToBill({
                patientId: order.patient,
                visitId: order.visit,
                visitType: 'opd', // Need to handle IPD dynamically if needed
                itemType: 'lab',
                itemReference: order._id,
                description: `Lab: ${order.test.testName} (Report Uploaded)`,
                quantity: 1,
                rate: order.test.price,
                generatedBy: req.user.id
            });
            order.isBilled = true;
        } catch (err) {
            console.error('Failed to trigger lab billing (upload):', err);
        }
    }

    await order.save();

    res.status(200).json({
        success: true,
        message: 'Report uploaded successfully',
        data: {
            reportPdf: order.reportPdf,
            hasSummary: !!order.aiSummary,
            summaryGeneratedAt: order.summaryGeneratedAt
        },
    });
});

/**
 * @desc    Get lab report (PDF path and AI summary)
 * @route   GET /api/lab/orders/:id/report
 */
exports.getReport = asyncHandler(async (req, res, next) => {
    const order = await LabTest.findById(req.params.id)
        .select('reportPdf extractedText aiSummary summaryGeneratedAt testNumber')
        .populate('test', 'testName');

    if (!order) {
        return next(new ErrorResponse('Lab order not found', 404));
    }

    if (!order.reportPdf) {
        return next(new ErrorResponse('No report uploaded for this order', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            testNumber: order.testNumber,
            testName: order.test?.testName,
            reportPdf: order.reportPdf,
            aiSummary: order.aiSummary,
            summaryGeneratedAt: order.summaryGeneratedAt
        },
    });
});
