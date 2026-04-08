const express = require('express');
const router = express.Router();
const emrController = require('../controllers/emr.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   POST /api/emr
 * @desc    Create a new EMR record
 */
router.post('/', authorize('doctor', 'nurse'), emrController.createEMR);

/**
 * @route   GET /api/emr/:patientId
 * @desc    Get all EMR records for a patient
 */
router.get('/:patientId', emrController.getPatientEMRs);

/**
 * @route   GET /api/emr/visit/:visitId
 * @desc    Get EMR by visit ID
 */
router.get('/visit/:visitId', emrController.getEMRByVisit);

/**
 * @route   PUT /api/emr/:id
 * @desc    Update EMR record
 */
router.put('/:id', authorize('doctor', 'nurse'), emrController.updateEMR);

/**
 * @route   POST /api/emr/:id/vitals
 * @desc    Add vitals to EMR
 */
router.post('/:id/vitals', authorize('doctor', 'nurse'), emrController.addVitals);

/**
 * @route   GET /api/emr/:id/timeline
 * @desc    Get patient timeline
 */
router.get('/:id/timeline', emrController.getPatientTimeline);

module.exports = router;
