const mongoose = require('mongoose');

/**
 * Nursing Note Model
 * Nursing observations and progress notes with immutability
 */

const nursingNoteSchema = new mongoose.Schema(
    {
        noteNumber: {
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
        // Note type
        noteType: {
            type: String,
            enum: ['nursing_note', 'progress_note', 'assessment', 'handover', 'incident'],
            required: true,
        },
        // Note content
        category: {
            type: String,
            enum: [
                'observation',
                'patient_complaint',
                'mobility',
                'appetite',
                'sleep',
                'behavior',
                'treatment_response',
                'procedure_monitoring',
                'escalation',
                'pain_management',
                'wound_care',
                'iv_site',
                'intake_output',
                'fall_risk',
                'skin_assessment',
                'respiratory',
                'neuro_check',
                'other'
            ],
        },
        content: {
            type: String,
            required: [true, 'Note content is required'],
        },
        // Structured observations
        observations: {
            mobility: {
                type: String,
                enum: ['independent', 'assisted', 'bed_bound', 'wheelchair'],
            },
            appetite: {
                type: String,
                enum: ['good', 'fair', 'poor', 'npo'],
            },
            sleep: {
                type: String,
                enum: ['good', 'fair', 'poor', 'disturbed'],
            },
            mood: {
                type: String,
                enum: ['calm', 'anxious', 'agitated', 'depressed', 'confused'],
            },
            painLevel: {
                type: Number,
                min: 0,
                max: 10,
            },
        },
        // Intake and output (if applicable)
        intakeOutput: {
            oralIntake: Number,      // ml
            ivIntake: Number,        // ml
            urineOutput: Number,     // ml
            drainOutput: Number,     // ml
            vomitus: Number,         // ml
            stoolCount: Number,
            stoolType: String,
        },
        // Priority and escalation
        priority: {
            type: String,
            enum: ['routine', 'important', 'urgent', 'critical'],
            default: 'routine',
        },
        requiresEscalation: { type: Boolean, default: false },
        escalatedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        escalatedAt: Date,
        escalationResolved: { type: Boolean, default: false },
        // Recording details
        recordedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingShift',
        },
        // Related entities
        relatedVitals: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VitalSigns',
        },
        relatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingTask',
        },
        // Acknowledgment by senior/doctor
        acknowledgements: [
            {
                acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                acknowledgedAt: Date,
                role: String,
                comment: String,
            },
        ],
        // Immutability - notes cannot be edited after 30 minutes
        isLocked: { type: Boolean, default: false },
        lockedAt: Date,
        // Addendum for corrections
        addenda: [
            {
                content: String,
                addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                addedAt: { type: Date, default: Date.now },
                reason: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes
nursingNoteSchema.index({ patient: 1, recordedAt: -1 });
nursingNoteSchema.index({ admission: 1 });
nursingNoteSchema.index({ noteType: 1 });
nursingNoteSchema.index({ recordedBy: 1 });
nursingNoteSchema.index({ requiresEscalation: 1 });

// Auto-generate note number
nursingNoteSchema.pre('save', async function (next) {
    if (this.isNew && !this.noteNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('NursingNote').countDocuments();
        this.noteNumber = `NN${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Auto-lock notes after creation (they become immutable)
nursingNoteSchema.post('save', function (doc) {
    // Lock after 30 minutes
    setTimeout(async () => {
        try {
            await mongoose.model('NursingNote').findByIdAndUpdate(doc._id, {
                isLocked: true,
                lockedAt: new Date(),
            });
        } catch (err) {
            console.error('Error locking nursing note:', err);
        }
    }, 30 * 60 * 1000);
});

const NursingNote = mongoose.model('NursingNote', nursingNoteSchema);

module.exports = NursingNote;
