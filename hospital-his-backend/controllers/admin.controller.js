/**
 * Admin Controller
 * Handles all administrative operations
 * 
 * Organized into three categories:
 * 1. CONFIG ACTIONS - Master data management (Users, Departments, Tariffs)
 * 2. AUDIT ACTIONS - Read-only audit & compliance
 * 3. GOVERNANCE ACTIONS - System configuration & oversight
 */

const User = require('../models/User');
const Department = require('../models/Department');
const Tariff = require('../models/Tariff');
const Ward = require('../models/Ward');
const SystemConfig = require('../models/SystemConfig');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const adminService = require('../services/admin.service');
const { createAuditLog } = require('../services/audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ACTIONS - User Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all users with filtering
 * @route   GET /api/admin/users
 * @access  Admin only
 */
exports.getAllUsers = asyncHandler(async (req, res, next) => {
    const { role, isActive, department, page = 1, limit = 20 } = req.query;

    const { users, total } = await adminService.getUsers({
        role,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        department,
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        count: users.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: users,
    });
});

/**
 * @desc    Create new user
 * @route   POST /api/admin/users
 * @access  Admin only
 */
exports.createUser = asyncHandler(async (req, res, next) => {
    const user = await adminService.createUser(req.body, req.user._id);

    res.status(201).json({
        success: true,
        data: user,
    });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Admin only
 */
exports.getUserById = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .populate('department')
        .select('-password');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: user,
    });
});

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Admin only
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
    const user = await adminService.updateUser(req.params.id, req.body, req.user._id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: user,
    });
});

/**
 * @desc    Deactivate user (soft delete)
 * @route   DELETE /api/admin/users/:id
 * @access  Admin only
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const user = await adminService.deactivateUser(req.params.id, req.user._id);

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
    });
});

/**
 * @desc    Reset user password (Admin-initiated)
 * @route   POST /api/admin/users/:id/reset-password
 * @access  Admin only
 */
exports.resetUserPassword = asyncHandler(async (req, res, next) => {
    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    user.password = newPassword;
    await user.save();

    await createAuditLog({
        user: req.user._id,
        action: 'USER_PASSWORD_RESET',
        entity: 'User',
        entityId: user._id,
        description: `Admin reset password for user: ${user.username}`,
    });

    res.status(200).json({
        success: true,
        message: 'Password reset successfully',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ACTIONS - Department Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all departments
 * @route   GET /api/admin/departments
 * @access  Admin only
 */
exports.getDepartments = asyncHandler(async (req, res, next) => {
    const departments = await Department.find()
        .populate('head', 'profile.firstName profile.lastName')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: departments.length,
        data: departments,
    });
});

/**
 * @desc    Create department
 * @route   POST /api/admin/departments
 * @access  Admin only
 */
exports.createDepartment = asyncHandler(async (req, res, next) => {
    const department = await adminService.upsertDepartment(req.body, req.user._id);

    res.status(201).json({
        success: true,
        data: department,
    });
});

/**
 * @desc    Update department
 * @route   PUT /api/admin/departments/:id
 * @access  Admin only
 */
exports.updateDepartment = asyncHandler(async (req, res, next) => {
    const department = await adminService.upsertDepartment(
        { _id: req.params.id, ...req.body },
        req.user._id
    );

    res.status(200).json({
        success: true,
        data: department,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ACTIONS - Tariff Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all tariffs
 * @route   GET /api/admin/tariffs
 * @access  Admin only
 */
exports.getTariffs = asyncHandler(async (req, res, next) => {
    const { category } = req.query;
    const query = category ? { category } : {};

    const tariffs = await Tariff.find(query)
        .populate('category', 'name')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: tariffs.length,
        data: tariffs,
    });
});

/**
 * @desc    Create tariff
 * @route   POST /api/admin/tariffs
 * @access  Admin only
 */
exports.createTariff = asyncHandler(async (req, res, next) => {
    const tariff = await adminService.upsertTariff(req.body, req.user._id);

    res.status(201).json({
        success: true,
        data: tariff,
    });
});

/**
 * @desc    Update tariff
 * @route   PUT /api/admin/tariffs/:id
 * @access  Admin only
 */
exports.updateTariff = asyncHandler(async (req, res, next) => {
    const tariff = await adminService.upsertTariff(
        { _id: req.params.id, ...req.body },
        req.user._id
    );

    res.status(200).json({
        success: true,
        data: tariff,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ACTIONS - Read-Only Access
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get audit logs with filtering
 * @route   GET /api/admin/audit-logs
 * @access  Admin only (READ-ONLY)
 */
exports.getAuditLogs = asyncHandler(async (req, res, next) => {
    const { user, action, entity, startDate, endDate, page = 1, limit = 50 } = req.query;

    const { logs, total } = await adminService.getAuditLogs({
        user,
        action,
        entity,
        startDate,
        endDate,
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        count: logs.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: logs,
    });
});

/**
 * @desc    Get audit summary
 * @route   GET /api/admin/audit-summary
 * @access  Admin only (READ-ONLY)
 */
exports.getAuditSummary = asyncHandler(async (req, res, next) => {
    const { days = 7 } = req.query;

    const summary = await adminService.getAuditSummary(parseInt(days));

    res.status(200).json({
        success: true,
        data: summary,
    });
});

/**
 * @desc    Get compliance reports
 * @route   GET /api/admin/compliance-reports
 * @access  Admin only (READ-ONLY)
 */
exports.getComplianceReports = asyncHandler(async (req, res, next) => {
    // Aggregate compliance metrics
    const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalAuditLogs,
        recentBreakGlass,
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        AuditLog.countDocuments(),
        AuditLog.countDocuments({
            action: 'BREAK_GLASS_ACCESS',
            timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
            },
            audit: {
                totalLogs: totalAuditLogs,
                breakGlassLast30Days: recentBreakGlass,
            },
            generatedAt: new Date(),
        },
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE ACTIONS - System Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get system configuration
 * @route   GET /api/admin/system-config
 * @access  Admin only
 */
exports.getSystemConfig = asyncHandler(async (req, res, next) => {
    const { category } = req.query;

    const configs = await adminService.getSystemConfig(category);

    res.status(200).json({
        success: true,
        data: configs,
    });
});

/**
 * @desc    Update system configuration
 * @route   PUT /api/admin/system-config
 * @access  Admin only
 */
exports.updateSystemConfig = asyncHandler(async (req, res, next) => {
    const { key, value } = req.body;

    if (!key) {
        return next(new ErrorResponse('Configuration key is required', 400));
    }

    const config = await adminService.updateSystemConfig(key, value, req.user._id);

    res.status(200).json({
        success: true,
        data: config,
    });
});

/**
 * @desc    Bulk update system configurations
 * @route   PUT /api/admin/system-config/bulk
 * @access  Admin only
 */
exports.bulkUpdateSystemConfig = asyncHandler(async (req, res, next) => {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
        return next(new ErrorResponse('Configs array is required', 400));
    }

    const results = await adminService.bulkUpdateSystemConfig(configs, req.user._id);

    res.status(200).json({
        success: true,
        count: results.length,
        data: results,
    });
});

/**
 * @desc    Initialize default configurations
 * @route   POST /api/admin/system-config/initialize
 * @access  Admin only
 */
exports.initializeSystemConfig = asyncHandler(async (req, res, next) => {
    const result = await adminService.initializeDefaultConfigs(req.user._id);

    res.status(200).json({
        success: true,
        message: 'Default configurations initialized',
        data: result,
    });
});

/**
 * @desc    Create system backup
 * @route   POST /api/admin/backup
 * @access  Admin only
 */
exports.createBackup = asyncHandler(async (req, res, next) => {
    const backupId = `BKP${Date.now()}`;

    await createAuditLog({
        user: req.user._id,
        action: 'SYSTEM_BACKUP_CREATE',
        entity: 'System',
        description: `Backup initiated: ${backupId}`,
    });

    // TODO: Implement actual backup logic (MongoDB dump, S3 upload, etc.)

    res.status(200).json({
        success: true,
        message: 'Backup initiated',
        data: {
            backupId,
            status: 'processing',
            initiatedAt: new Date(),
        },
    });
});

/**
 * @desc    Restore from backup
 * @route   POST /api/admin/restore
 * @access  Admin only
 */
exports.restoreBackup = asyncHandler(async (req, res, next) => {
    const { backupId } = req.body;

    if (!backupId) {
        return next(new ErrorResponse('Backup ID is required', 400));
    }

    await createAuditLog({
        user: req.user._id,
        action: 'SYSTEM_BACKUP_RESTORE',
        entity: 'System',
        description: `Restore initiated from backup: ${backupId}`,
    });

    // TODO: Implement actual restore logic

    res.status(200).json({
        success: true,
        message: 'Restore initiated',
        data: {
            backupId,
            status: 'processing',
        },
    });
});

/**
 * @desc    Get dashboard statistics for Admin
 * @route   GET /api/admin/dashboard
 * @access  Admin only
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const [
        usersByRole,
        departmentCount,
        recentAuditLogs,
        systemHealth,
    ] = await Promise.all([
        User.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
        Department.countDocuments(),
        AuditLog.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('user', 'username role'),
        SystemConfig.find({ category: 'backup' }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            users: {
                byRole: usersByRole.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
            },
            departments: departmentCount,
            recentActivity: recentAuditLogs,
            system: {
                status: 'healthy',
                lastBackup: systemHealth.find(c => c.key === 'last_backup')?.value,
            },
        },
    });
});

module.exports = exports;
