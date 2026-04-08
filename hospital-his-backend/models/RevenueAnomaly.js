const mongoose = require('mongoose');

/**
 * Revenue Anomaly Model
 * Stores AI-detected billing anomalies for Admin review
 * 
 * Design Principle: Guard revenue without corrupting billing integrity
 * - Anomalies are OBSERVATIONS, not corrections
 * - Admin can review, assign, resolve - but NOT edit billing directly
 * - Full audit trail for compliance
 */

const revenueAnomalySchema = new mongoose.Schema(
    {
        // Identification
        anomalyCode: {
            type: String,
            unique: true,
            required: true,
        },

        // Source & Detection
        detectedBy: {
            type: String,
            enum: ['ai_system', 'rule_engine', 'manual_report', 'audit'],
            default: 'ai_system',
        },
        detectionMethod: {
            type: String,
            enum: ['pattern_analysis', 'threshold_breach', 'outlier_detection', 'trend_deviation', 'cross_reference', 'manual'],
            required: true,
        },
        detectedAt: {
            type: Date,
            default: Date.now,
        },

        // Anomaly Classification
        category: {
            type: String,
            enum: [
                'unbilled_service',          // Service rendered but not billed
                'billing_discrepancy',       // Amount mismatch
                'duplicate_billing',         // Same service billed twice
                'coding_error',              // Wrong tariff/code used
                'missing_documentation',     // Billing without proper docs
                'unusual_pattern',           // Suspicious billing pattern
                'tariff_mismatch',           // Price doesn't match tariff master
                'insurance_leakage',         // Insurance claim issues
                'other',
            ],
            required: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        priority: {
            type: Number,
            min: 1,
            max: 5,
            default: 3,  // 1 = highest
        },

        // Affected Entity (Reference only - NO EDIT permission)
        affectedEntity: {
            type: {
                type: String,
                enum: ['Billing', 'LabTest', 'RadiologyOrder', 'Prescription', 'Admission', 'Surgery'],
                required: true,
            },
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                refPath: 'affectedEntity.type',
            },
            reference: String,  // e.g., Bill Number, Lab ID
        },

        // Patient & Department (for filtering - No patient details exposed to admin)
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            select: false,  // Hidden from Admin by default
        },

        // Financial Impact
        estimatedImpact: {
            type: Number,
            default: 0,
            min: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        impactType: {
            type: String,
            enum: ['revenue_loss', 'overbilling', 'compliance_risk', 'unknown'],
            default: 'unknown',
        },

        // Anomaly Details
        title: {
            type: String,
            required: [true, 'Anomaly title is required'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        evidence: {
            summary: String,
            dataPoints: [{
                field: String,
                expected: mongoose.Schema.Types.Mixed,
                actual: mongoose.Schema.Types.Mixed,
                deviation: String,
            }],
            confidenceScore: {
                type: Number,
                min: 0,
                max: 100,
            },
        },

        // ═══════════════════════════════════════════════════════════════════
        // STATUS & WORKFLOW
        // ═══════════════════════════════════════════════════════════════════

        status: {
            type: String,
            enum: [
                'new',              // Just detected
                'under_review',     // Admin is reviewing
                'investigating',    // Assigned for investigation
                'pending_action',   // Awaiting billing team action
                'false_positive',   // Marked as not an issue
                'resolved',         // Issue fixed
                'closed',           // Workflow complete
                'escalated',        // Escalated to higher authority
            ],
            default: 'new',
        },

        // Assignment
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedAt: {
            type: Date,
        },

        // Resolution
        resolution: {
            type: {
                type: String,
                enum: ['corrected', 'no_action_needed', 'false_positive', 'written_off', 'escalated', 'other'],
            },
            notes: String,
            resolvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            resolvedAt: Date,
            amountRecovered: {
                type: Number,
                default: 0,
            },
        },

        // False Positive Tracking
        falsePositive: {
            markedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            markedAt: Date,
            reason: {
                type: String,
                enum: ['data_quality', 'expected_behavior', 'policy_exception', 'duplicate_detection', 'other'],
            },
            justification: String,
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },

        // Status History (Full Audit Trail)
        statusHistory: [{
            fromStatus: String,
            toStatus: String,
            changedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            changedAt: {
                type: Date,
                default: Date.now,
            },
            notes: String,
        }],

        // Comments/Notes
        comments: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            text: {
                type: String,
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            isInternal: {
                type: Boolean,
                default: true,  // Admin-only visible
            },
        }],

        // SLA Tracking
        sla: {
            dueBy: Date,
            isOverdue: {
                type: Boolean,
                default: false,
            },
            escalationLevel: {
                type: Number,
                default: 0,
            },
        },

        // Tags for filtering
        tags: [String],
    },
    {
        timestamps: true,
    }
);

// Indexes
revenueAnomalySchema.index({ anomalyCode: 1 });
revenueAnomalySchema.index({ status: 1 });
revenueAnomalySchema.index({ category: 1 });
revenueAnomalySchema.index({ severity: 1 });
revenueAnomalySchema.index({ assignedTo: 1 });
revenueAnomalySchema.index({ department: 1 });
revenueAnomalySchema.index({ detectedAt: -1 });
revenueAnomalySchema.index({ 'affectedEntity.type': 1, 'affectedEntity.id': 1 });
revenueAnomalySchema.index({ createdAt: -1 });

// Pre-save: Auto-generate anomaly code
revenueAnomalySchema.pre('save', async function (next) {
    if (this.isNew && !this.anomalyCode) {
        const count = await mongoose.model('RevenueAnomaly').countDocuments();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.anomalyCode = `RA-${dateStr}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Pre-save: Calculate SLA due date
revenueAnomalySchema.pre('save', function (next) {
    if (this.isNew && !this.sla?.dueBy) {
        const slaDays = {
            critical: 1,
            high: 3,
            medium: 7,
            low: 14,
        };
        const daysToAdd = slaDays[this.severity] || 7;
        this.sla = this.sla || {};
        this.sla.dueBy = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    }
    next();
});

// Static: Get anomalies by status
revenueAnomalySchema.statics.getByStatus = function (status) {
    return this.find({ status })
        .populate('assignedTo', 'username profile.firstName profile.lastName')
        .populate('department', 'name')
        .sort({ priority: 1, detectedAt: -1 });
};

// Static: Get overdue anomalies
revenueAnomalySchema.statics.getOverdue = function () {
    return this.find({
        status: { $nin: ['resolved', 'closed', 'false_positive'] },
        'sla.dueBy': { $lt: new Date() },
    }).sort({ priority: 1 });
};

// Method: Transition status with validation
revenueAnomalySchema.methods.transitionStatus = function (newStatus, userId, notes) {
    const validTransitions = {
        new: ['under_review', 'false_positive'],
        under_review: ['investigating', 'pending_action', 'false_positive', 'resolved'],
        investigating: ['pending_action', 'false_positive', 'resolved', 'escalated'],
        pending_action: ['resolved', 'escalated'],
        escalated: ['resolved', 'closed'],
        resolved: ['closed'],
        false_positive: ['closed', 'under_review'],  // Can reopen if incorrectly marked
    };

    const allowed = validTransitions[this.status] || [];
    if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid transition from '${this.status}' to '${newStatus}'`);
    }

    // Record history
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: newStatus,
        changedBy: userId,
        changedAt: new Date(),
        notes,
    });

    this.status = newStatus;
    return this;
};

const RevenueAnomaly = mongoose.model('RevenueAnomaly', revenueAnomalySchema);

module.exports = RevenueAnomaly;
