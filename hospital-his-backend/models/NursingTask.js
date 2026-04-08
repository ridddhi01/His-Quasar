const mongoose = require('mongoose');

/**
 * Nursing Task Model
 * Auto-generated and manual tasks for nursing care
 * Tasks are generated from doctor orders, care plans, and hospital protocols
 */

const nursingTaskSchema = new mongoose.Schema(
    {
        taskNumber: {
            type: String,
            unique: true,
        },
        // Task source and reference
        taskType: {
            type: String,
            enum: [
                'vital_monitoring',
                'medication_administration',
                'iv_monitoring',
                'drain_monitoring',
                'catheter_care',
                'wound_care',
                'intake_output',
                'patient_positioning',
                'feeding',
                'hygiene',
                'observation',
                'procedure',
                'assessment',
                'doctor_order',
                'care_plan_intervention',
                'other'
            ],
            required: true,
        },
        // Source of task generation
        source: {
            type: String,
            enum: ['doctor_order', 'care_plan', 'protocol', 'manual', 'admission'],
            default: 'manual',
        },
        sourceReference: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'sourceModel',
        },
        sourceModel: {
            type: String,
            enum: ['Prescription', 'CarePlan', 'Admission', 'EMR'],
        },
        // Patient and admission
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: true,
        },
        admission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
            required: true,
        },
        // Assignment
        assignedNurse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedShift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingShift',
        },
        // Task details
        title: {
            type: String,
            required: [true, 'Task title is required'],
        },
        description: String,
        instructions: String,
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        // Scheduling
        scheduledTime: {
            type: Date,
            required: true,
        },
        dueTime: Date,
        frequency: {
            type: String,
            enum: ['once', 'hourly', 'q2h', 'q4h', 'q6h', 'q8h', 'q12h', 'daily', 'prn'],
            default: 'once',
        },
        // Next occurrence for recurring tasks
        nextOccurrence: Date,
        // Status tracking
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'skipped', 'delayed', 'cancelled'],
            default: 'pending',
        },
        // Completion details
        completedAt: Date,
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        completionNotes: String,
        // Skip/delay reason
        skipReason: String,
        delayReason: String,
        delayedTo: Date,
        // Related vital signs or MAR if applicable
        relatedVitals: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VitalSigns',
        },
        relatedMAR: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MedicationAdministration',
        },
        // Alerts generated
        alertsGenerated: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'CriticalAlert',
            },
        ],
        // Audit
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
nursingTaskSchema.index({ patient: 1, scheduledTime: 1 });
nursingTaskSchema.index({ assignedNurse: 1, status: 1 });
nursingTaskSchema.index({ admission: 1 });
nursingTaskSchema.index({ status: 1, scheduledTime: 1 });
nursingTaskSchema.index({ taskType: 1 });

// Auto-generate task number
nursingTaskSchema.pre('save', async function (next) {
    if (this.isNew && !this.taskNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('NursingTask').countDocuments();
        this.taskNumber = `NT${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const NursingTask = mongoose.model('NursingTask', nursingTaskSchema);

module.exports = NursingTask;
