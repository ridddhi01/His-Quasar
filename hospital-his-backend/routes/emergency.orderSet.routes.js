/**
 * Emergency Order Set Routes
 * Routes for emergency order set (bundle) operations
 */

const express = require('express');
const router = express.Router();
const emergencyOrderSetController = require('../controllers/emergency.orderSet.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

// =====================================================
// ORDER SET (BUNDLE) ROUTES
// =====================================================

/**
 * @route   GET /api/emergency/order-sets
 * @desc    Get available emergency order sets (bundles)
 */
router.get(
    '/order-sets',
    authorize('doctor', 'nurse', 'admin'),
    emergencyOrderSetController.getAvailableBundles
);

/**
 * @route   GET /api/emergency/order-sets/trauma/:level
 * @desc    Get trauma bundle by level (1, 2, or 3)
 */
router.get(
    '/order-sets/trauma/:level',
    authorize('doctor', 'admin'),
    emergencyOrderSetController.getTraumaBundleByLevel
);

// =====================================================
// CASE-SPECIFIC BUNDLE ROUTES
// =====================================================

/**
 * @route   POST /api/emergency/cases/:id/apply-bundle
 * @desc    Apply order set bundle to emergency case (Doctor only)
 */
router.post(
    '/cases/:id/apply-bundle',
    authorize('doctor', 'admin'),
    emergencyOrderSetController.applyBundle
);

/**
 * @route   GET /api/emergency/cases/:id/bundles
 * @desc    Get applied bundles for an emergency case
 */
router.get(
    '/cases/:id/bundles',
    authorize('doctor', 'nurse', 'admin'),
    emergencyOrderSetController.getAppliedBundles
);

// =====================================================
// NURSING ROUTES
// =====================================================

/**
 * @route   POST /api/emergency/cases/:id/nursing-notes
 * @desc    Add nursing note to emergency case
 */
router.post(
    '/cases/:id/nursing-notes',
    authorize('nurse', 'doctor', 'admin'),
    emergencyOrderSetController.addNursingNote
);

/**
 * @route   POST /api/emergency/cases/:id/ready-for-doctor
 * @desc    Mark patient ready for doctor (Nurse only)
 */
router.post(
    '/cases/:id/ready-for-doctor',
    authorize('nurse', 'admin'),
    emergencyOrderSetController.markReadyForDoctor
);

// =====================================================
// EMERGENCY TAG & DISPOSITION ROUTES
// =====================================================

/**
 * @route   POST /api/emergency/cases/:id/set-tag
 * @desc    Set emergency tag (cardiac, stroke, trauma, etc.)
 */
router.post(
    '/cases/:id/set-tag',
    authorize('doctor', 'admin'),
    emergencyOrderSetController.setEmergencyTag
);

/**
 * @route   POST /api/emergency/cases/:id/disposition
 * @desc    Process disposition (IPD/ICU/OT transfer or discharge)
 */
router.post(
    '/cases/:id/disposition',
    authorize('doctor', 'admin'),
    emergencyOrderSetController.processDisposition
);

module.exports = router;
