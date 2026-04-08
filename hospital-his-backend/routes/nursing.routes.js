const express = require('express');
const router = express.Router();
const nursingController = require('../controllers/nursing.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/nursing/shifts/start
 * @desc    Start a nursing shift
 * @access  Nurse, Admin
 */
router.post(
    '/shifts/start',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.startShift
);

/**
 * @route   GET /api/nursing/shifts/current
 * @desc    Get current active shift
 * @access  Nurse, Admin
 */
router.get(
    '/shifts/current',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.getCurrentShift
);

/**
 * @route   POST /api/nursing/shifts/end
 * @desc    End shift (initiate handover)
 * @access  Nurse, Admin
 */
router.post(
    '/shifts/end',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.endShift
);

/**
 * @route   GET /api/nursing/dashboard
 * @desc    Get nursing dashboard data
 * @access  Nurse, Admin
 */
router.get(
    '/dashboard',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.getDashboard
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT TASKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/nursing/patients/:patientId/tasks
 * @desc    Get patient care tasks
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/patients/:patientId/tasks',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getPatientTasks
);

/**
 * @route   POST /api/nursing/tasks/:taskId/complete
 * @desc    Complete a nursing task
 * @access  Nurse, Admin
 */
router.post(
    '/tasks/:taskId/complete',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.completeTask
);

/**
 * @route   POST /api/nursing/tasks/:taskId/skip
 * @desc    Skip a task with reason
 * @access  Nurse, Admin
 */
router.post(
    '/tasks/:taskId/skip',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.skipTask
);

// ═══════════════════════════════════════════════════════════════════════════════
// VITAL SIGNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/nursing/vitals
 * @desc    Record vital signs
 * @access  Nurse, Doctor, Admin
 */
router.post(
    '/vitals',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.recordVitals
);

/**
 * @route   GET /api/nursing/vitals/:patientId
 * @desc    Get vital signs history
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/vitals/:patientId',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getVitalsHistory
);

/**
 * @route   GET /api/nursing/vitals/:patientId/trends
 * @desc    Get vital signs trends for charts
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/vitals/:patientId/trends',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getVitalsTrends
);

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICATION ADMINISTRATION (MAR)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/nursing/medications/:patientId
 * @desc    Get medication schedule
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/medications/:patientId',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getMedicationSchedule
);

/**
 * @route   POST /api/nursing/medications/:marId/administer
 * @desc    Administer medication
 * @access  Nurse, Admin
 */
router.post(
    '/medications/:marId/administer',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.administerMedication
);

/**
 * @route   POST /api/nursing/medications/:marId/skip
 * @desc    Skip medication with reason
 * @access  Nurse, Admin
 */
router.post(
    '/medications/:marId/skip',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.skipMedication
);

// ═══════════════════════════════════════════════════════════════════════════════
// NURSING NOTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/nursing/notes
 * @desc    Create nursing note
 * @access  Nurse, Admin
 */
router.post(
    '/notes',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.createNote
);

/**
 * @route   GET /api/nursing/notes/:patientId
 * @desc    Get patient nursing notes
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/notes/:patientId',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getPatientNotes
);

/**
 * @route   POST /api/nursing/notes/:noteId/addendum
 * @desc    Add addendum to note
 * @access  Nurse, Admin
 */
router.post(
    '/notes/:noteId/addendum',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.addAddendum
);

// ═══════════════════════════════════════════════════════════════════════════════
// CARE PLANS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/nursing/care-plans/:patientId
 * @desc    Get patient care plans
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/care-plans/:patientId',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getCarePlans
);

/**
 * @route   POST /api/nursing/care-plans/:planId/interventions/:index/complete
 * @desc    Complete intervention
 * @access  Nurse, Admin
 */
router.post(
    '/care-plans/:planId/interventions/:index/complete',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.completeIntervention
);

/**
 * @route   POST /api/nursing/care-plans/:planId/evaluate
 * @desc    Add evaluation to care plan
 * @access  Nurse, Admin
 */
router.post(
    '/care-plans/:planId/evaluate',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.addEvaluation
);

/**
 * @route   POST /api/nursing/care-plans/:planId/flag
 * @desc    Flag issue in care plan
 * @access  Nurse, Admin
 */
router.post(
    '/care-plans/:planId/flag',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.flagIssue
);

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT HANDOVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/nursing/handover
 * @desc    Create shift handover
 * @access  Nurse, Admin
 */
router.post(
    '/handover',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.createHandover
);

/**
 * @route   POST /api/nursing/handover/:handoverId/acknowledge
 * @desc    Acknowledge handover
 * @access  Nurse, Admin
 */
router.post(
    '/handover/:handoverId/acknowledge',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.acknowledgeHandover
);

/**
 * @route   GET /api/nursing/handover/pending
 * @desc    Get pending handovers
 * @access  Nurse, Admin
 */
router.get(
    '/handover/pending',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.getPendingHandovers
);

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/nursing/alerts
 * @desc    Get active alerts
 * @access  Nurse, Doctor, Admin
 */
router.get(
    '/alerts',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.getActiveAlerts
);

/**
 * @route   POST /api/nursing/alerts/:alertId/acknowledge
 * @desc    Acknowledge alert
 * @access  Nurse, Doctor, Admin
 */
router.post(
    '/alerts/:alertId/acknowledge',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.acknowledgeAlert
);

/**
 * @route   POST /api/nursing/alerts/:alertId/resolve
 * @desc    Resolve alert
 * @access  Nurse, Doctor, Admin
 */
router.post(
    '/alerts/:alertId/resolve',
    authorize('nurse', 'doctor', 'admin', 'head_nurse'),
    nursingController.resolveAlert
);

/**
 * @route   POST /api/nursing/alerts/escalate
 * @desc    Create manual escalation
 * @access  Nurse, Admin
 */
router.post(
    '/alerts/escalate',
    authorize('nurse', 'admin', 'head_nurse'),
    nursingController.createEscalation
);

module.exports = router;
