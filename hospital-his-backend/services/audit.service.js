const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {String} options.user - User ID performing the action
 * @param {String} options.action - Action type (create, read, update, delete, etc.)
 * @param {String} options.entity - Entity name (e.g., 'Surgery', 'Patient')
 * @param {String} options.entityId - Entity ID
 * @param {String} options.description - Description of the action
 * @param {Object} options.changes - Changes made (optional)
 * @param {Object} options.metadata - Additional metadata (optional)
 * @param {String} options.ipAddress - IP address (optional)
 * @param {String} options.userAgent - User agent (optional)
 */
exports.createAuditLog = async (options) => {
    try {
        const auditLog = await AuditLog.create({
            user: options.user,
            action: options.action?.toLowerCase() || 'other',
            entity: options.entity,
            entityId: options.entityId,
            description: options.description,
            changes: options.changes
                ? { after: options.changes }
                : undefined,
            metadata: options.metadata,
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            timestamp: new Date(),
        });
        return auditLog;
    } catch (error) {
        // Log error but don't throw - audit logging shouldn't break the main flow
        console.error('Audit log creation failed:', error.message);
        return null;
    }
};

/**
 * Get audit logs for an entity
 * @param {String} entity - Entity name
 * @param {String} entityId - Entity ID
 * @param {Object} options - Query options
 */
exports.getAuditLogsForEntity = async (entity, entityId, options = {}) => {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find({ entity, entityId })
        .populate('user', 'username profile.firstName profile.lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

    const total = await AuditLog.countDocuments({ entity, entityId });

    return {
        logs,
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};

/**
 * Get audit logs for a user
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 */
exports.getAuditLogsForUser = async (userId, options = {}) => {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find({ user: userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

    const total = await AuditLog.countDocuments({ user: userId });

    return {
        logs,
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};

/**
 * Get recent audit logs
 * @param {Object} options - Query options
 */
exports.getRecentAuditLogs = async (options = {}) => {
    const { page = 1, limit = 100, entity, action } = options;
    const skip = (page - 1) * limit;

    const query = {};
    if (entity) query.entity = entity;
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
        .populate('user', 'username profile.firstName profile.lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

    const total = await AuditLog.countDocuments(query);

    return {
        logs,
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};
