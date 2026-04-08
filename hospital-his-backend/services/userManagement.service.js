/**
 * User Management Service
 * Comprehensive user provisioning and RBAC management
 * 
 * Features:
 * - User creation with validation
 * - Role assignment with impact handling
 * - Department mapping
 * - Activation/Deactivation
 * - Password reset & security
 * - Break-glass permission management
 * - Audit trail
 */

const User = require('../models/User');
const Department = require('../models/Department');
const { createAuditLog } = require('./audit.service');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PASSWORD_EXPIRY_DAYS = 90;
const PASSWORD_HISTORY_COUNT = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const BREAK_GLASS_DEFAULT_HOURS = 4;

// Roles that require special authorization to create
const PRIVILEGED_ROLES = ['admin', 'compliance'];

// Role hierarchy for validation (lower number = higher privilege)
const ROLE_HIERARCHY = {
    admin: 1,
    compliance: 2,
    doctor: 3,
    nurse: 4,
    pharmacist: 4,
    lab_tech: 4,
    radiologist: 4,
    billing: 5,
    insurance: 5,
    receptionist: 6,
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new user with full validation
 * @param {Object} userData - User data
 * @param {ObjectId} adminId - Admin performing the action
 * @returns {Object} Created user
 */
exports.createUser = async (userData, adminId) => {
    // Security Check: Prevent creating privileged roles without explicit confirmation
    if (PRIVILEGED_ROLES.includes(userData.role)) {
        if (!userData.confirmPrivilegedCreation) {
            throw new Error(
                `Creating ${userData.role} role requires explicit confirmation. Set confirmPrivilegedCreation: true`
            );
        }
    }

    // Validate department exists if provided
    if (userData.department) {
        const dept = await Department.findById(userData.department);
        if (!dept) {
            throw new Error('Department not found');
        }
        if (!dept.isActive) {
            throw new Error('Cannot assign user to inactive department');
        }
    }

    // Validate supervisor exists if provided
    if (userData.supervisor) {
        const supervisor = await User.findById(userData.supervisor);
        if (!supervisor) {
            throw new Error('Supervisor not found');
        }
        if (!supervisor.isActive) {
            throw new Error('Cannot assign inactive user as supervisor');
        }
    }

    // Generate temporary password if not provided
    const tempPassword = userData.password || generateSecurePassword();
    const mustChangePassword = !userData.password;

    // Set password expiry
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + PASSWORD_EXPIRY_DAYS);

    // Create user
    const user = await User.create({
        ...userData,
        password: tempPassword,
        mustChangePassword,
        passwordExpiresAt,
        passwordChangedAt: new Date(),
        accountStatus: 'active',
        createdBy: adminId,
    });

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_CREATE',
        entity: 'User',
        entityId: user._id,
        description: `Created user: ${user.username} (${user.role})`,
        changes: {
            username: user.username,
            email: user.email,
            role: user.role,
            department: user.department,
        },
    });

    // Return user without password (and include temp password if generated)
    const userResponse = user.toObject();
    delete userResponse.password;
    if (mustChangePassword) {
        userResponse.temporaryPassword = tempPassword;
    }

    return userResponse;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Change user role with impact handling
 * @param {ObjectId} userId - Target user ID
 * @param {String} newRole - New role to assign
 * @param {String} reason - Reason for role change
 * @param {ObjectId} adminId - Admin performing the action
 */
exports.changeUserRole = async (userId, newRole, reason, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const previousRole = user.role;

    // Cannot change own role
    if (userId.toString() === adminId.toString()) {
        throw new Error('Cannot change your own role');
    }

    // Validate role change authorization
    const adminUser = await User.findById(adminId);
    const adminLevel = ROLE_HIERARCHY[adminUser.role] || 99;
    const targetCurrentLevel = ROLE_HIERARCHY[previousRole] || 99;
    const targetNewLevel = ROLE_HIERARCHY[newRole] || 99;

    // Admin cannot promote to higher privilege than themselves
    if (targetNewLevel < adminLevel) {
        throw new Error(
            `Cannot assign role '${newRole}' - requires higher privilege than your role`
        );
    }

    // Cannot demote users with higher privilege
    if (targetCurrentLevel < adminLevel) {
        throw new Error(
            `Cannot modify role of user with higher privilege than yourself`
        );
    }

    // Record role history
    user.roleHistory.push({
        previousRole,
        newRole,
        changedAt: new Date(),
        changedBy: adminId,
        reason,
    });

    user.role = newRole;
    await user.save();

    // Handle role change impact
    await handleRoleChangeImpact(user, previousRole, newRole);

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_ROLE_CHANGE',
        entity: 'User',
        entityId: user._id,
        description: `Changed role from ${previousRole} to ${newRole}: ${user.username}`,
        changes: {
            previousRole,
            newRole,
            reason,
        },
    });

    return user;
};

/**
 * Handle side effects of role change
 */
async function handleRoleChangeImpact(user, oldRole, newRole) {
    // Revoke break-glass if demoting from clinical role
    const clinicalRoles = ['doctor', 'nurse', 'pharmacist', 'lab_tech', 'radiologist'];
    if (clinicalRoles.includes(oldRole) && !clinicalRoles.includes(newRole)) {
        if (user.breakGlassPermissions?.enabled) {
            user.breakGlassPermissions.enabled = false;
            await user.save();
        }
    }

    // Clear temporary permissions on role change
    user.temporaryPermissions = [];
    await user.save();

    // Invalidate all active sessions on role change (security)
    user.activeSessions = [];
    await user.save();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assign user to department
 */
exports.assignDepartment = async (userId, departmentId, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const department = await Department.findById(departmentId);
    if (!department) {
        throw new Error('Department not found');
    }
    if (!department.isActive) {
        throw new Error('Cannot assign user to inactive department');
    }

    const previousDepartment = user.department;
    user.department = departmentId;
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_DEPARTMENT_CHANGE',
        entity: 'User',
        entityId: user._id,
        description: `Changed department for ${user.username} to ${department.name}`,
        changes: {
            previousDepartment,
            newDepartment: departmentId,
        },
    });

    return user;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION / DEACTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deactivate user account
 */
exports.deactivateUser = async (userId, reason, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Cannot deactivate self
    if (userId.toString() === adminId.toString()) {
        throw new Error('Cannot deactivate your own account');
    }

    // Cannot deactivate the only admin
    if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
        if (adminCount <= 1) {
            throw new Error('Cannot deactivate the only admin account');
        }
    }

    user.isActive = false;
    user.accountStatus = 'deactivated';
    user.deactivatedAt = new Date();
    user.deactivatedBy = adminId;
    user.deactivationReason = reason;
    user.activeSessions = []; // Terminate all sessions
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_DEACTIVATE',
        entity: 'User',
        entityId: user._id,
        description: `Deactivated user: ${user.username}`,
        changes: {
            reason,
            deactivatedAt: user.deactivatedAt,
        },
    });

    return user;
};

/**
 * Reactivate user account
 */
exports.reactivateUser = async (userId, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    user.isActive = true;
    user.accountStatus = 'active';
    user.deactivatedAt = null;
    user.deactivatedBy = null;
    user.deactivationReason = null;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_REACTIVATE',
        entity: 'User',
        entityId: user._id,
        description: `Reactivated user: ${user.username}`,
    });

    return user;
};

/**
 * Suspend user account (temporary)
 */
exports.suspendUser = async (userId, reason, durationDays, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + durationDays);

    user.accountStatus = 'suspended';
    user.lockoutUntil = suspendUntil;
    user.activeSessions = [];
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_SUSPEND',
        entity: 'User',
        entityId: user._id,
        description: `Suspended user: ${user.username} until ${suspendUntil.toISOString()}`,
        changes: {
            reason,
            suspendUntil,
        },
    });

    return user;
};

/**
 * Unlock user account
 */
exports.unlockUser = async (userId, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    user.accountStatus = 'active';
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_UNLOCK',
        entity: 'User',
        entityId: user._id,
        description: `Unlocked user account: ${user.username}`,
    });

    return user;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin-initiated password reset
 */
exports.adminResetPassword = async (userId, adminId) => {
    const user = await User.findById(userId).select('+password +passwordHistory');
    if (!user) {
        throw new Error('User not found');
    }

    // Generate new temporary password
    const tempPassword = generateSecurePassword();

    // Save current password to history
    if (user.password) {
        user.passwordHistory = user.passwordHistory || [];
        user.passwordHistory.push({
            hash: user.password,
            changedAt: new Date(),
        });

        // Keep only last N passwords
        if (user.passwordHistory.length > PASSWORD_HISTORY_COUNT) {
            user.passwordHistory = user.passwordHistory.slice(-PASSWORD_HISTORY_COUNT);
        }
    }

    user.password = tempPassword;
    user.mustChangePassword = true;
    user.passwordChangedAt = new Date();
    user.passwordExpiresAt = new Date(Date.now() + PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    user.activeSessions = []; // Force re-login
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_PASSWORD_RESET',
        entity: 'User',
        entityId: user._id,
        description: `Admin reset password for: ${user.username}`,
    });

    return {
        userId: user._id,
        username: user.username,
        temporaryPassword: tempPassword,
        mustChangeOnLogin: true,
    };
};

/**
 * Force password change for user
 */
exports.forcePasswordChange = async (userId, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    user.mustChangePassword = true;
    user.passwordExpiresAt = new Date(); // Expire immediately
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'USER_FORCE_PASSWORD_CHANGE',
        entity: 'User',
        entityId: user._id,
        description: `Forced password change for: ${user.username}`,
    });

    return user;
};

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK-GLASS PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Grant break-glass access
 */
exports.grantBreakGlass = async (userId, accessLevel, reason, durationHours, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Validate access level
    const validLevels = ['view_only', 'full_clinical', 'emergency'];
    if (!validLevels.includes(accessLevel)) {
        throw new Error(`Invalid access level. Must be one of: ${validLevels.join(', ')}`);
    }

    // Only clinical roles can receive break-glass
    const clinicalRoles = ['doctor', 'nurse', 'pharmacist', 'lab_tech', 'radiologist'];
    if (!clinicalRoles.includes(user.role)) {
        throw new Error('Break-glass access can only be granted to clinical roles');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (durationHours || BREAK_GLASS_DEFAULT_HOURS));

    user.breakGlassPermissions = {
        enabled: true,
        grantedBy: adminId,
        grantedAt: new Date(),
        expiresAt,
        reason,
        accessLevel,
    };
    await user.save();

    // Audit Log (Critical - always logged)
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_GRANT',
        entity: 'User',
        entityId: user._id,
        description: `Granted break-glass access (${accessLevel}) to: ${user.username}`,
        changes: {
            accessLevel,
            reason,
            expiresAt,
        },
    });

    return user;
};

/**
 * Revoke break-glass access
 */
exports.revokeBreakGlass = async (userId, adminId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const wasEnabled = user.breakGlassPermissions?.enabled;

    user.breakGlassPermissions = {
        enabled: false,
        grantedBy: null,
        grantedAt: null,
        expiresAt: null,
        reason: null,
        accessLevel: 'view_only',
    };
    await user.save();

    if (wasEnabled) {
        // Audit Log
        await createAuditLog({
            user: adminId,
            action: 'BREAK_GLASS_REVOKE',
            entity: 'User',
            entityId: user._id,
            description: `Revoked break-glass access from: ${user.username}`,
        });
    }

    return user;
};

/**
 * Get all users with active break-glass
 */
exports.getActiveBreakGlassUsers = async () => {
    const now = new Date();
    return User.find({
        'breakGlassPermissions.enabled': true,
        'breakGlassPermissions.expiresAt': { $gt: now },
    })
        .populate('breakGlassPermissions.grantedBy', 'username profile.firstName profile.lastName')
        .select('username role profile breakGlassPermissions');
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a secure random password
 */
function generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Record failed login attempt (called from auth)
 */
exports.recordFailedLogin = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return;

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLogin = new Date();

    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.accountStatus = 'locked';
        user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }

    await user.save();
};

/**
 * Record successful login
 */
exports.recordSuccessfulLogin = async (userId, sessionInfo) => {
    const user = await User.findById(userId);
    if (!user) return;

    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    user.lockoutUntil = null;

    // Add session
    if (sessionInfo) {
        user.activeSessions = user.activeSessions || [];
        user.activeSessions.push({
            ...sessionInfo,
            createdAt: new Date(),
            lastActivity: new Date(),
        });

        // Limit concurrent sessions
        if (user.activeSessions.length > user.maxConcurrentSessions) {
            user.activeSessions = user.activeSessions.slice(-user.maxConcurrentSessions);
        }
    }

    await user.save();
};

/**
 * Check if user account is accessible
 */
exports.checkAccountAccess = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        return { accessible: false, reason: 'User not found' };
    }

    if (!user.isActive) {
        return { accessible: false, reason: 'Account is deactivated' };
    }

    if (user.accountStatus === 'locked') {
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            return { accessible: false, reason: 'Account is locked', lockedUntil: user.lockoutUntil };
        }
        // Lockout expired, unlock
        user.accountStatus = 'active';
        user.failedLoginAttempts = 0;
        await user.save();
    }

    if (user.accountStatus === 'suspended') {
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            return { accessible: false, reason: 'Account is suspended', suspendedUntil: user.lockoutUntil };
        }
        // Suspension expired
        user.accountStatus = 'active';
        await user.save();
    }

    return { accessible: true };
};

module.exports = exports;
