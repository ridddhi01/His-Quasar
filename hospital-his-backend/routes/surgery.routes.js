const express = require('express');
const router = express.Router();
const surgeryController = require('../controllers/surgery.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULING & BASIC CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedule
 * @desc    Schedule a new surgery
 */
router.post('/schedule', authorize('doctor', 'admin'), surgeryController.scheduleSurgery);

/**
 * @route   GET /api/surgery/schedules
 * @desc    Get all surgery schedules
 */
router.get('/schedules', surgeryController.getAllSchedules);

/**
 * @route   GET /api/surgery/schedules/:id
 * @desc    Get surgery schedule by ID
 */
router.get('/schedules/:id', surgeryController.getScheduleById);

/**
 * @route   PUT /api/surgery/schedules/:id
 * @desc    Update surgery schedule
 */
router.put('/schedules/:id', authorize('doctor', 'admin'), surgeryController.updateSchedule);

/**
 * @route   GET /api/surgery/ot-roster
 * @desc    Get OT roster for a date
 */
router.get('/ot-roster', surgeryController.getOTRoster);

/**
 * @route   GET /api/surgery/dashboard
 * @desc    Get surgery dashboard stats
 */
router.get('/dashboard', authorize('doctor', 'admin', 'nurse'), surgeryController.getDashboard);

/**
 * @route   POST /api/surgery/schedules/:id/start
 * @desc    Start surgery
 */
router.post('/schedules/:id/start', authorize('doctor', 'admin'), surgeryController.startSurgery);

/**
 * @route   POST /api/surgery/schedules/:id/complete
 * @desc    Mark surgery as complete
 */
router.post('/schedules/:id/complete', authorize('doctor'), surgeryController.completeSurgery);

/**
 * @route   POST /api/surgery/schedules/:id/cancel
 * @desc    Cancel surgery
 */
router.post('/schedules/:id/cancel', authorize('doctor', 'admin'), surgeryController.cancelSurgery);

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-OP ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/pre-op-assessment
 * @desc    Add pre-op assessment
 */
router.post(
    '/schedules/:id/pre-op-assessment',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.addPreOpAssessment
);

/**
 * @route   GET /api/surgery/schedules/:id/pre-op-assessment
 * @desc    Get pre-op assessment
 */
router.get('/schedules/:id/pre-op-assessment', surgeryController.getPreOpAssessment);

// ═══════════════════════════════════════════════════════════════════════════════
// WHO SURGICAL SAFETY CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/who-checklist/sign-in
 * @desc    Complete WHO Sign-In
 */
router.post(
    '/schedules/:id/who-checklist/sign-in',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.updateWHOSignIn
);

/**
 * @route   POST /api/surgery/schedules/:id/who-checklist/time-out
 * @desc    Complete WHO Time-Out
 */
router.post(
    '/schedules/:id/who-checklist/time-out',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.updateWHOTimeOut
);

/**
 * @route   POST /api/surgery/schedules/:id/who-checklist/sign-out
 * @desc    Complete WHO Sign-Out
 */
router.post(
    '/schedules/:id/who-checklist/sign-out',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.updateWHOSignOut
);

/**
 * @route   GET /api/surgery/schedules/:id/who-checklist
 * @desc    Get full WHO checklist
 */
router.get('/schedules/:id/who-checklist', surgeryController.getWHOChecklist);

// ═══════════════════════════════════════════════════════════════════════════════
// ANESTHESIA RECORD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/anesthesia-record
 * @desc    Add/update anesthesia record
 */
router.post(
    '/schedules/:id/anesthesia-record',
    authorize('doctor', 'admin'),
    surgeryController.addAnesthesiaRecord
);

/**
 * @route   POST /api/surgery/schedules/:id/anesthesia-record/vitals
 * @desc    Add vitals reading to anesthesia timeline
 */
router.post(
    '/schedules/:id/anesthesia-record/vitals',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.addAnesthesiaVitals
);

/**
 * @route   POST /api/surgery/schedules/:id/anesthesia-record/drug
 * @desc    Add drug to anesthesia record
 */
router.post(
    '/schedules/:id/anesthesia-record/drug',
    authorize('doctor', 'admin'),
    surgeryController.addAnesthesiaDrug
);

/**
 * @route   GET /api/surgery/schedules/:id/anesthesia-record
 * @desc    Get anesthesia record
 */
router.get('/schedules/:id/anesthesia-record', surgeryController.getAnesthesiaRecord);

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLANTS & CONSUMABLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/implants-consumables
 * @desc    Add implant or consumable
 */
router.post(
    '/schedules/:id/implants-consumables',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.addImplantConsumable
);

/**
 * @route   GET /api/surgery/schedules/:id/implants-consumables
 * @desc    Get implants and consumables
 */
router.get('/schedules/:id/implants-consumables', surgeryController.getImplantsConsumables);

// ═══════════════════════════════════════════════════════════════════════════════
// INTRA-OP NOTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/intra-op-notes
 * @desc    Add intra-op note
 */
router.post(
    '/schedules/:id/intra-op-notes',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.addIntraOpNote
);

/**
 * @route   GET /api/surgery/schedules/:id/intra-op-notes
 * @desc    Get intra-op notes
 */
router.get('/schedules/:id/intra-op-notes', surgeryController.getIntraOpNotes);

// ═══════════════════════════════════════════════════════════════════════════════
// POST-OP ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/post-op-orders
 * @desc    Add post-op order
 */
router.post(
    '/schedules/:id/post-op-orders',
    authorize('doctor', 'admin'),
    surgeryController.addPostOpOrder
);

/**
 * @route   GET /api/surgery/schedules/:id/post-op-orders
 * @desc    Get post-op orders
 */
router.get('/schedules/:id/post-op-orders', surgeryController.getPostOpOrders);

/**
 * @route   PUT /api/surgery/schedules/:id/post-op-orders/:orderIndex
 * @desc    Update post-op order status
 */
router.put(
    '/schedules/:id/post-op-orders/:orderIndex',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.updatePostOpOrderStatus
);

// ═══════════════════════════════════════════════════════════════════════════════
// INFECTION CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/infection-control
 * @desc    Add/update infection control record
 */
router.post(
    '/schedules/:id/infection-control',
    authorize('doctor', 'nurse', 'admin'),
    surgeryController.updateInfectionControl
);

/**
 * @route   GET /api/surgery/schedules/:id/infection-control
 * @desc    Get infection control record
 */
router.get('/schedules/:id/infection-control', surgeryController.getInfectionControl);

// ═══════════════════════════════════════════════════════════════════════════════
// OT BILLING INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/surgery/schedules/:id/generate-billing
 * @desc    Generate OT billing
 */
router.post(
    '/schedules/:id/generate-billing',
    authorize('admin', 'billing', 'doctor'),
    surgeryController.generateOTBilling
);

/**
 * @route   GET /api/surgery/schedules/:id/billing
 * @desc    Get OT billing for surgery
 */
router.get('/schedules/:id/billing', surgeryController.getOTBilling);

module.exports = router;
