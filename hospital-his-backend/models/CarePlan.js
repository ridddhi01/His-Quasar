const mongoose = require('mongoose');

/**
 * Care Plan Model
 * Doctor-created care plans executed by nurses
 */

const carePlanSchema = new mongoose.Schema(
    {
        planNumber: {
            type: String,
            unique: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        admission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
            required: [true, 'Admission is required'],
        },
        // Created by doctor
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Plan details
        title: {
            type: String,
            required: [true, 'Care plan title is required'],
        },
        diagnosis: String,
        category: {
            type: String,
            enum: [
                'post_operative',
                'chronic_disease',
                'wound_management',
                'pain_management',
                'respiratory',
                'cardiac',
                'diabetic',
                'neuro',
                'palliative',
                'rehabilitation',
                'nutrition',
                'infection_control',
                'mental_health',
                'other'
            ],
        },
        // Goals - set by doctor, tracked by nurse
        goals: [
            {
                description: {
                    type: String,
                    required: true,
                },
                targetDate: Date,
                priority: {
                    type: String,
                    enum: ['low', 'medium', 'high'],
                    default: 'medium',
                },
                status: {
                    type: String,
                    enum: ['active', 'achieved', 'modified', 'discontinued'],
                    default: 'active',
                },
                achievedAt: Date,
                achievedNotes: String,
            },
        ],
        // Interventions - nurse actions
        interventions: [
            {
                description: {
                    type: String,
                    required: true,
                },
                frequency: {
                    type: String,
                    enum: ['once', 'hourly', 'q2h', 'q4h', 'q6h', 'q8h', 'q12h', 'daily', 'prn', 'as_needed'],
                },
                instructions: String,
                startDate: Date,
                endDate: Date,
                status: {
                    type: String,
                    enum: ['active', 'completed', 'discontinued'],
                    default: 'active',
                },
                // Completion tracking
                completions: [
                    {
                        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                        completedAt: Date,
                        notes: String,
                        outcome: String,
                    },
                ],
                lastCompletedAt: Date,
                totalCompletions: { type: Number, default: 0 },
            },
        ],
        // Evaluations - nurse observations on progress
        evaluations: [
            {
                evaluatedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                evaluatedAt: {
                    type: Date,
                    default: Date.now,
                },
                goalProgress: {
                    type: String,
                    enum: ['no_progress', 'minimal', 'moderate', 'significant', 'achieved'],
                },
                notes: String,
                recommendations: String,
                // Flag for doctor review
                requiresDoctorReview: { type: Boolean, default: false },
            },
        ],
        // Issues flagged by nurse
        flaggedIssues: [
            {
                issue: String,
                flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                flaggedAt: { type: Date, default: Date.now },
                severity: {
                    type: String,
                    enum: ['low', 'medium', 'high'],
                },
                status: {
                    type: String,
                    enum: ['open', 'acknowledged', 'resolved'],
                    default: 'open',
                },
                resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                resolvedAt: Date,
                resolution: String,
            },
        ],
        // Plan status
        status: {
            type: String,
            enum: ['draft', 'active', 'on_hold', 'completed', 'discontinued'],
            default: 'active',
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: Date,
        // Doctor modifications
        modifications: [
            {
                modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                modifiedAt: { type: Date, default: Date.now },
                changes: String,
                reason: String,
            },
        ],
        // Assigned nurses
        assignedNurses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // Related EMR
        relatedEMR: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EMR',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
carePlanSchema.index({ patient: 1 });
carePlanSchema.index({ admission: 1 });
carePlanSchema.index({ status: 1 });
carePlanSchema.index({ createdBy: 1 });
carePlanSchema.index({ category: 1 });

// Auto-generate plan number
carePlanSchema.pre('save', async function (next) {
    if (this.isNew && !this.planNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('CarePlan').countDocuments();
        this.planNumber = `CP${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

const CarePlan = mongoose.model('CarePlan', carePlanSchema);

module.exports = CarePlan;
