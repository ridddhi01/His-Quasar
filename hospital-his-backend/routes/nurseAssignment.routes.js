const express = require('express');
const router = express.Router();
const nurseAssignmentController = require('../controllers/nurseAssignment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

// All routes require Nurse Supervisor or Admin role
// Note: Regular nurses cannot manage assignments

// ═══════════════════════════════════════════════════════════════════════════════
// NURSE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/nurse-assignments/nurses
 * @desc    Get all active nurses
 * @access  Nurse Supervisor, Admin
 */
router.get(
    '/nurses',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.getAllNurses
);

// ═══════════════════════════════════════════════════════════════════════════════
// DUTY ROSTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/nurse-assignments/roster
 * @desc    Create shift assignment
 * @access  Nurse Supervisor, Admin
 */
router.post(
    '/roster',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.createShiftAssignment
);

/**
 * @route   GET /api/nurse-assignments/roster
 * @desc    Get duty roster for date range
 * @access  Nurse Supervisor, Admin
 */
router.get(
    '/roster',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.getDutyRoster
);

/**
 * @route   PUT /api/nurse-assignments/roster/:shiftId
 * @desc    Update shift assignment
 * @access  Nurse Supervisor, Admin
 */
router.put(
    '/roster/:shiftId',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.updateShiftAssignment
);

/**
 * @route   DELETE /api/nurse-assignments/roster/:shiftId
 * @desc    Cancel shift assignment
 * @access  Nurse Supervisor, Admin
 */
router.delete(
    '/roster/:shiftId',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.cancelShiftAssignment
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/nurse-assignments/patients
 * @desc    Assign patients to nurse
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
router.post(
    '/patients',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.assignPatientsToNurse
);

/**
 * @route   GET /api/nurse-assignments/ward/:wardId/patients
 * @desc    Get patients in ward for assignment
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
router.get(
    '/ward/:wardId/patients',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.getWardPatients
);

/**
 * @route   GET /api/nurse-assignments/ward/:wardId/shift
 * @desc    Get current ward assignments
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
router.get(
    '/ward/:wardId/shift',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.getCurrentWardAssignments
);

/**
 * @route   POST /api/nurse-assignments/swap
 * @desc    Swap patient between nurses
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
router.post(
    '/swap',
    authorize('nurse', 'admin', 'head_nurse'),
    nurseAssignmentController.swapPatientAssignment
);

module.exports = router;
