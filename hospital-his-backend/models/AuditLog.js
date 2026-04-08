const mongoose = require('mongoose');

/**
 * AuditLog Model
 * Represents system audit trails
 */

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        action: {
            type: String,
            required: [true, 'Action is required'],
            enum: [
                // Basic CRUD operations
                'create', 'read', 'update', 'delete',
                // Authentication
                'login', 'logout',
                // Export/Report operations
                'export', 'print',
                // Nursing operations
                'shift_start', 'task_complete', 'task_skip',
                'vitals_record', 'medication_administer', 'medication_skip',
                'note_create', 'intervention_complete',
                'handover_create', 'handover_acknowledge',
                'alert_acknowledge', 'alert_resolve', 'alert_escalate',
                'shift_assign',
                // Other
                'other'
            ],
        },
        entity: {
            type: String,
            required: [true, 'Entity is required'],
            trim: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        changes: {
            before: { type: mongoose.Schema.Types.Mixed },
            after: { type: mongoose.Schema.Types.Mixed },
        },
        description: {
            type: String,
            trim: true,
        },
        ipAddress: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: false, // We use our own timestamp field
    }
);

// Indexes
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entity: 1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ timestamp: -1 });

// TTL index to auto-delete old logs (optional, 1 year retention)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
