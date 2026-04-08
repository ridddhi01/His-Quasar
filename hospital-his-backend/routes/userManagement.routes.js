/**
 * User Management Routes
 * Admin-only routes for user provisioning and RBAC management
 * 
 * All routes require: authenticate + authorize('admin')
 * All modifications are audit logged
 */

const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagement.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, auditAdminAction } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK-GLASS MONITORING (Must be before /:id routes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/users/break-glass/active
 * @desc    Get all users with active break-glass access
 */
router.get('/break-glass/active', userManagementController.getActiveBreakGlass);

// ═══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS (Must be before /:id routes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/users/bulk/deactivate
 * @desc    Bulk deactivate users
 */
router.post(
    '/bulk/deactivate',
    auditAdminAction('USER_BULK_DEACTIVATE', 'User'),
    userManagementController.bulkDeactivate
);

// ═══════════════════════════════════════════════════════════════════════════════
// USER CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering
 */
router.get('/', userManagementController.getAllUsers);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 */
router.post(
    '/',
    auditAdminAction('USER_CREATE', 'User'),
    userManagementController.createUser
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 */
router.get('/:id', userManagementController.getUserById);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user profile
 */
router.put(
    '/:id',
    auditAdminAction('USER_UPDATE', 'User'),
    userManagementController.updateUser
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Change user role
 */
router.put(
    '/:id/role',
    auditAdminAction('USER_ROLE_CHANGE', 'User'),
    userManagementController.changeRole
);

/**
 * @route   GET /api/admin/users/:id/role-history
 * @desc    Get user role history
 */
router.get('/:id/role-history', userManagementController.getRoleHistory);

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   PUT /api/admin/users/:id/department
 * @desc    Assign user to department
 */
router.put(
    '/:id/department',
    auditAdminAction('USER_DEPARTMENT_CHANGE', 'User'),
    userManagementController.assignDepartment
);

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION / DEACTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/users/:id/deactivate
 * @desc    Deactivate user account
 */
router.post(
    '/:id/deactivate',
    auditAdminAction('USER_DEACTIVATE', 'User'),
    userManagementController.deactivateUser
);

/**
 * @route   POST /api/admin/users/:id/reactivate
 * @desc    Reactivate user account
 */
router.post(
    '/:id/reactivate',
    auditAdminAction('USER_REACTIVATE', 'User'),
    userManagementController.reactivateUser
);

/**
 * @route   POST /api/admin/users/:id/suspend
 * @desc    Suspend user account temporarily
 */
router.post(
    '/:id/suspend',
    auditAdminAction('USER_SUSPEND', 'User'),
    userManagementController.suspendUser
);

/**
 * @route   POST /api/admin/users/:id/unlock
 * @desc    Unlock locked user account
 */
router.post(
    '/:id/unlock',
    auditAdminAction('USER_UNLOCK', 'User'),
    userManagementController.unlockUser
);

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Admin reset user password
 */
router.post(
    '/:id/reset-password',
    auditAdminAction('USER_PASSWORD_RESET', 'User'),
    userManagementController.resetPassword
);

/**
 * @route   POST /api/admin/users/:id/force-password-change
 * @desc    Force password change on next login
 */
router.post(
    '/:id/force-password-change',
    auditAdminAction('USER_FORCE_PASSWORD_CHANGE', 'User'),
    userManagementController.forcePasswordChange
);

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK-GLASS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/users/:id/break-glass/grant
 * @desc    Grant break-glass access
 */
router.post(
    '/:id/break-glass/grant',
    auditAdminAction('BREAK_GLASS_GRANT', 'User'),
    userManagementController.grantBreakGlass
);

/**
 * @route   POST /api/admin/users/:id/break-glass/revoke
 * @desc    Revoke break-glass access
 */
router.post(
    '/:id/break-glass/revoke',
    auditAdminAction('BREAK_GLASS_REVOKE', 'User'),
    userManagementController.revokeBreakGlass
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/admin/users/:id/terminate-sessions
 * @desc    Terminate all sessions for a user
 */
router.post(
    '/:id/terminate-sessions',
    auditAdminAction('USER_SESSIONS_TERMINATE', 'User'),
    userManagementController.terminateSessions
);

module.exports = router;
