/**
 * Admin Routes
 * All routes are protected: Admin role only
 * 
 * Organized into three categories:
 * 1. CONFIG ROUTES - Master data management
 * 2. AUDIT ROUTES - Read-only audit access
 * 3. GOVERNANCE ROUTES - System configuration
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, auditAdminAction } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE - All admin routes require authentication + admin role
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/dashboard', adminController.getDashboard);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ROUTES - User Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering
 * @access  Admin only
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin only
 */
router.post(
    '/users',
    auditAdminAction('USER_CREATE', 'User'),
    adminController.createUser
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin only
 */
router.put(
    '/users/:id',
    auditAdminAction('USER_UPDATE', 'User'),
    adminController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Deactivate user (soft delete)
 * @access  Admin only
 */
router.delete(
    '/users/:id',
    auditAdminAction('USER_DELETE', 'User'),
    adminController.deleteUser
);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin only
 */
router.post(
    '/users/:id/reset-password',
    auditAdminAction('USER_PASSWORD_RESET', 'User'),
    adminController.resetUserPassword
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ROUTES - Department Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/departments
 * @desc    Get all departments
 * @access  Admin only
 */
router.get('/departments', adminController.getDepartments);

/**
 * @route   POST /api/admin/departments
 * @desc    Create department
 * @access  Admin only
 */
router.post(
    '/departments',
    auditAdminAction('DEPARTMENT_CREATE', 'Department'),
    adminController.createDepartment
);

/**
 * @route   PUT /api/admin/departments/:id
 * @desc    Update department
 * @access  Admin only
 */
router.put(
    '/departments/:id',
    auditAdminAction('DEPARTMENT_UPDATE', 'Department'),
    adminController.updateDepartment
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ROUTES - Tariff Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/tariffs
 * @desc    Get all tariffs
 * @access  Admin only
 */
router.get('/tariffs', adminController.getTariffs);

/**
 * @route   POST /api/admin/tariffs
 * @desc    Create tariff
 * @access  Admin only
 */
router.post(
    '/tariffs',
    auditAdminAction('TARIFF_CREATE', 'Tariff'),
    adminController.createTariff
);

/**
 * @route   PUT /api/admin/tariffs/:id
 * @desc    Update tariff
 * @access  Admin only
 */
router.put(
    '/tariffs/:id',
    auditAdminAction('TARIFF_UPDATE', 'Tariff'),
    adminController.updateTariff
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ROUTES - Read-Only Access
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Admin only (READ-ONLY)
 */
router.get('/audit-logs', adminController.getAuditLogs);

/**
 * @route   GET /api/admin/audit-summary
 * @desc    Get audit summary statistics
 * @access  Admin only (READ-ONLY)
 */
router.get('/audit-summary', adminController.getAuditSummary);

/**
 * @route   GET /api/admin/compliance-reports
 * @desc    Get compliance reports
 * @access  Admin only (READ-ONLY)
 */
router.get('/compliance-reports', adminController.getComplianceReports);

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE ROUTES - System Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/system-config
 * @desc    Get system configuration
 * @access  Admin only
 */
router.get('/system-config', adminController.getSystemConfig);

/**
 * @route   PUT /api/admin/system-config
 * @desc    Update single system configuration
 * @access  Admin only
 */
router.put(
    '/system-config',
    auditAdminAction('SYSTEM_CONFIG_UPDATE', 'SystemConfig'),
    adminController.updateSystemConfig
);

/**
 * @route   PUT /api/admin/system-config/bulk
 * @desc    Bulk update system configurations
 * @access  Admin only
 */
router.put(
    '/system-config/bulk',
    auditAdminAction('SYSTEM_CONFIG_BULK_UPDATE', 'SystemConfig'),
    adminController.bulkUpdateSystemConfig
);

/**
 * @route   POST /api/admin/system-config/initialize
 * @desc    Initialize default configurations
 * @access  Admin only
 */
router.post(
    '/system-config/initialize',
    auditAdminAction('SYSTEM_CONFIG_INITIALIZE', 'SystemConfig'),
    adminController.initializeSystemConfig
);

/**
 * @route   POST /api/admin/backup
 * @desc    Create system backup
 * @access  Admin only
 */
router.post(
    '/backup',
    auditAdminAction('SYSTEM_BACKUP', 'System'),
    adminController.createBackup
);

/**
 * @route   POST /api/admin/restore
 * @desc    Restore from backup
 * @access  Admin only
 */
router.post(
    '/restore',
    auditAdminAction('SYSTEM_RESTORE', 'System'),
    adminController.restoreBackup
);

module.exports = router;
