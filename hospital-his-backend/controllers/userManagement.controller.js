/**
 * User Management Controller
 * Handles Admin workflows for user provisioning and RBAC
 * 
 * Security Features:
 * - Role hierarchy enforcement
 * - Break-glass management
 * - Password policies
 * - Account lockout
 * - Full audit trail
 */

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const userManagementService = require('../services/userManagement.service');
const { createAuditLog } = require('../services/audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// USER CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all users with filtering
 * @route   GET /api/admin/users
 */
exports.getAllUsers = asyncHandler(async (req, res, next) => {
    const {
        role,
        department,
        isActive,
        accountStatus,
        search,
        page = 1,
        limit = 20
    } = req.query;

    const query = {};

    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (accountStatus) query.accountStatus = accountStatus;
    if (search) {
        query.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { 'profile.firstName': { $regex: search, $options: 'i' } },
            { 'profile.lastName': { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
        User.find(query)
            .populate('department', 'name departmentCode')
            .populate('supervisor', 'username profile.firstName profile.lastName')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .select('-password -refreshToken -passwordHistory'),
        User.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        count: users.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        data: users,
    });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 */
exports.getUserById = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .populate('department', 'name departmentCode type')
        .populate('supervisor', 'username profile.firstName profile.lastName role')
        .populate('createdBy', 'username profile.firstName profile.lastName')
        .populate('deactivatedBy', 'username profile.firstName profile.lastName')
        .populate('breakGlassPermissions.grantedBy', 'username profile.firstName profile.lastName')
        .populate('roleHistory.changedBy', 'username')
        .select('-password -refreshToken -passwordHistory');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: user,
    });
});

/**
 * @desc    Create new user
 * @route   POST /api/admin/users
 * @security Privileged roles require confirmation
 */
exports.createUser = asyncHandler(async (req, res, next) => {
    try {
        const user = await userManagementService.createUser(req.body, req.user._id);

        res.status(201).json({
            success: true,
            message: user.temporaryPassword
                ? 'User created with temporary password. User must change on first login.'
                : 'User created successfully',
            data: user,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Update user profile
 * @route   PUT /api/admin/users/:id
 * @note    Role changes go through changeRole endpoint
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
    // Prevent password and role changes through this endpoint
    const { password, role, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).select('-password -refreshToken -passwordHistory');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'USER_UPDATE',
        entity: 'User',
        entityId: user._id,
        description: `Updated user profile: ${user.username}`,
        changes: updateData,
    });

    res.status(200).json({
        success: true,
        data: user,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Change user role
 * @route   PUT /api/admin/users/:id/role
 * @security Role hierarchy enforced
 */
exports.changeRole = asyncHandler(async (req, res, next) => {
    const { newRole, reason } = req.body;

    if (!newRole) {
        return next(new ErrorResponse('New role is required', 400));
    }
    if (!reason) {
        return next(new ErrorResponse('Reason for role change is required', 400));
    }

    try {
        const user = await userManagementService.changeUserRole(
            req.params.id,
            newRole,
            reason,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: `Role changed to ${newRole}. All sessions have been terminated.`,
            data: user,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Get user role history
 * @route   GET /api/admin/users/:id/role-history
 */
exports.getRoleHistory = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .populate('roleHistory.changedBy', 'username profile.firstName profile.lastName')
        .select('username roleHistory');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            username: user.username,
            currentRole: user.role,
            history: user.roleHistory.sort((a, b) => b.changedAt - a.changedAt),
        },
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Assign user to department
 * @route   PUT /api/admin/users/:id/department
 */
exports.assignDepartment = asyncHandler(async (req, res, next) => {
    const { departmentId } = req.body;

    if (!departmentId) {
        return next(new ErrorResponse('Department ID is required', 400));
    }

    try {
        const user = await userManagementService.assignDepartment(
            req.params.id,
            departmentId,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Department assigned successfully',
            data: user,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION / DEACTIVATION / SUSPENSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Deactivate user account
 * @route   POST /api/admin/users/:id/deactivate
 */
exports.deactivateUser = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Deactivation reason is required', 400));
    }

    try {
        const user = await userManagementService.deactivateUser(
            req.params.id,
            reason,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'User account deactivated. All sessions terminated.',
            data: { userId: user._id, username: user.username },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Reactivate user account
 * @route   POST /api/admin/users/:id/reactivate
 */
exports.reactivateUser = asyncHandler(async (req, res, next) => {
    try {
        const user = await userManagementService.reactivateUser(
            req.params.id,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'User account reactivated successfully',
            data: { userId: user._id, username: user.username },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Suspend user account temporarily
 * @route   POST /api/admin/users/:id/suspend
 */
exports.suspendUser = asyncHandler(async (req, res, next) => {
    const { reason, durationDays = 7 } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Suspension reason is required', 400));
    }

    try {
        const user = await userManagementService.suspendUser(
            req.params.id,
            reason,
            durationDays,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: `User account suspended for ${durationDays} days`,
            data: {
                userId: user._id,
                username: user.username,
                suspendedUntil: user.lockoutUntil,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Unlock user account
 * @route   POST /api/admin/users/:id/unlock
 */
exports.unlockUser = asyncHandler(async (req, res, next) => {
    try {
        const user = await userManagementService.unlockUser(
            req.params.id,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'User account unlocked successfully',
            data: { userId: user._id, username: user.username },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Admin reset user password
 * @route   POST /api/admin/users/:id/reset-password
 * @security Returns temporary password
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
    try {
        const result = await userManagementService.adminResetPassword(
            req.params.id,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. User must change on next login.',
            data: result,
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Force user to change password on next login
 * @route   POST /api/admin/users/:id/force-password-change
 */
exports.forcePasswordChange = asyncHandler(async (req, res, next) => {
    try {
        const user = await userManagementService.forcePasswordChange(
            req.params.id,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'User will be required to change password on next login',
            data: { userId: user._id, username: user.username },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK-GLASS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Grant break-glass access
 * @route   POST /api/admin/users/:id/break-glass/grant
 * @security Critical action - fully audited
 */
exports.grantBreakGlass = asyncHandler(async (req, res, next) => {
    const { accessLevel, reason, durationHours } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Reason for break-glass access is required', 400));
    }

    try {
        const user = await userManagementService.grantBreakGlass(
            req.params.id,
            accessLevel || 'view_only',
            reason,
            durationHours || 4,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: `Break-glass access granted (${accessLevel || 'view_only'})`,
            data: {
                userId: user._id,
                username: user.username,
                breakGlassPermissions: user.breakGlassPermissions,
            },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Revoke break-glass access
 * @route   POST /api/admin/users/:id/break-glass/revoke
 */
exports.revokeBreakGlass = asyncHandler(async (req, res, next) => {
    try {
        const user = await userManagementService.revokeBreakGlass(
            req.params.id,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: 'Break-glass access revoked',
            data: { userId: user._id, username: user.username },
        });
    } catch (error) {
        return next(new ErrorResponse(error.message, 400));
    }
});

/**
 * @desc    Get all users with active break-glass
 * @route   GET /api/admin/users/break-glass/active
 */
exports.getActiveBreakGlass = asyncHandler(async (req, res, next) => {
    const users = await userManagementService.getActiveBreakGlassUsers();

    res.status(200).json({
        success: true,
        count: users.length,
        data: users,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Bulk deactivate users
 * @route   POST /api/admin/users/bulk/deactivate
 */
exports.bulkDeactivate = asyncHandler(async (req, res, next) => {
    const { userIds, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return next(new ErrorResponse('User IDs array is required', 400));
    }
    if (!reason) {
        return next(new ErrorResponse('Deactivation reason is required', 400));
    }

    const results = {
        success: [],
        failed: [],
    };

    for (const userId of userIds) {
        try {
            await userManagementService.deactivateUser(userId, reason, req.user._id);
            results.success.push(userId);
        } catch (error) {
            results.failed.push({ userId, error: error.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `Deactivated ${results.success.length} users. ${results.failed.length} failed.`,
        data: results,
    });
});

/**
 * @desc    Terminate all sessions for a user
 * @route   POST /api/admin/users/:id/terminate-sessions
 */
exports.terminateSessions = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    user.activeSessions = [];
    await user.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'USER_SESSIONS_TERMINATE',
        entity: 'User',
        entityId: user._id,
        description: `Terminated all sessions for: ${user.username}`,
    });

    res.status(200).json({
        success: true,
        message: 'All user sessions terminated',
    });
});

module.exports = exports;
