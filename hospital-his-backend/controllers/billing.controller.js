const Billing = require('../models/Billing');
const BillingItem = require('../models/BillingItem');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Generate bill
 * @route   POST /api/billing/generate
 */
exports.generateBill = asyncHandler(async (req, res, next) => {
    req.body.generatedBy = req.user.id;

    const bill = await Billing.create(req.body);
    await bill.populate(['patient', 'generatedBy']);

    res.status(201).json({
        success: true,
        data: bill,
    });
});

/**
 * @desc    Get all bills
 * @route   GET /api/billing/bills
 */
exports.getAllBills = asyncHandler(async (req, res, next) => {
    const { paymentStatus, page = 1, limit = 20 } = req.query;

    const query = {};
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;

    const bills = await Billing.find(query)
        .populate('patient', 'patientId firstName lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ billDate: -1 });

    const total = await Billing.countDocuments(query);

    res.status(200).json({
        success: true,
        count: bills.length,
        total,
        page: parseInt(page),
        data: bills,
    });
});

/**
 * @desc    Get bill by ID
 * @route   GET /api/billing/bills/:id
 */
exports.getBillById = asyncHandler(async (req, res, next) => {
    const bill = await Billing.findById(req.params.id)
        .populate('patient')
        .populate('generatedBy', 'profile');

    if (!bill) {
        return next(new ErrorResponse('Bill not found', 404));
    }

    res.status(200).json({
        success: true,
        data: bill,
    });
});

/**
 * @desc    Update bill
 * @route   PUT /api/billing/bills/:id
 */
exports.updateBill = asyncHandler(async (req, res, next) => {
    const bill = await billingService.updateBill(req.params.id, req.body, req.user);

    res.status(200).json({
        success: true,
        data: bill,
    });
});

/**
 * @desc    Get patient bills
 * @route   GET /api/billing/patient/:patientId
 */
exports.getPatientBills = asyncHandler(async (req, res, next) => {
    const bills = await Billing.find({ patient: req.params.patientId })
        .sort({ billDate: -1 });

    res.status(200).json({
        success: true,
        count: bills.length,
        data: bills,
    });
});

/**
 * @desc    Get pending bills
 * @route   GET /api/billing/pending
 */
exports.getPendingBills = asyncHandler(async (req, res, next) => {
    const bills = await Billing.find({ paymentStatus: { $in: ['pending', 'partial'] } })
        .populate('patient', 'patientId firstName lastName')
        .sort({ billDate: -1 });

    res.status(200).json({
        success: true,
        count: bills.length,
        data: bills,
    });
});

/**
 * @desc    Get billing dashboard
 * @route   GET /api/billing/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCollection, pendingAmount, todayBills] = await Promise.all([
        Billing.aggregate([
            { $match: { billDate: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Billing.aggregate([
            { $match: { paymentStatus: { $in: ['pending', 'partial'] } } },
            { $group: { _id: null, total: { $sum: '$balanceAmount' } } },
        ]),
        Billing.countDocuments({ billDate: { $gte: today } }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            todayCollection: todayCollection[0]?.total || 0,
            pendingAmount: pendingAmount[0]?.total || 0,
            todayBills,
        },
    });
});

/**
 * @desc    Cancel bill
 * @route   POST /api/billing/bills/:id/cancel
 */
exports.cancelBill = asyncHandler(async (req, res, next) => {
    const bill = await Billing.findById(req.params.id);

    if (!bill) {
        return next(new ErrorResponse('Bill not found', 404));
    }

    bill.paymentStatus = 'cancelled';
    await bill.save();

    res.status(200).json({
        success: true,
        message: 'Bill cancelled successfully',
    });
});

/**
 * @desc    Request discount on bill
 * @route   POST /api/billing/bills/:id/request-discount
 */
const billingService = require('../services/billing.service');

exports.requestDiscount = asyncHandler(async (req, res, next) => {
    const { discountAmount, reason } = req.body;

    const bill = await billingService.requestDiscount(
        req.params.id,
        discountAmount,
        reason,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Discount request submitted',
        data: bill,
    });
});

/**
 * @desc    Approve/reject discount request
 * @route   POST /api/billing/bills/:id/approve-discount
 */
exports.approveDiscount = asyncHandler(async (req, res, next) => {
    const { isApproved, rejectionReason } = req.body;

    const bill = await billingService.approveDiscount(
        req.params.id,
        req.user.id,
        isApproved,
        rejectionReason
    );

    res.status(200).json({
        success: true,
        message: isApproved ? 'Discount approved' : 'Discount rejected',
        data: bill,
    });
});

/**
 * @desc    Finalize bill
 * @route   POST /api/billing/bills/:id/finalize
 */
exports.finalizeBill = asyncHandler(async (req, res, next) => {
    const bill = await billingService.finalizeBill(req.params.id, req.user.id);

    res.status(200).json({
        success: true,
        message: 'Bill finalized successfully',
        data: bill,
    });
});

/**
 * @desc    Generate auto-charge (bed/OT/lab/pharmacy)
 * @route   POST /api/billing/auto-charge
 */
exports.generateAutoCharge = asyncHandler(async (req, res, next) => {
    const { type, referenceId } = req.body;

    let bill;
    switch (type) {
        case 'bed':
            bill = await billingService.generateBedCharges(referenceId);
            break;
        case 'ot':
            bill = await billingService.generateOTCharges(referenceId);
            break;
        case 'lab':
            bill = await billingService.generateLabCharges(referenceId);
            break;
        case 'pharmacy':
            bill = await billingService.generatePharmacyCharges(referenceId);
            break;
        default:
            return next(new ErrorResponse('Invalid charge type', 400));
    }

    res.status(200).json({
        success: true,
        message: 'Auto-charge generated',
        data: bill,
    });
});

/**
 * @desc    Get revenue report
 * @route   GET /api/billing/reports/revenue
 */
exports.getRevenueReport = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const summary = await billingService.getBillingSummary(start, end);

    res.status(200).json({
        success: true,
        data: summary,
    });
});

/**
 * @desc    Get bill audit trail
 * @route   GET /api/billing/bills/:id/audit
 */
exports.getBillAudit = asyncHandler(async (req, res, next) => {
    const bill = await Billing.findById(req.params.id)
        .select('billNumber auditTrail')
        .populate('auditTrail.performedBy', 'profile.firstName profile.lastName');

    if (!bill) {
        return next(new ErrorResponse('Bill not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            billNumber: bill.billNumber,
            auditTrail: bill.auditTrail,
        },
    });
});

/**
 * @desc    Get bills with pending discount requests
 * @route   GET /api/billing/pending-discounts
 */
exports.getPendingDiscounts = asyncHandler(async (req, res, next) => {
    const bills = await Billing.find({
        'discountRequest.status': 'pending'
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('discountRequest.requestedBy', 'profile.firstName profile.lastName')
        .sort({ 'discountRequest.requestedAt': -1 });

    res.status(200).json({
        success: true,
        count: bills.length,
        data: bills,
    });
});

/**
 * @desc    Set payment responsibility
 * @route   POST /api/billing/bills/:id/responsibility
 */
exports.setResponsibility = asyncHandler(async (req, res, next) => {
    const bill = await billingService.setPaymentResponsibility(req.params.id, req.body);
    res.status(200).json({ success: true, data: bill });
});

/**
 * @desc    Record payment
 * @route   POST /api/billing/bills/:id/pay
 */
exports.recordPayment = asyncHandler(async (req, res, next) => {
    const paymentData = { ...req.body, receivedBy: req.user.id };
    const bill = await billingService.recordPayment(req.params.id, paymentData);
    res.status(200).json({ success: true, data: bill });
});
