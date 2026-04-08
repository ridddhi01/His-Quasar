/**
 * Break-Glass Routes
 * Emergency access management
 * 
 * Two route groups:
 * 1. /api/break-glass/* - Clinical user endpoints
 * 2. /api/admin/break-glass/* - Admin oversight endpoints
 */

const express = require('express');
const router = express.Router();
const breakGlassController = require('../controllers/breakGlass.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, auditAdminAction } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL USER ROUTES (/api/break-glass/*)
// ═══════════════════════════════════════════════════════════════════════════════

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/break-glass/request
 * @desc    Request break-glass access (pending admin approval)
 * @access  Clinical roles (doctor, nurse, pharmacist, lab_tech, radiologist)
 */
router.post(
    '/request',
    authorize('doctor', 'nurse', 'pharmacist', 'lab_tech', 'radiologist'),
    breakGlassController.requestBreakGlass
);

/**
 * @route   POST /api/break-glass/activate
 * @desc    Self-activate break-glass (immediate emergency)
 * @access  Clinical roles
 */
router.post(
    '/activate',
    authorize('doctor', 'nurse', 'pharmacist', 'lab_tech', 'radiologist'),
    breakGlassController.selfActivate
);

/**
 * @route   GET /api/break-glass/status
 * @desc    Check current break-glass status
 * @access  Authenticated users
 */
router.get('/status', breakGlassController.checkStatus);

/**
 * @route   GET /api/break-glass/history
 * @desc    Get my break-glass history
 * @access  Authenticated users
 */
router.get('/history', breakGlassController.getMyHistory);

module.exports = router;
