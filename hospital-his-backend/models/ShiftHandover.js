const mongoose = require('mongoose');

/**
 * Shift Handover Model
 * Structured shift handover with acknowledgment tracking
 */

const shiftHandoverSchema = new mongoose.Schema(
    {
        handoverNumber: {
            type: String,
            unique: true,
        },
        // Shift reference
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingShift',
            required: true,
        },
        // Handover participants
        handoverFrom: {
            nurse: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            shiftType: String,
        },
        handoverTo: {
            nurse: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            shiftType: String,
        },
        // Ward and date
        ward: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ward',
            required: true,
        },
        handoverDate: {
            type: Date,
            required: true,
        },
        // Patient-wise handover details
        patientHandovers: [
            {
                patient: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Patient',
                    required: true,
                },
                admission: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Admission',
                },
                bed: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Bed',
                },
                // Patient summary
                diagnosis: String,
                currentCondition: {
                    type: String,
                    enum: ['stable', 'improving', 'deteriorating', 'critical', 'guarded'],
                },
                // Last recorded vitals summary
                lastVitals: {
                    bp: String,
                    pulse: Number,
                    temp: Number,
                    spo2: Number,
                    recordedAt: Date,
                },
                // Key observations
                keyObservations: String,
                // Pending tasks
                pendingTasks: [
                    {
                        taskType: String,
                        description: String,
                        dueTime: Date,
                        priority: String,
                    },
                ],
                // Medications due
                medicationsDue: [
                    {
                        medication: String,
                        dosage: String,
                        dueTime: Date,
                    },
                ],
                // IV and lines
                ivAccess: {
                    hasIV: { type: Boolean, default: false },
                    site: String,
                    insertedAt: Date,
                    fluid: String,
                    rate: String,
                },
                // Drains and catheters
                drainsAndCatheters: [
                    {
                        type: String, // urinary, chest, wound, ng
                        site: String,
                        insertedAt: Date,
                        output: String,
                    },
                ],
                // Critical alerts
                criticalAlerts: [String],
                // Special instructions
                specialInstructions: String,
                // Risk flags
                fallRisk: { type: Boolean, default: false },
                pressureUlcerRisk: { type: Boolean, default: false },
                aspirationRisk: { type: Boolean, default: false },
                isolationRequired: { type: Boolean, default: false },
                isolationType: String,
            },
        ],
        // General ward notes
        generalNotes: String,
        // Equipment issues
        equipmentIssues: [
            {
                equipment: String,
                issue: String,
                reportedTo: String,
            },
        ],
        // Stock/supply issues
        stockIssues: [
            {
                item: String,
                issue: String,
            },
        ],
        // Critical incidents during shift
        incidentsSummary: String,
        // Pending escalations
        pendingEscalations: [
            {
                patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
                issue: String,
                escalatedTo: String,
                status: String,
            },
        ],
        // Handover timing
        handoverStartTime: Date,
        handoverEndTime: Date,
        // Acknowledgment
        status: {
            type: String,
            enum: ['pending', 'submitted', 'acknowledged', 'disputed'],
            default: 'pending',
        },
        submittedAt: Date,
        acknowledgedAt: Date,
        acknowledgmentNotes: String,
        // If disputed
        disputeReason: String,
        disputeResolvedAt: Date,
        disputeResolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Supervisor review
        supervisorReview: {
            reviewed: { type: Boolean, default: false },
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            reviewedAt: Date,
            comments: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
shiftHandoverSchema.index({ handoverDate: 1, ward: 1 });
shiftHandoverSchema.index({ 'handoverFrom.nurse': 1 });
shiftHandoverSchema.index({ 'handoverTo.nurse': 1 });
shiftHandoverSchema.index({ status: 1 });

// Auto-generate handover number with UUID to avoid race conditions
shiftHandoverSchema.pre('save', async function (next) {
    if (this.isNew && !this.handoverNumber) {
        const dateStr = this.handoverDate.toISOString().slice(0, 10).replace(/-/g, '');
        // Use timestamp and random number to ensure uniqueness even with concurrent requests
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.handoverNumber = `HO${dateStr}${String(timestamp).slice(-4)}${String(random).padStart(4, '0')}`;
    }
    next();
});

const ShiftHandover = mongoose.model('ShiftHandover', shiftHandoverSchema);

module.exports = ShiftHandover;
