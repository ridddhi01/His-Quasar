const express = require('express');
const router = express.Router();
const carePlanController = require('../controllers/careplan.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
// CARE PLAN MANAGEMENT (Doctor Functions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/care-plans
 * @desc    Create a new care plan
 * @access  Doctor, Admin
 */
router.post(
    '/',
    authorize('doctor', 'admin'),
    carePlanController.createCarePlan
);

/**
 * @route   GET /api/care-plans/patient/:patientId
 * @desc    Get all care plans for a patient
 * @access  Doctor, Nurse, Admin
 */
router.get(
    '/patient/:patientId',
    authorize('doctor', 'nurse', 'admin'),
    carePlanController.getPatientCarePlans
);

/**
 * @route   GET /api/care-plans/:id
 * @desc    Get care plan by ID
 * @access  Doctor, Nurse, Admin
 */
router.get(
    '/:id',
    authorize('doctor', 'nurse', 'admin'),
    carePlanController.getCarePlanById
);

/**
 * @route   PUT /api/care-plans/:id
 * @desc    Update care plan
 * @access  Doctor, Admin
 */
router.put(
    '/:id',
    authorize('doctor', 'admin'),
    carePlanController.updateCarePlan
);

/**
 * @route   POST /api/care-plans/:id/goals
 * @desc    Add goal to care plan
 * @access  Doctor, Admin
 */
router.post(
    '/:id/goals',
    authorize('doctor', 'admin'),
    carePlanController.addGoal
);

/**
 * @route   POST /api/care-plans/:id/interventions
 * @desc    Add intervention to care plan
 * @access  Doctor, Admin
 */
router.post(
    '/:id/interventions',
    authorize('doctor', 'admin'),
    carePlanController.addIntervention
);

/**
 * @route   PUT /api/care-plans/:id/goals/:goalIndex
 * @desc    Update goal status
 * @access  Doctor, Admin
 */
router.put(
    '/:id/goals/:goalIndex',
    authorize('doctor', 'admin'),
    carePlanController.updateGoalStatus
);

/**
 * @route   POST /api/care-plans/:id/issues/:issueIndex/resolve
 * @desc    Resolve flagged issue
 * @access  Doctor, Admin
 */
router.post(
    '/:id/issues/:issueIndex/resolve',
    authorize('doctor', 'admin'),
    carePlanController.resolveIssue
);

/**
 * @route   POST /api/care-plans/:id/discontinue
 * @desc    Discontinue care plan
 * @access  Doctor, Admin
 */
router.post(
    '/:id/discontinue',
    authorize('doctor', 'admin'),
    carePlanController.discontinueCarePlan
);

/**
 * @route   POST /api/care-plans/:id/assign-nurses
 * @desc    Assign nurses to care plan
 * @access  Nurse Supervisor, Head Nurse, Admin
 * @note    Doctors do NOT assign nurses - supervisors do
 */
router.post(
    '/:id/assign-nurses',
    authorize('nurse', 'admin'), // Only senior nurses/supervisors
    carePlanController.assignNurses
);

module.exports = router;
