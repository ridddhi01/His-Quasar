const mongoose = require('mongoose');

/**
 * Break-Glass Access Log Model
 * Tracks all emergency access requests, usage, and reviews
 * 
 * Design Principle: Emergency access without abuse
 * - Every usage is logged
 * - Post-use review by Admin is mandatory
 * - Time-limited access
 * - Full justification required
 */

const breakGlassLogSchema = new mongoose.Schema(
    {
        // Log Identification
        logCode: {
            type: String,
            unique: true,
        },

        // Request Details
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        requestType: {
            type: String,
            enum: ['self_activation', 'admin_grant'],
            required: true,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },

        // Access Configuration
        accessLevel: {
            type: String,
            enum: ['view_only', 'full_clinical', 'emergency'],
            required: true,
            default: 'view_only',
        },
        accessScope: {
            allPatients: { type: Boolean, default: false },
            specificPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
            department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
            allDepartments: { type: Boolean, default: false },
        },

        // Justification (MANDATORY)
        reason: {
            type: String,
            required: [true, 'Justification is mandatory for break-glass access'],
            minlength: [20, 'Reason must be at least 20 characters'],
        },
        emergencyType: {
            type: String,
            enum: [
                'cardiac_arrest',
                'trauma',
                'stroke',
                'anaphylaxis',
                'respiratory_failure',
                'obstetric_emergency',
                'psychiatric_emergency',
                'mass_casualty',
                'patient_transfer',
                'cross_department_consult',
                'on_call_coverage',
                'other',
            ],
            required: true,
        },

        // Time Limits
        activatedAt: Date,
        expiresAt: {
            type: Date,
            required: true,
        },
        revokedAt: Date,
        revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        revocationReason: String,

        // Status
        status: {
            type: String,
            enum: [
                'pending_approval',  // Self-request awaiting admin approval
                'active',            // Currently active
                'expired',           // Time limit reached
                'revoked',           // Manually revoked
                'completed',         // Usage completed, awaiting review
                'reviewed',          // Post-use review completed
                'flagged',           // Flagged for investigation
            ],
            default: 'pending_approval',
        },

        // Admin Approval (for self_activation requests)
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: Date,
        approvalNotes: String,

        // Patient Actions Performed (Usage Log)
        accessedRecords: [{
            patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
            patientMRN: String,  // For audit even if patient deleted
            entity: String,      // e.g., 'MedicalRecord', 'LabResult', 'Prescription'
            entityId: mongoose.Schema.Types.ObjectId,
            action: {
                type: String,
                enum: ['view', 'update', 'create', 'critical_action'],
            },
            timestamp: { type: Date, default: Date.now },
            ipAddress: String,
            details: String,
        }],

        // Post-Use Review (MANDATORY)
        review: {
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            reviewedAt: Date,
            outcome: {
                type: String,
                enum: ['justified', 'questionable', 'abuse', 'needs_training'],
            },
            notes: String,
            followUpRequired: { type: Boolean, default: false },
            followUpActions: [String],
        },

        // Investigation (if flagged)
        investigation: {
            investigator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            startedAt: Date,
            completedAt: Date,
            findings: String,
            conclusionType: {
                type: String,
                enum: ['no_issue', 'policy_violation', 'abuse_confirmed', 'training_required'],
            },
            actionsT: [String],
        },

        // Metadata
        ipAddress: String,
        userAgent: String,
        sessionId: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
breakGlassLogSchema.index({ logCode: 1 });
breakGlassLogSchema.index({ requestedBy: 1 });
breakGlassLogSchema.index({ status: 1 });
breakGlassLogSchema.index({ requestedAt: -1 });
breakGlassLogSchema.index({ expiresAt: 1 });
breakGlassLogSchema.index({ 'review.outcome': 1 });

// Pre-save: Auto-generate log code
breakGlassLogSchema.pre('save', async function (next) {
    if (this.isNew && !this.logCode) {
        const count = await mongoose.model('BreakGlassLog').countDocuments();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.logCode = `BG-${dateStr}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Virtual: Check if currently active
breakGlassLogSchema.virtual('isActive').get(function () {
    return this.status === 'active' && this.expiresAt > new Date();
});

// Virtual: Duration in hours
breakGlassLogSchema.virtual('durationHours').get(function () {
    if (!this.activatedAt || !this.expiresAt) return 0;
    return Math.round((this.expiresAt - this.activatedAt) / (1000 * 60 * 60));
});

// Static: Get logs pending review
breakGlassLogSchema.statics.getPendingReview = function () {
    return this.find({
        status: { $in: ['completed', 'expired'] },
        'review.reviewedAt': { $exists: false },
    })
        .populate('requestedBy', 'username profile.firstName profile.lastName role')
        .sort({ expiresAt: -1 });
};

// Static: Get active sessions
breakGlassLogSchema.statics.getActiveSessions = function () {
    return this.find({
        status: 'active',
        expiresAt: { $gt: new Date() },
    })
        .populate('requestedBy', 'username profile.firstName profile.lastName role')
        .populate('approvedBy', 'username profile.firstName profile.lastName');
};

// Static: Get flagged for investigation
breakGlassLogSchema.statics.getFlagged = function () {
    return this.find({ status: 'flagged' })
        .populate('requestedBy', 'username profile.firstName profile.lastName role')
        .populate('review.reviewedBy', 'username');
};

// Method: Add access record
breakGlassLogSchema.methods.logAccess = function (accessRecord) {
    this.accessedRecords.push({
        ...accessRecord,
        timestamp: new Date(),
    });
    return this.save();
};

// Method: Check if can access entity
breakGlassLogSchema.methods.canAccess = function (entity, action) {
    if (this.status !== 'active') return false;
    if (this.expiresAt < new Date()) return false;

    // view_only can only view
    if (this.accessLevel === 'view_only' && action !== 'view') return false;

    // full_clinical can view/update
    if (this.accessLevel === 'full_clinical' && action === 'critical_action') return false;

    // emergency can do everything
    return true;
};

const BreakGlassLog = mongoose.model('BreakGlassLog', breakGlassLogSchema);

module.exports = BreakGlassLog;
