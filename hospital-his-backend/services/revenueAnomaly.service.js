/**
 * Revenue Anomaly Service
 * Business logic for AI-detected revenue anomaly management
 * 
 * Design Principle: Guard revenue without corrupting billing integrity
 * - Admin can REVIEW and ASSIGN, not EDIT billing
 * - All actions are fully audited
 * - Clear state transitions
 */

const RevenueAnomaly = require('../models/RevenueAnomaly');
const User = require('../models/User');
const { createAuditLog } = require('./audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALY RETRIEVAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get anomalies with filtering
 */
exports.getAnomalies = async (filters = {}, pagination = {}) => {
    const {
        status,
        category,
        severity,
        department,
        assignedTo,
        dateFrom,
        dateTo,
        isOverdue,
    } = filters;

    const { page = 1, limit = 20 } = pagination;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (department) query.department = department;
    if (assignedTo) query.assignedTo = assignedTo;

    if (dateFrom || dateTo) {
        query.detectedAt = {};
        if (dateFrom) query.detectedAt.$gte = new Date(dateFrom);
        if (dateTo) query.detectedAt.$lte = new Date(dateTo);
    }

    if (isOverdue === 'true') {
        query['sla.dueBy'] = { $lt: new Date() };
        query.status = { $nin: ['resolved', 'closed', 'false_positive'] };
    }

    const skip = (page - 1) * limit;

    const [anomalies, total] = await Promise.all([
        RevenueAnomaly.find(query)
            .populate('assignedTo', 'username profile.firstName profile.lastName')
            .populate('department', 'name')
            .sort({ priority: 1, detectedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        RevenueAnomaly.countDocuments(query),
    ]);

    return {
        anomalies,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
    };
};

/**
 * Get anomaly by ID with full details
 */
exports.getAnomalyById = async (anomalyId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId)
        .populate('assignedTo', 'username profile.firstName profile.lastName role')
        .populate('assignedBy', 'username profile.firstName profile.lastName')
        .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
        .populate('falsePositive.markedBy', 'username profile.firstName profile.lastName')
        .populate('falsePositive.reviewedBy', 'username profile.firstName profile.lastName')
        .populate('statusHistory.changedBy', 'username profile.firstName profile.lastName')
        .populate('comments.user', 'username profile.firstName profile.lastName')
        .populate('department', 'name departmentCode');

    if (!anomaly) {
        throw new Error('Anomaly not found');
    }

    return anomaly;
};

/**
 * Get dashboard summary
 */
exports.getDashboardSummary = async () => {
    const [
        statusCounts,
        severityCounts,
        categoryCounts,
        overdueCounts,
        totalImpact,
        recentResolutions,
    ] = await Promise.all([
        // By status
        RevenueAnomaly.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // By severity
        RevenueAnomaly.aggregate([
            { $match: { status: { $nin: ['resolved', 'closed', 'false_positive'] } } },
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        // By category
        RevenueAnomaly.aggregate([
            { $match: { status: { $nin: ['resolved', 'closed', 'false_positive'] } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
        // Overdue count
        RevenueAnomaly.countDocuments({
            status: { $nin: ['resolved', 'closed', 'false_positive'] },
            'sla.dueBy': { $lt: new Date() },
        }),
        // Total estimated impact of open anomalies
        RevenueAnomaly.aggregate([
            { $match: { status: { $nin: ['resolved', 'closed', 'false_positive'] } } },
            { $group: { _id: null, total: { $sum: '$estimatedImpact' } } },
        ]),
        // Recent resolutions (for metrics)
        RevenueAnomaly.aggregate([
            { $match: { status: 'resolved', 'resolution.resolvedAt': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: null, count: { $sum: 1 }, recovered: { $sum: '$resolution.amountRecovered' } } },
        ]),
    ]);

    // Format status counts
    const byStatus = {};
    statusCounts.forEach(s => { byStatus[s._id] = s.count; });

    // Format severity counts
    const bySeverity = {};
    severityCounts.forEach(s => { bySeverity[s._id] = s.count; });

    // Format category counts
    const byCategory = {};
    categoryCounts.forEach(c => { byCategory[c._id] = c.count; });

    const openCount = Object.entries(byStatus)
        .filter(([status]) => !['resolved', 'closed', 'false_positive'].includes(status))
        .reduce((sum, [_, count]) => sum + count, 0);

    return {
        summary: {
            total: Object.values(byStatus).reduce((a, b) => a + b, 0),
            open: openCount,
            resolved: byStatus.resolved || 0,
            falsePositives: byStatus.false_positive || 0,
            overdue: overdueCounts,
        },
        byStatus,
        bySeverity,
        byCategory,
        financialImpact: {
            openAnomaliesValue: totalImpact[0]?.total || 0,
            resolvedLastMonth: recentResolutions[0]?.count || 0,
            recoveredLastMonth: recentResolutions[0]?.recovered || 0,
        },
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start review (new -> under_review)
 */
exports.startReview = async (anomalyId, adminId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    anomaly.transitionStatus('under_review', adminId, 'Review started');
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_REVIEW_START',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Started review of anomaly: ${anomaly.anomalyCode}`,
    });

    return anomaly;
};

/**
 * Assign anomaly for investigation
 */
exports.assignAnomaly = async (anomalyId, assigneeId, adminId, notes) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    // Validate assignee exists
    const assignee = await User.findById(assigneeId);
    if (!assignee) throw new Error('Assignee user not found');

    // Transition status if needed
    if (anomaly.status === 'new') {
        anomaly.transitionStatus('under_review', adminId, 'Assigned for investigation');
    }
    if (anomaly.status === 'under_review') {
        anomaly.transitionStatus('investigating', adminId, notes || 'Assigned for investigation');
    }

    anomaly.assignedTo = assigneeId;
    anomaly.assignedBy = adminId;
    anomaly.assignedAt = new Date();
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_ASSIGN',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Assigned anomaly ${anomaly.anomalyCode} to ${assignee.username}`,
        changes: { assignedTo: assigneeId, notes },
    });

    return anomaly;
};

/**
 * Mark as false positive
 */
exports.markFalsePositive = async (anomalyId, reason, justification, adminId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    if (!reason) throw new Error('Reason for false positive is required');
    if (!justification) throw new Error('Justification is required');

    anomaly.transitionStatus('false_positive', adminId, `Marked as false positive: ${reason}`);

    anomaly.falsePositive = {
        markedBy: adminId,
        markedAt: new Date(),
        reason,
        justification,
    };
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_FALSE_POSITIVE',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Marked anomaly ${anomaly.anomalyCode} as false positive`,
        changes: { reason, justification },
    });

    return anomaly;
};

/**
 * Send to billing team for action (pending_action)
 */
exports.sendForAction = async (anomalyId, notes, adminId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    anomaly.transitionStatus('pending_action', adminId, notes || 'Sent to billing team for correction');
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_SEND_FOR_ACTION',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Sent anomaly ${anomaly.anomalyCode} to billing team`,
        changes: { notes },
    });

    // NOTE: Actual billing correction is done by Billing team, NOT Admin
    // Admin only flags the issue

    return anomaly;
};

/**
 * Escalate anomaly
 */
exports.escalateAnomaly = async (anomalyId, reason, adminId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    anomaly.transitionStatus('escalated', adminId, reason);
    anomaly.sla.escalationLevel = (anomaly.sla.escalationLevel || 0) + 1;
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_ESCALATE',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Escalated anomaly ${anomaly.anomalyCode} (Level ${anomaly.sla.escalationLevel})`,
        changes: { reason, escalationLevel: anomaly.sla.escalationLevel },
    });

    return anomaly;
};

/**
 * Resolve anomaly
 * NOTE: Admin marks resolution after billing team confirms correction
 */
exports.resolveAnomaly = async (anomalyId, resolutionData, adminId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    const { type, notes, amountRecovered } = resolutionData;

    if (!type) throw new Error('Resolution type is required');

    anomaly.transitionStatus('resolved', adminId, notes || `Resolved: ${type}`);

    anomaly.resolution = {
        type,
        notes,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        amountRecovered: amountRecovered || 0,
    };
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_RESOLVE',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Resolved anomaly ${anomaly.anomalyCode}: ${type}`,
        changes: { resolutionType: type, amountRecovered },
    });

    return anomaly;
};

/**
 * Close anomaly (final state)
 */
exports.closeAnomaly = async (anomalyId, notes, adminId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    anomaly.transitionStatus('closed', adminId, notes || 'Closed');
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_CLOSE',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Closed anomaly ${anomaly.anomalyCode}`,
    });

    return anomaly;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS & INVESTIGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add comment/note
 */
exports.addComment = async (anomalyId, text, adminId, isInternal = true) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    anomaly.comments.push({
        user: adminId,
        text,
        isInternal,
        createdAt: new Date(),
    });
    await anomaly.save();

    await createAuditLog({
        user: adminId,
        action: 'ANOMALY_COMMENT',
        entity: 'RevenueAnomaly',
        entityId: anomaly._id,
        description: `Added comment to anomaly ${anomaly.anomalyCode}`,
    });

    return anomaly;
};

/**
 * Get investigation details (linked billing info - read only)
 * NOTE: No patient identifiable information exposed
 */
exports.getInvestigationDetails = async (anomalyId) => {
    const anomaly = await RevenueAnomaly.findById(anomalyId);
    if (!anomaly) throw new Error('Anomaly not found');

    // Return evidence and data points only, no patient details
    return {
        anomalyCode: anomaly.anomalyCode,
        category: anomaly.category,
        evidence: anomaly.evidence,
        affectedEntity: {
            type: anomaly.affectedEntity.type,
            reference: anomaly.affectedEntity.reference,
            // ID is hidden - Admin cannot directly access billing record
        },
        estimatedImpact: anomaly.estimatedImpact,
        statusHistory: anomaly.statusHistory,
        comments: anomaly.comments,
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bulk assign anomalies
 */
exports.bulkAssign = async (anomalyIds, assigneeId, adminId) => {
    const results = { success: [], failed: [] };

    for (const id of anomalyIds) {
        try {
            await this.assignAnomaly(id, assigneeId, adminId);
            results.success.push(id);
        } catch (error) {
            results.failed.push({ id, error: error.message });
        }
    }

    return results;
};

/**
 * Update overdue flags
 */
exports.updateOverdueFlags = async () => {
    const now = new Date();

    await RevenueAnomaly.updateMany(
        {
            status: { $nin: ['resolved', 'closed', 'false_positive'] },
            'sla.dueBy': { $lt: now },
            'sla.isOverdue': { $ne: true },
        },
        { $set: { 'sla.isOverdue': true } }
    );
};

module.exports = exports;
