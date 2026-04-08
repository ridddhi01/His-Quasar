const express = require('express');
const router = express.Router();
const radiologyController = require('../controllers/radiology.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/radiology/orders
 * @desc    Create a new radiology order
 */
router.post('/orders', authorize('doctor'), radiologyController.createRadiologyOrder);

/**
 * @route   GET /api/radiology/orders
 * @desc    Get all radiology orders
 */
router.get('/orders', radiologyController.getAllRadiologyOrders);

/**
 * @route   GET /api/radiology/orders/:id
 * @desc    Get radiology order by ID
 */
router.get('/orders/:id', radiologyController.getRadiologyOrderById);

/**
 * @route   PUT /api/radiology/orders/:id
 * @desc    Update radiology order
 */
router.put('/orders/:id', authorize('radiologist', 'doctor'), radiologyController.updateRadiologyOrder);

/**
 * @route   POST /api/radiology/orders/:id/schedule
 * @desc    Schedule radiology test
 */
router.post('/orders/:id/schedule', authorize('radiologist', 'receptionist'), radiologyController.scheduleTest);

/**
 * @route   POST /api/radiology/orders/:id/enter-report
 * @desc    Enter radiology report
 */
router.post('/orders/:id/enter-report', authorize('radiologist'), radiologyController.enterReport);

/**
 * @route   GET /api/radiology/queue
 * @desc    Get radiology work queue
 */
router.get('/queue', authorize('radiologist', 'admin', 'doctor'), radiologyController.getRadiologyQueue);

/**
 * @route   GET /api/radiology/dashboard
 * @desc    Get radiology dashboard stats
 */
router.get('/dashboard', authorize('radiologist', 'admin', 'doctor'), radiologyController.getDashboard);

/**
 * @route   GET /api/radiology/tests
 * @desc    Get available radiology tests (master)
 */
router.get('/tests', radiologyController.getRadiologyTests);

module.exports = router;
