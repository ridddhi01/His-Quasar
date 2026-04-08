/**
 * Break-Glass Access Service
 * Manages emergency access workflow with full audit trail
 * 
 * Design Principle: Emergency access without abuse
 * - Time-limited access
 * - Mandatory justification
 * - Full usage logging
 * - Post-use Admin review required
 */

const BreakGlassLog = require('../models/BreakGlassLog');
const User = require('../models/User');
const { createAuditLog } = require('./audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_DURATION_HOURS = 4;
const MAX_DURATION_HOURS = 24;
const MIN_REASON_LENGTH = 20;

// Roles eligible for break-glass
const ELIGIBLE_ROLES = ['doctor', 'nurse', 'pharmacist', 'lab_tech', 'radiologist'];

// Access level definitions
const ACCESS_LEVELS = {
    view_only: {
        description: 'Can only view patient records',
        allowedActions: ['view'],
        maxDuration: 8,
    },
    full_clinical: {
        description: 'Can view and update clinical records',
        allowedActions: ['view', 'update', 'create'],
        maxDuration: 12,
    },
    emergency: {
        description: 'Full clinical access including critical actions',
        allowedActions: ['view', 'update', 'create', 'critical_action'],
        maxDuration: 24,
        requiresAdmin: true,  // Only admin can grant this level
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-REQUEST FLOW (Clinical User)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clinical user requests break-glass access
 * This creates a pending request for Admin approval
 */
exports.requestBreakGlass = async (userId, requestData, ipAddress, userAgent) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate eligibility
    if (!ELIGIBLE_ROLES.includes(user.role)) {
        throw new Error(`Role '${user.role}' is not eligible for break-glass access`);
    }

    // Check for existing active session
    const existingActive = await BreakGlassLog.findOne({
        requestedBy: userId,
        status: 'active',
        expiresAt: { $gt: new Date() },
    });
    if (existingActive) {
        throw new Error('You already have an active break-glass session');
    }

    // Validate request data
    const { reason, emergencyType, accessLevel, durationHours, accessScope } = requestData;

    if (!reason || reason.length < MIN_REASON_LENGTH) {
        throw new Error(`Justification must be at least ${MIN_REASON_LENGTH} characters`);
    }
    if (!emergencyType) {
        throw new Error('Emergency type is required');
    }

    const level = accessLevel || 'view_only';
    if (ACCESS_LEVELS[level].requiresAdmin) {
        // User cannot self-request emergency level
        throw new Error('Emergency level access requires Admin grant');
    }

    // Calculate expiry
    const hours = Math.min(durationHours || DEFAULT_DURATION_HOURS, ACCESS_LEVELS[level].maxDuration);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Create request
    const log = await BreakGlassLog.create({
        requestedBy: userId,
        requestType: 'self_activation',
        reason,
        emergencyType,
        accessLevel: level,
        expiresAt,
        accessScope: accessScope || { allPatients: false, allDepartments: false },
        status: 'pending_approval',
        ipAddress,
        userAgent,
    });

    // Audit Log
    await createAuditLog({
        user: userId,
        action: 'BREAK_GLASS_REQUEST',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Break-glass access requested: ${emergencyType}`,
        changes: { accessLevel: level, expiresAt, reason },
        ipAddress,
    });

    // TODO: Send notification to Admin(s) for approval

    return log;
};

/**
 * Immediate self-activation (for critical emergencies)
 * Activates immediately but still requires post-use review
 */
exports.selfActivate = async (userId, requestData, ipAddress, userAgent) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!ELIGIBLE_ROLES.includes(user.role)) {
        throw new Error(`Role '${user.role}' is not eligible for break-glass access`);
    }

    const { reason, emergencyType, accessLevel } = requestData;

    if (!reason || reason.length < MIN_REASON_LENGTH) {
        throw new Error(`Justification must be at least ${MIN_REASON_LENGTH} characters`);
    }

    // Only view_only can be self-activated; higher levels need admin
    const level = accessLevel === 'view_only' ? 'view_only' : 'full_clinical';
    const hours = DEFAULT_DURATION_HOURS;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Create and activate
    const log = await BreakGlassLog.create({
        requestedBy: userId,
        requestType: 'self_activation',
        reason,
        emergencyType: emergencyType || 'other',
        accessLevel: level,
        activatedAt: new Date(),
        expiresAt,
        status: 'active',
        ipAddress,
        userAgent,
    });

    // Update user's break-glass permissions
    user.breakGlassPermissions = {
        enabled: true,
        grantedBy: userId,  // Self-granted
        grantedAt: new Date(),
        expiresAt,
        reason,
        accessLevel: level,
    };
    await user.save();

    // Critical Audit Log
    await createAuditLog({
        user: userId,
        action: 'BREAK_GLASS_SELF_ACTIVATE',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `CRITICAL: Self-activated break-glass access (${level})`,
        changes: { accessLevel: level, expiresAt, reason, emergencyType },
        ipAddress,
    });

    return log;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN GRANT FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin approves a pending break-glass request
 */
exports.approveRequest = async (logId, adminId, approvalNotes) => {
    const log = await BreakGlassLog.findById(logId);
    if (!log) throw new Error('Break-glass request not found');

    if (log.status !== 'pending_approval') {
        throw new Error(`Cannot approve request with status '${log.status}'`);
    }

    // Activate
    log.status = 'active';
    log.approvedBy = adminId;
    log.approvedAt = new Date();
    log.activatedAt = new Date();
    log.approvalNotes = approvalNotes;
    await log.save();

    // Update user's break-glass permissions
    const user = await User.findById(log.requestedBy);
    user.breakGlassPermissions = {
        enabled: true,
        grantedBy: adminId,
        grantedAt: new Date(),
        expiresAt: log.expiresAt,
        reason: log.reason,
        accessLevel: log.accessLevel,
    };
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_APPROVE',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Approved break-glass request for ${user.username}`,
        changes: { accessLevel: log.accessLevel, approvalNotes },
    });

    return log;
};

/**
 * Admin rejects a pending break-glass request
 */
exports.rejectRequest = async (logId, adminId, rejectionReason) => {
    const log = await BreakGlassLog.findById(logId);
    if (!log) throw new Error('Break-glass request not found');

    if (log.status !== 'pending_approval') {
        throw new Error(`Cannot reject request with status '${log.status}'`);
    }

    log.status = 'revoked';
    log.revokedBy = adminId;
    log.revokedAt = new Date();
    log.revocationReason = rejectionReason;
    await log.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_REJECT',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Rejected break-glass request: ${rejectionReason}`,
    });

    return log;
};

/**
 * Admin directly grants break-glass access (proactive)
 */
exports.adminGrant = async (targetUserId, adminId, grantData) => {
    const { accessLevel, reason, emergencyType, durationHours } = grantData;

    const user = await User.findById(targetUserId);
    if (!user) throw new Error('User not found');

    if (!ELIGIBLE_ROLES.includes(user.role)) {
        throw new Error(`Role '${user.role}' is not eligible for break-glass access`);
    }

    const level = accessLevel || 'view_only';
    const maxHours = ACCESS_LEVELS[level]?.maxDuration || MAX_DURATION_HOURS;
    const hours = Math.min(durationHours || DEFAULT_DURATION_HOURS, maxHours);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Create active log
    const log = await BreakGlassLog.create({
        requestedBy: targetUserId,
        requestType: 'admin_grant',
        reason,
        emergencyType: emergencyType || 'other',
        accessLevel: level,
        activatedAt: new Date(),
        expiresAt,
        status: 'active',
        approvedBy: adminId,
        approvedAt: new Date(),
    });

    // Update user's permissions
    user.breakGlassPermissions = {
        enabled: true,
        grantedBy: adminId,
        grantedAt: new Date(),
        expiresAt,
        reason,
        accessLevel: level,
    };
    await user.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_ADMIN_GRANT',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Admin granted break-glass access (${level}) to ${user.username}`,
        changes: { targetUser: targetUserId, accessLevel: level, expiresAt, reason },
    });

    return log;
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVOCATION & EXPIRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Revoke active break-glass access
 */
exports.revokeAccess = async (logId, adminId, reason) => {
    const log = await BreakGlassLog.findById(logId);
    if (!log) throw new Error('Break-glass log not found');

    if (log.status !== 'active') {
        throw new Error('This access is not currently active');
    }

    log.status = 'revoked';
    log.revokedBy = adminId;
    log.revokedAt = new Date();
    log.revocationReason = reason;
    await log.save();

    // Disable user's break-glass permissions
    const user = await User.findById(log.requestedBy);
    if (user) {
        user.breakGlassPermissions = {
            enabled: false,
            grantedBy: null,
            grantedAt: null,
            expiresAt: null,
            reason: null,
            accessLevel: 'view_only',
        };
        await user.save();
    }

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_REVOKE',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Revoked break-glass access: ${reason}`,
    });

    return log;
};

/**
 * Process expired sessions (called by cron/scheduler)
 */
exports.processExpiredSessions = async () => {
    const now = new Date();

    // Find expired active sessions
    const expired = await BreakGlassLog.find({
        status: 'active',
        expiresAt: { $lte: now },
    });

    for (const log of expired) {
        log.status = 'completed';
        await log.save();

        // Disable user's permissions
        const user = await User.findById(log.requestedBy);
        if (user) {
            user.breakGlassPermissions.enabled = false;
            await user.save();
        }

        // Audit Log
        await createAuditLog({
            user: log.requestedBy,
            action: 'BREAK_GLASS_EXPIRED',
            entity: 'BreakGlassLog',
            entityId: log._id,
            description: 'Break-glass session expired, pending review',
        });
    }

    return expired.length;
};

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log access to a patient record during break-glass session
 */
exports.logPatientAccess = async (userId, accessData) => {
    const log = await BreakGlassLog.findOne({
        requestedBy: userId,
        status: 'active',
        expiresAt: { $gt: new Date() },
    });

    if (!log) {
        throw new Error('No active break-glass session');
    }

    const { patientId, patientMRN, entity, entityId, action, details, ipAddress } = accessData;

    log.accessedRecords.push({
        patient: patientId,
        patientMRN,
        entity,
        entityId,
        action,
        details,
        ipAddress,
        timestamp: new Date(),
    });
    await log.save();

    // Audit Log (every access during break-glass)
    await createAuditLog({
        user: userId,
        action: 'BREAK_GLASS_PATIENT_ACCESS',
        entity,
        entityId,
        description: `Break-glass access: ${action} on ${entity}`,
        changes: { patientMRN, action, breakGlassLogId: log._id },
        ipAddress,
    });

    return log;
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST-USE REVIEW (MANDATORY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get logs pending review
 */
exports.getPendingReviews = async () => {
    return BreakGlassLog.find({
        status: { $in: ['completed', 'expired'] },
        'review.reviewedAt': { $exists: false },
    })
        .populate('requestedBy', 'username profile.firstName profile.lastName role')
        .populate('approvedBy', 'username')
        .sort({ expiresAt: -1 });
};

/**
 * Admin reviews completed break-glass session
 */
exports.reviewSession = async (logId, adminId, reviewData) => {
    const log = await BreakGlassLog.findById(logId);
    if (!log) throw new Error('Break-glass log not found');

    if (!['completed', 'expired'].includes(log.status)) {
        throw new Error('Session cannot be reviewed yet');
    }

    const { outcome, notes, followUpRequired, followUpActions } = reviewData;

    if (!outcome) {
        throw new Error('Review outcome is required');
    }

    log.review = {
        reviewedBy: adminId,
        reviewedAt: new Date(),
        outcome,
        notes,
        followUpRequired: followUpRequired || false,
        followUpActions: followUpActions || [],
    };

    // Update status based on outcome
    if (outcome === 'abuse' || outcome === 'questionable') {
        log.status = 'flagged';
    } else {
        log.status = 'reviewed';
    }

    await log.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_REVIEW',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Break-glass session reviewed: ${outcome}`,
        changes: { outcome, recordsAccessed: log.accessedRecords.length, followUpRequired },
    });

    return log;
};

/**
 * Flag session for investigation
 */
exports.flagForInvestigation = async (logId, adminId, reason) => {
    const log = await BreakGlassLog.findById(logId);
    if (!log) throw new Error('Break-glass log not found');

    log.status = 'flagged';
    log.review = log.review || {};
    log.review.notes = (log.review.notes || '') + ` | FLAGGED: ${reason}`;
    log.investigation = {
        investigator: adminId,
        startedAt: new Date(),
    };
    await log.save();

    // Audit Log
    await createAuditLog({
        user: adminId,
        action: 'BREAK_GLASS_FLAG',
        entity: 'BreakGlassLog',
        entityId: log._id,
        description: `Break-glass session flagged for investigation: ${reason}`,
    });

    return log;
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get user's break-glass history
 */
exports.getUserHistory = async (userId) => {
    return BreakGlassLog.find({ requestedBy: userId })
        .populate('approvedBy', 'username')
        .populate('revokedBy', 'username')
        .populate('review.reviewedBy', 'username')
        .sort({ createdAt: -1 });
};

/**
 * Get active break-glass sessions
 */
exports.getActiveSessions = async () => {
    return BreakGlassLog.getActiveSessions();
};

/**
 * Get break-glass statistics
 */
exports.getStatistics = async (dateFrom, dateTo) => {
    const match = {};
    if (dateFrom || dateTo) {
        match.requestedAt = {};
        if (dateFrom) match.requestedAt.$gte = new Date(dateFrom);
        if (dateTo) match.requestedAt.$lte = new Date(dateTo);
    }

    const [
        total,
        byStatus,
        byOutcome,
        byEmergencyType,
        avgRecordsAccessed,
    ] = await Promise.all([
        BreakGlassLog.countDocuments(match),
        BreakGlassLog.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        BreakGlassLog.aggregate([
            { $match: { ...match, 'review.outcome': { $exists: true } } },
            { $group: { _id: '$review.outcome', count: { $sum: 1 } } },
        ]),
        BreakGlassLog.aggregate([
            { $match: match },
            { $group: { _id: '$emergencyType', count: { $sum: 1 } } },
        ]),
        BreakGlassLog.aggregate([
            { $match: match },
            { $project: { recordCount: { $size: '$accessedRecords' } } },
            { $group: { _id: null, avg: { $avg: '$recordCount' } } },
        ]),
    ]);

    return {
        total,
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        byOutcome: Object.fromEntries(byOutcome.map(s => [s._id, s.count])),
        byEmergencyType: Object.fromEntries(byEmergencyType.map(s => [s._id, s.count])),
        avgRecordsAccessed: Math.round(avgRecordsAccessed[0]?.avg || 0),
    };
};

/**
 * Check if user has active break-glass access
 */
exports.hasActiveAccess = async (userId) => {
    const active = await BreakGlassLog.findOne({
        requestedBy: userId,
        status: 'active',
        expiresAt: { $gt: new Date() },
    });

    return {
        hasAccess: !!active,
        accessLevel: active?.accessLevel,
        expiresAt: active?.expiresAt,
        logId: active?._id,
    };
};

module.exports = exports;
