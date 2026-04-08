const express = require('express');
const router = express.Router();
const opdController = require('../controllers/opd.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/opd/appointments
 * @desc    Create a new appointment
 */
router.post('/appointments', authorize('receptionist', 'admin', 'doctor'), opdController.createAppointment);

/**
 * @route   GET /api/opd/appointments
 * @desc    Get all appointments with filters
 */
router.get('/appointments', opdController.getAllAppointments);

/**
 * @route   GET /api/opd/appointments/:id
 * @desc    Get appointment by ID
 */
router.get('/appointments/:id', opdController.getAppointmentById);

/**
 * @route   PUT /api/opd/appointments/:id
 * @desc    Update appointment
 */
router.put('/appointments/:id', authorize('receptionist', 'admin', 'doctor'), opdController.updateAppointment);

/**
 * @route   DELETE /api/opd/appointments/:id
 * @desc    Cancel appointment
 */
router.delete('/appointments/:id', authorize('receptionist', 'admin'), opdController.cancelAppointment);

/**
 * @route   PUT /api/opd/appointments/:id/checkin
 * @desc    Check-in patient for appointment
 */
router.put('/appointments/:id/checkin', authorize('receptionist', 'nurse'), opdController.checkInPatient);

/**
 * @route   GET /api/opd/queue
 * @desc    Get current OPD queue
 */
router.get('/queue', opdController.getOPDQueue);

/**
 * @route   GET /api/opd/dashboard
 * @desc    Get OPD dashboard stats
 */
router.get('/dashboard', opdController.getDashboard);

module.exports = router;
