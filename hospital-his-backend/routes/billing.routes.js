const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/billing/generate
 * @desc    Generate a new bill
 */
router.post('/generate', authorize('billing', 'admin'), billingController.generateBill);

/**
 * @route   GET /api/billing/bills
 * @desc    Get all bills
 */
router.get('/bills', authorize('billing', 'admin'), billingController.getAllBills);

/**
 * @route   GET /api/billing/bills/:id
 * @desc    Get bill by ID
 */
router.get('/bills/:id', billingController.getBillById);

/**
 * @route   PUT /api/billing/bills/:id
 * @desc    Update bill
 */
router.put('/bills/:id', authorize('billing', 'admin'), billingController.updateBill);

/**
 * @route   GET /api/billing/patient/:patientId
 * @desc    Get bills for a patient
 */
router.get('/patient/:patientId', billingController.getPatientBills);

/**
 * @route   GET /api/billing/pending
 * @desc    Get pending bills
 */
router.get('/pending', authorize('billing', 'admin'), billingController.getPendingBills);

/**
 * @route   GET /api/billing/dashboard
 * @desc    Get billing dashboard stats
 */
router.get('/dashboard', authorize('billing', 'admin'), billingController.getDashboard);

/**
 * @route   POST /api/billing/bills/:id/cancel
 * @desc    Cancel a bill
 */
router.post('/bills/:id/cancel', authorize('admin'), billingController.cancelBill);

// New routes for advanced billing features
router.post('/bills/:id/request-discount', authorize('billing', 'admin'), billingController.requestDiscount);
router.post('/bills/:id/approve-discount', authorize('admin'), billingController.approveDiscount);
router.post('/bills/:id/finalize', authorize('billing', 'admin'), billingController.finalizeBill);
router.post('/bills/:id/responsibility', authorize('billing', 'admin'), billingController.setResponsibility);
router.post('/bills/:id/pay', authorize('billing', 'admin'), billingController.recordPayment);
router.post('/auto-charge', authorize('billing', 'admin', 'doctor', 'nurse'), billingController.generateAutoCharge);
router.get('/reports/revenue', authorize('billing', 'admin'), billingController.getRevenueReport);
router.get('/bills/:id/audit', authorize('billing', 'admin'), billingController.getBillAudit);
router.get('/pending-discounts', authorize('admin'), billingController.getPendingDiscounts);

module.exports = router;
