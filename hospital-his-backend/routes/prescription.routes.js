const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/prescriptions
 * @desc    Create a new prescription
 */
router.post('/', authorize('doctor'), prescriptionController.createPrescription);

/**
 * @route   GET /api/prescriptions
 * @desc    Get all prescriptions
 */
router.get('/', prescriptionController.getAllPrescriptions);

/**
 * @route   GET /api/prescriptions/:id
 * @desc    Get prescription by ID
 */
router.get('/:id', prescriptionController.getPrescriptionById);

/**
 * @route   PUT /api/prescriptions/:id
 * @desc    Update prescription
 */
router.put('/:id', authorize('doctor'), prescriptionController.updatePrescription);

/**
 * @route   GET /api/prescriptions/patient/:patientId
 * @desc    Get prescriptions for a patient
 */
router.get('/patient/:patientId', prescriptionController.getPatientPrescriptions);

/**
 * @route   POST /api/prescriptions/:id/dispense
 * @desc    Mark prescription as dispensed
 */
router.post('/:id/dispense', authorize('pharmacist'), prescriptionController.dispensePrescription);

module.exports = router;
