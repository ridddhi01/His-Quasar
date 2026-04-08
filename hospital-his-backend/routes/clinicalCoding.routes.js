/**
 * Clinical Coding Routes
 * API endpoints for procedure codes and clinical coding records
 * With status-driven workflow and RBAC enforcement
 */

const express = require('express');
const router = express.Router();
const clinicalCodingController = require('../controllers/clinicalCoding.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, hasPermission } = require('../middleware/rbac.middleware');
const { auditLog, AUDIT_ACTIONS, RESOURCE_TYPES } = require('../middleware/audit.middleware');

// All routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE CODES (Master Data)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/clinical-coding/procedure-codes
 * @desc    Get all procedure codes (with search/filter)
 * @access  Admin, Senior Coder, Coder, Billing, Doctor
 */
router.get(
    '/procedure-codes',
    authorize('admin', 'senior_coder', 'coder', 'billing', 'doctor'),
    clinicalCodingController.getAllProcedureCodes
);

/**
 * @route   GET /api/v1/clinical-coding/procedure-codes/:id
 * @desc    Get single procedure code
 * @access  Admin, Senior Coder, Coder, Billing, Doctor
 */
router.get(
    '/procedure-codes/:id',
    authorize('admin', 'senior_coder', 'coder', 'billing', 'doctor'),
    clinicalCodingController.getProcedureCodeById
);

/**
 * @route   POST /api/v1/clinical-coding/procedure-codes
 * @desc    Create new procedure code
 * @access  Admin only
 */
router.post(
    '/procedure-codes',
    authorize('admin'),
    auditLog(AUDIT_ACTIONS.CREATE, RESOURCE_TYPES.PROCEDURE_CODE),
    clinicalCodingController.createProcedureCode
);

/**
 * @route   PUT /api/v1/clinical-coding/procedure-codes/:id
 * @desc    Update procedure code
 * @access  Admin only
 */
router.put(
    '/procedure-codes/:id',
    authorize('admin'),
    auditLog(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.PROCEDURE_CODE),
    clinicalCodingController.updateProcedureCode
);

/**
 * @route   DELETE /api/v1/clinical-coding/procedure-codes/:id
 * @desc    Deactivate procedure code
 * @access  Admin only
 */
router.delete(
    '/procedure-codes/:id',
    authorize('admin'),
    auditLog(AUDIT_ACTIONS.DELETE, RESOURCE_TYPES.PROCEDURE_CODE),
    clinicalCodingController.deleteProcedureCode
);

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL CODING RECORDS - READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/clinical-coding/dashboard
 * @desc    Get coding dashboard stats
 * @access  Admin, Senior Coder, Coder, Billing
 */
router.get(
    '/dashboard',
    authorize('admin', 'senior_coder', 'coder', 'billing'),
    clinicalCodingController.getDashboard
);

/**
 * @route   GET /api/v1/clinical-coding/pending-review
 * @desc    Get records pending review (for review panel)
 * @access  Admin, Senior Coder
 */
router.get(
    '/pending-review',
    authorize('admin', 'senior_coder'),
    clinicalCodingController.getPendingReview
);

/**
 * @route   GET /api/v1/clinical-coding/records
 * @desc    Get all coding records (with filters)
 * @access  Admin, Senior Coder, Coder, Billing, Doctor
 */
router.get(
    '/records',
    authorize('admin', 'senior_coder', 'coder', 'billing', 'doctor'),
    clinicalCodingController.getCodingRecords
);

/**
 * @route   GET /api/v1/clinical-coding/records/:id
 * @desc    Get single coding record
 * @access  Admin, Senior Coder, Coder, Billing, Doctor
 */
router.get(
    '/records/:id',
    authorize('admin', 'senior_coder', 'coder', 'billing', 'doctor'),
    clinicalCodingController.getCodingRecordById
);

/**
 * @route   GET /api/v1/clinical-coding/records/:id/transitions
 * @desc    Get allowed status transitions for a record
 * @access  Admin, Senior Coder, Coder, Billing
 */
router.get(
    '/records/:id/transitions',
    authorize('admin', 'senior_coder', 'coder', 'billing'),
    clinicalCodingController.getTransitions
);

/**
 * @route   GET /api/v1/clinical-coding/records/:id/audit
 * @desc    Get coding record audit trail
 * @access  Admin, Senior Coder, Coder, Billing
 */
router.get(
    '/records/:id/audit',
    authorize('admin', 'senior_coder', 'coder', 'billing'),
    clinicalCodingController.getRecordAudit
);

/**
 * @route   GET /api/v1/clinical-coding/encounter/:encounterId
 * @desc    Get coding record by encounter ID
 * @access  All clinical roles
 */
router.get(
    '/encounter/:encounterId',
    authorize('admin', 'senior_coder', 'coder', 'billing', 'doctor', 'nurse'),
    clinicalCodingController.getCodingByEncounter
);

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL CODING RECORDS - CODER OPERATIONS (Edit codes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   PUT /api/v1/clinical-coding/records/:id
 * @desc    Update coding record (notes, diagnosis codes)
 * @access  Admin, Senior Coder, Coder
 */
router.put(
    '/records/:id',
    authorize('admin', 'senior_coder', 'coder'),
    auditLog(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.updateCodingRecord
);

/**
 * @route   POST /api/v1/clinical-coding/records/:id/codes
 * @desc    Add procedure codes to record
 * @access  Admin, Senior Coder, Coder (only when in editable state)
 */
router.post(
    '/records/:id/codes',
    authorize('admin', 'senior_coder', 'coder'),
    auditLog(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.addCodesToRecord
);

/**
 * @route   DELETE /api/v1/clinical-coding/records/:id/codes/:codeId
 * @desc    Remove procedure code from record
 * @access  Admin, Senior Coder, Coder (only when in editable state)
 */
router.delete(
    '/records/:id/codes/:codeId',
    authorize('admin', 'senior_coder', 'coder'),
    auditLog(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.removeCodeFromRecord
);

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/clinical-coding/records/:id/start
 * @desc    Start coding (awaiting-coding → in-progress)
 * @access  Admin, Senior Coder, Coder
 */
router.post(
    '/records/:id/start',
    authorize('admin', 'senior_coder', 'coder'),
    auditLog(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.startCoding
);

/**
 * @route   POST /api/v1/clinical-coding/records/:id/submit
 * @desc    Submit coding for review (in-progress/returned → pending-review)
 * @access  Admin, Senior Coder, Coder
 */
router.post(
    '/records/:id/submit',
    authorize('admin', 'senior_coder', 'coder'),
    auditLog(AUDIT_ACTIONS.UPDATE, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.submitForReview
);

/**
 * @route   POST /api/v1/clinical-coding/records/:id/approve
 * @desc    Approve coding (pending-review → approved)
 * @access  Admin, Senior Coder ONLY
 */
router.post(
    '/records/:id/approve',
    authorize('admin', 'senior_coder'),
    auditLog(AUDIT_ACTIONS.APPROVE, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.approveCoding
);

/**
 * @route   POST /api/v1/clinical-coding/records/:id/return
 * @desc    Return coding for correction (pending-review → returned)
 * @access  Admin, Senior Coder ONLY
 * @body    { reason: string } - REQUIRED
 */
router.post(
    '/records/:id/return',
    authorize('admin', 'senior_coder'),
    auditLog(AUDIT_ACTIONS.REJECT, RESOURCE_TYPES.CLINICAL_CODING),
    clinicalCodingController.returnForCorrection
);

module.exports = router;
