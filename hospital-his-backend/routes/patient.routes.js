const express = require('express');
const router = express.Router();
const multer = require('multer');
const patientController = require('../controllers/patient.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// Multer configuration for ID card uploads (in-memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only images
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/patients/scan-id
 * @desc    Scan government ID card and extract patient details
 * @access  Receptionist, Admin
 */
router.post('/scan-id',
    authorize('receptionist', 'admin'),
    upload.single('idImage'),
    patientController.scanIdCard
);

/**
 * @route   POST /api/patients
 * @desc    Register a new patient
 */
/**
 * @route   POST /api/patients
 * @desc    Register a new patient
 */
router.post('/', authorize('receptionist', 'admin', 'doctor', 'nurse', 'head_nurse'), patientController.createPatient);

/**
 * @route   GET /api/patients
 * @desc    Get all patients with pagination
 */
router.get('/', patientController.getAllPatients);

/**
 * @route   GET /api/patients/search
 * @desc    Search patients by name, phone, or ID
 */
router.get('/search', patientController.searchPatients);

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID
 */
router.get('/:id', patientController.getPatientById);

/**
 * @route   PUT /api/patients/:id
 * @desc    Update patient details
 */
router.put('/:id', authorize('receptionist', 'admin', 'doctor', 'nurse', 'head_nurse'), patientController.updatePatient);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Delete patient (soft delete)
 */
router.delete('/:id', authorize('admin'), patientController.deletePatient);

/**
 * @route   GET /api/patients/:id/history
 * @desc    Get patient visit history
 */
router.get('/:id/history', patientController.getPatientHistory);

/**
 * @route   GET /api/patients/:id/emr
 * @desc    Get patient EMR records
 */
router.get('/:id/emr', patientController.getPatientEMR);

module.exports = router;

