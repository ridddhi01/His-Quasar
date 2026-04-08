const express = require('express');
const pharmacyController = require('../controllers/pharmacy.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../config/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================================
// INVENTORY MANAGEMENT
// ============================================================

/**
 * @route   GET /api/pharmacy/inventory
 * @desc    Get all pharmacy inventory items
 * @access  Admin, Pharmacist, Doctor
 */
router.get(
    '/inventory',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.DOCTOR),
    pharmacyController.getInventory
);

/**
 * @route   POST /api/pharmacy/inventory
 * @desc    Add medicine to inventory (Create Medicine if new, then add Batch)
 * @access  Admin, Pharmacist
 */
router.post(
    '/inventory',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.addMedicine
);

/**
 * @route   GET /api/pharmacy/batches/fefo/:medicineId
 * @desc    Get batches for a medicine in FEFO order
 * @access  Pharmacist, Doctor
 */
router.get(
    '/batches/fefo/:medicineId',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.DOCTOR),
    pharmacyController.getBatchesFEFO
);

/**
 * @route   GET /api/pharmacy/batches/expiring
 * @desc    Get batches expiring soon
 * @access  Admin, Pharmacist
 */
router.get(
    '/batches/expiring',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.getExpiringBatches
);

/**
 * @route   GET /api/pharmacy/batches/recalled
 * @desc    Get recalled batches
 * @access  Admin, Pharmacist
 */
router.get(
    '/batches/recalled',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.getRecalledBatches
);

// ============================================================
// SAFETY CHECKS
// ============================================================

/**
 * @route   POST /api/pharmacy/check-interactions
 * @desc    Check drug-drug interactions for a list of medicines
 * @access  Doctor, Pharmacist, Nurse
 */
router.post(
    '/check-interactions',
    authorize(USER_ROLES.DOCTOR, USER_ROLES.PHARMACIST, USER_ROLES.NURSE),
    pharmacyController.checkDrugInteractions
);

/**
 * @route   POST /api/pharmacy/validate-prescription/:prescriptionId
 * @desc    Run full safety validation on a prescription
 * @access  Doctor, Pharmacist
 */
router.post(
    '/validate-prescription/:prescriptionId',
    authorize(USER_ROLES.DOCTOR, USER_ROLES.PHARMACIST),
    pharmacyController.validatePrescriptionSafety
);

/**
 * @route   POST /api/pharmacy/override-interaction/:prescriptionId
 * @desc    Record doctor override for drug interaction
 * @access  Doctor only
 */
router.post(
    '/override-interaction/:prescriptionId',
    authorize(USER_ROLES.DOCTOR, USER_ROLES.PHARMACIST),
    pharmacyController.recordInteractionOverride
);

/**
 * @route   POST /api/pharmacy/pre-dispense-check
 * @desc    Comprehensive pre-dispense safety check
 * @access  Pharmacist
 */
router.post(
    '/pre-dispense-check',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.preDispenseCheck
);

// ============================================================
// DISPENSE
// ============================================================

/**
 * @route   GET /api/pharmacy/dispense-queue
 * @desc    Get prescriptions pending dispense
 * @access  Pharmacist
 */
router.get(
    '/dispense-queue',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.getDispenseQueue
);

/**
 * @route   POST /api/pharmacy/dispense
 * @desc    Dispense medicines with full safety checks
 * @access  Pharmacist
 */
router.post(
    '/dispense',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.dispenseWithSafetyChecks
);

/**
 * @route   GET /api/pharmacy/dispense/:id/traceability
 * @desc    Get full traceability for a dispense record
 * @access  Admin, Pharmacist, Compliance
 */
router.get(
    '/dispense/:id/traceability',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.COMPLIANCE),
    pharmacyController.getDispenseTraceability
);

// ============================================================
// DRUG RECALLS
// ============================================================

/**
 * @route   POST /api/pharmacy/recalls
 * @desc    Initiate a drug recall
 * @access  Admin, Pharmacist
 */
router.post(
    '/recalls',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.initiateRecall
);

/**
 * @route   GET /api/pharmacy/recalls
 * @desc    Get all recalls (with optional status filter)
 * @access  Admin, Pharmacist, Compliance
 */
router.get(
    '/recalls',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.COMPLIANCE),
    pharmacyController.getRecalls
);

/**
 * @route   GET /api/pharmacy/recalls/:id
 * @desc    Get recall details
 * @access  Admin, Pharmacist, Compliance
 */
router.get(
    '/recalls/:id',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.COMPLIANCE),
    pharmacyController.getRecallById
);

/**
 * @route   GET /api/pharmacy/recalls/:id/affected-patients
 * @desc    Get affected patients for a recall
 * @access  Admin, Pharmacist, Compliance
 */
router.get(
    '/recalls/:id/affected-patients',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.COMPLIANCE),
    pharmacyController.getAffectedPatients
);

/**
 * @route   POST /api/pharmacy/recalls/:id/notify
 * @desc    Send notifications for a recall
 * @access  Admin, Pharmacist
 */
router.post(
    '/recalls/:id/notify',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.notifyAffectedParties
);

/**
 * @route   POST /api/pharmacy/recalls/:id/resolve
 * @desc    Resolve/close a recall
 * @access  Admin, Pharmacist
 */
router.post(
    '/recalls/:id/resolve',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.resolveRecall
);

// ============================================================
// DRUG INTERACTIONS MASTER
// ============================================================

/**
 * @route   GET /api/pharmacy/interactions
 * @desc    Get all drug interactions in master
 * @access  Admin, Pharmacist, Doctor
 */
router.get(
    '/interactions',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST, USER_ROLES.DOCTOR),
    pharmacyController.getDrugInteractions
);

/**
 * @route   POST /api/pharmacy/interactions
 * @desc    Add a new drug interaction to master
 * @access  Admin, Pharmacist
 */
router.post(
    '/interactions',
    authorize(USER_ROLES.ADMIN, USER_ROLES.PHARMACIST),
    pharmacyController.addDrugInteraction
);

module.exports = router;
