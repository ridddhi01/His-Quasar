const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/payments
 * @desc    Record a new payment
 */
router.post('/', authorize('billing', 'admin'), paymentController.createPayment);

/**
 * @route   GET /api/payments
 * @desc    Get all payments
 */
router.get('/', authorize('billing', 'admin'), paymentController.getAllPayments);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 */
router.get('/:id', paymentController.getPaymentById);

/**
 * @route   GET /api/payments/bill/:billId
 * @desc    Get payments for a bill
 */
router.get('/bill/:billId', paymentController.getPaymentsByBill);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Refund a payment
 */
router.post('/:id/refund', authorize('admin'), paymentController.refundPayment);

module.exports = router;
