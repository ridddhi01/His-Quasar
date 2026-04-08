const User = require('../models/User');
const Department = require('../models/Department');
const Tariff = require('../models/Tariff');
const Ward = require('../models/Ward');
const SystemConfig = require('../models/SystemConfig');
const AuditLog = require('../models/AuditLog');
const { createAuditLog } = require('./audit.service');

/**
 * Admin Service
 * Business logic for administrative operations
 * Separated into: Config, Audit, and Governance actions
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG ACTIONS - Master Data Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new user with role validation
 */
exports.createUser = async (userData, adminId) => {
    // Prevent creating another admin without explicit flag
    if (userData.role === 'admin' && !userData.confirmAdminCreation) {
        throw new Error('Admin user creation requires explicit confirmation');
    }

    const user = await User.create(userData);

    // Audit log
    await createAuditLog({
        user: adminId,
        action: 'USER_CREATE',
        entity: 'User',
        entityId: user._id,
        description: `Created user: ${user.username} with role: ${user.role}`,
    });

    return user;
};

/**
 * Update user - excludes password changes
 */
exports.updateUser = async (userId, updateData, adminId) => {
    // Never allow password update through this service
    delete updateData.password;

    const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    });

    if (user) {
        await createAuditLog({
            user: adminId,
            action: 'USER_UPDATE',
            entity: 'User',
            entityId: user._id,
            description: `Updated user: ${user.username}`,
            changes: updateData,
        });
    }

    return user;
};

/**
 * Deactivate user (soft delete)
 */
exports.deactivateUser = async (userId, adminId) => {
    const user = await User.findById(userId);
    if (!user) return null;

    user.isActive = false;
    await user.save();

    await createAuditLog({
        user: adminId,
        action: 'USER_DEACTIVATE',
        entity: 'User',
        entityId: user._id,
        description: `Deactivated user: ${user.username}`,
    });

    return user;
};

/**
 * Get users with filtering
 */
exports.getUsers = async (filters = {}) => {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.department) query.department = filters.department;

    const skip = ((filters.page || 1) - 1) * (filters.limit || 20);

    const users = await User.find(query)
        .populate('department', 'name')
        .skip(skip)
        .limit(parseInt(filters.limit) || 20)
        .sort({ createdAt: -1 })
        .select('-password');

    const total = await User.countDocuments(query);

    return { users, total };
};

/**
 * Create or update department
 */
exports.upsertDepartment = async (departmentData, adminId) => {
    const isUpdate = !!departmentData._id;
    let department;

    if (isUpdate) {
        department = await Department.findByIdAndUpdate(
            departmentData._id,
            departmentData,
            { new: true, runValidators: true }
        );
    } else {
        department = await Department.create(departmentData);
    }

    await createAuditLog({
        user: adminId,
        action: isUpdate ? 'DEPARTMENT_UPDATE' : 'DEPARTMENT_CREATE',
        entity: 'Department',
        entityId: department._id,
        description: `${isUpdate ? 'Updated' : 'Created'} department: ${department.name}`,
    });

    return department;
};

/**
 * Create or update tariff
 */
exports.upsertTariff = async (tariffData, adminId) => {
    const isUpdate = !!tariffData._id;
    let tariff;

    if (isUpdate) {
        tariff = await Tariff.findByIdAndUpdate(
            tariffData._id,
            tariffData,
            { new: true, runValidators: true }
        );
    } else {
        tariff = await Tariff.create(tariffData);
    }

    await createAuditLog({
        user: adminId,
        action: isUpdate ? 'TARIFF_UPDATE' : 'TARIFF_CREATE',
        entity: 'Tariff',
        entityId: tariff._id,
        description: `${isUpdate ? 'Updated' : 'Created'} tariff: ${tariff.name}`,
    });

    return tariff;
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ACTIONS - Read-Only Access
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get audit logs with filtering
 */
exports.getAuditLogs = async (filters = {}) => {
    const query = {};

    if (filters.user) query.user = filters.user;
    if (filters.action) query.action = filters.action;
    if (filters.entity) query.entity = filters.entity;
    if (filters.entityId) query.entityId = filters.entityId;

    // Date range filter
    if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const skip = ((filters.page || 1) - 1) * (filters.limit || 50);

    const logs = await AuditLog.find(query)
        .populate('user', 'username profile.firstName profile.lastName role')
        .skip(skip)
        .limit(parseInt(filters.limit) || 50)
        .sort({ timestamp: -1 });

    const total = await AuditLog.countDocuments(query);

    return { logs, total };
};

/**
 * Get audit summary by action type
 */
exports.getAuditSummary = async (days = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 },
                lastOccurrence: { $max: '$timestamp' },
            },
        },
        { $sort: { count: -1 } },
    ]);

    return summary;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE ACTIONS - System Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get system configuration by category
 */
exports.getSystemConfig = async (category = null) => {
    if (category) {
        return SystemConfig.getByCategory(category);
    }

    // Return all configs grouped by category
    const configs = await SystemConfig.find().sort({ category: 1, key: 1 });

    // Group by category
    return configs.reduce((acc, config) => {
        if (!acc[config.category]) {
            acc[config.category] = [];
        }
        acc[config.category].push(config);
        return acc;
    }, {});
};

/**
 * Update system configuration
 */
exports.updateSystemConfig = async (key, value, adminId) => {
    const config = await SystemConfig.setValue(key, value, adminId);

    await createAuditLog({
        user: adminId,
        action: 'SYSTEM_CONFIG_UPDATE',
        entity: 'SystemConfig',
        entityId: config._id,
        description: `Updated system config: ${key}`,
        changes: { key, newValue: value },
    });

    return config;
};

/**
 * Bulk update system configurations
 */
exports.bulkUpdateSystemConfig = async (configs, adminId) => {
    const results = [];

    for (const { key, value } of configs) {
        const config = await SystemConfig.setValue(key, value, adminId);
        results.push(config);
    }

    await createAuditLog({
        user: adminId,
        action: 'SYSTEM_CONFIG_BULK_UPDATE',
        entity: 'SystemConfig',
        description: `Bulk updated ${configs.length} system configs`,
        changes: { keys: configs.map(c => c.key) },
    });

    return results;
};

/**
 * Initialize default system configurations
 */
exports.initializeDefaultConfigs = async (adminId) => {
    const defaults = [
        // Hospital Info
        { key: 'hospital_name', value: 'HIS Quasar Hospital', category: 'hospital_info', dataType: 'string' },
        { key: 'hospital_address', value: '', category: 'hospital_info', dataType: 'string' },
        { key: 'hospital_phone', value: '', category: 'hospital_info', dataType: 'string' },
        { key: 'hospital_email', value: '', category: 'hospital_info', dataType: 'string' },

        // Billing
        { key: 'default_tax_rate', value: 18, category: 'billing', dataType: 'number' },
        { key: 'currency_symbol', value: '₹', category: 'billing', dataType: 'string' },
        { key: 'auto_generate_bill', value: false, category: 'billing', dataType: 'boolean' },

        // Clinical
        { key: 'prescription_validity_days', value: 30, category: 'clinical', dataType: 'number' },
        { key: 'lab_result_alert_enabled', value: true, category: 'clinical', dataType: 'boolean' },
        { key: 'drug_interaction_check_enabled', value: true, category: 'clinical', dataType: 'boolean' },

        // Security
        { key: 'session_timeout_minutes', value: 30, category: 'security', dataType: 'number' },
        { key: 'password_expiry_days', value: 90, category: 'security', dataType: 'number' },
        { key: 'max_login_attempts', value: 5, category: 'security', dataType: 'number' },

        // Backup
        { key: 'auto_backup_enabled', value: true, category: 'backup', dataType: 'boolean' },
        { key: 'backup_retention_days', value: 30, category: 'backup', dataType: 'number' },
    ];

    for (const config of defaults) {
        const existing = await SystemConfig.findOne({ key: config.key });
        if (!existing) {
            await SystemConfig.create({
                ...config,
                lastModifiedBy: adminId,
                lastModifiedAt: new Date(),
            });
        }
    }

    return { initialized: true, count: defaults.length };
};

module.exports = exports;
