const Payment = require('../models/Payment');
const Billing = require('../models/Billing');
const { PAYMENT_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create payment
 * @route   POST /api/payments
 */
exports.createPayment = asyncHandler(async (req, res, next) => {
    req.body.collectedBy = req.user.id;

    const payment = await Payment.create(req.body);

    // Update bill payment status
    const bill = await Billing.findById(req.body.bill);
    if (bill) {
        bill.paidAmount += req.body.amount;
        bill.balanceAmount = bill.grandTotal - bill.paidAmount;
        bill.paymentStatus = bill.balanceAmount <= 0 ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PARTIAL;
        await bill.save();
    }

    await payment.populate(['patient', 'bill']);

    res.status(201).json({
        success: true,
        data: payment,
    });
});

/**
 * @desc    Get all payments
 * @route   GET /api/payments
 */
exports.getAllPayments = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const payments = await Payment.find()
        .populate('patient', 'patientId firstName lastName')
        .populate('bill', 'billNumber grandTotal')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ paymentDate: -1 });

    const total = await Payment.countDocuments();

    res.status(200).json({
        success: true,
        count: payments.length,
        total,
        page: parseInt(page),
        data: payments,
    });
});

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 */
exports.getPaymentById = asyncHandler(async (req, res, next) => {
    const payment = await Payment.findById(req.params.id)
        .populate('patient')
        .populate('bill')
        .populate('collectedBy', 'profile');

    if (!payment) {
        return next(new ErrorResponse('Payment not found', 404));
    }

    res.status(200).json({
        success: true,
        data: payment,
    });
});

/**
 * @desc    Get payments by bill
 * @route   GET /api/payments/bill/:billId
 */
exports.getPaymentsByBill = asyncHandler(async (req, res, next) => {
    const payments = await Payment.find({ bill: req.params.billId })
        .populate('collectedBy', 'profile.firstName profile.lastName')
        .sort({ paymentDate: -1 });

    res.status(200).json({
        success: true,
        count: payments.length,
        data: payments,
    });
});

/**
 * @desc    Refund payment
 * @route   POST /api/payments/:id/refund
 */
exports.refundPayment = asyncHandler(async (req, res, next) => {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        return next(new ErrorResponse('Payment not found', 404));
    }

    if (payment.isRefunded) {
        return next(new ErrorResponse('Payment already refunded', 400));
    }

    payment.isRefunded = true;
    payment.refundedAt = new Date();
    payment.refundReason = req.body.reason;
    await payment.save();

    // Update bill
    const bill = await Billing.findById(payment.bill);
    if (bill) {
        bill.paidAmount -= payment.amount;
        bill.balanceAmount = bill.grandTotal - bill.paidAmount;
        bill.paymentStatus = bill.paidAmount <= 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PARTIAL;
        await bill.save();
    }

    res.status(200).json({
        success: true,
        message: 'Payment refunded successfully',
    });
});
