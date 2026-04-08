const express = require('express');
const router = express.Router();
const ipdController = require('../controllers/ipd.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/ipd/admissions
 * @desc    Create a new admission
 */
/**
 * @route   POST /api/ipd/admissions
 * @desc    Create a new admission
 */
router.post('/admissions', authorize('receptionist', 'admin', 'head_nurse'), ipdController.createAdmission);

/**
 * @route   GET /api/ipd/admissions
 * @desc    Get all admissions with filters
 */
router.get('/admissions', ipdController.getAllAdmissions);

/**
 * @route   GET /api/ipd/admissions/:id
 * @desc    Get admission by ID
 */
router.get('/admissions/:id', ipdController.getAdmissionById);

/**
 * @route   PUT /api/ipd/admissions/:id
 * @desc    Update admission details
 */
router.put('/admissions/:id', authorize('doctor', 'nurse', 'admin', 'head_nurse'), ipdController.updateAdmission);

/**
 * @route   POST /api/ipd/admissions/:id/discharge
 * @desc    Discharge patient
 */
router.post('/admissions/:id/discharge', authorize('doctor', 'admin', 'head_nurse'), ipdController.dischargePatient);

/**
 * @route   GET /api/ipd/patients
 * @desc    Get all currently admitted patients
 */
router.get('/patients', ipdController.getAdmittedPatients);

/**
 * @route   GET /api/ipd/dashboard
 * @desc    Get IPD dashboard stats
 */
router.get('/dashboard', ipdController.getDashboard);

router.post('/admissions/:id/vitals', authorize('doctor', 'nurse', 'admin', 'head_nurse'), ipdController.addVitals);
router.post('/admissions/:id/notes', authorize('doctor', 'nurse', 'admin', 'head_nurse'), ipdController.addClinicalNote);
router.post('/admissions/:id/approve-discharge', authorize('doctor', 'admin', 'head_nurse'), ipdController.approveDischarge); // Only Doctor/Admin

router.post('/requests', authorize('doctor', 'admin'), ipdController.createAdmissionRequest);
router.get('/requests', authorize('receptionist', 'admin', 'head_nurse'), ipdController.getAdmissionRequests);

module.exports = router;
