const mongoose = require('mongoose');
const { SURGERY_STATUS } = require('../config/constants');

/**
 * Surgery Model – Extended for full OT module
 * Includes WHO checklist, anesthesia records, implants, pre/intra/post-op notes, billing, infection control
 */

// ─── Sub-schemas ───────────────────────────────────────────────────────────────

const vitalReadingSchema = new mongoose.Schema(
    {
        time: { type: Date, required: true },
        heartRate: Number,
        bloodPressure: String, // e.g. "120/80"
        spO2: Number,
        etCO2: Number,
        temperature: Number,
        respiratoryRate: Number,
        notes: String,
    },
    { _id: false }
);

const anesthesiaDrugSchema = new mongoose.Schema(
    {
        drugName: { type: String, required: true },
        dose: String,
        route: { type: String, enum: ['IV', 'IM', 'Inhalation', 'Epidural', 'Spinal', 'Other'] },
        timeGiven: Date,
        givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { _id: false }
);

const anesthesiaEventSchema = new mongoose.Schema(
    {
        time: { type: Date, required: true },
        event: { type: String, required: true }, // e.g. "Induction", "Intubation", "Extubation"
        notes: String,
    },
    { _id: false }
);

const anesthesiaRecordSchema = new mongoose.Schema(
    {
        asaGrade: { type: String, enum: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        preOpDiagnosis: String,
        allergies: [String],
        npoStatus: String, // e.g. "NPO since 6 hours"
        airwayAssessment: String,
        inductionTime: Date,
        intubationTime: Date,
        extubationTime: Date,
        anesthesiaStart: Date,
        anesthesiaEnd: Date,
        vitalsTimeline: [vitalReadingSchema],
        drugsAdministered: [anesthesiaDrugSchema],
        events: [anesthesiaEventSchema],
        fluidInput: String,
        bloodLoss: String,
        urineOutput: String,
        complications: String,
        notes: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { _id: false }
);

const whoChecklistSchema = new mongoose.Schema(
    {
        // Sign-In (before induction)
        signIn: {
            patientIdentityConfirmed: { type: Boolean, default: false },
            siteMarked: { type: Boolean, default: false },
            anesthesiaSafetyCheckComplete: { type: Boolean, default: false },
            pulseOximeterFunctioning: { type: Boolean, default: false },
            knownAllergyReviewed: { type: Boolean, default: false },
            difficultAirwayRisk: { type: Boolean, default: false },
            aspirationRisk: { type: Boolean, default: false },
            bloodLossRiskAssessed: { type: Boolean, default: false },
            completedAt: Date,
            completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
        // Time-Out (before skin incision)
        timeOut: {
            teamIntroductionDone: { type: Boolean, default: false },
            patientNameConfirmed: { type: Boolean, default: false },
            procedureConfirmed: { type: Boolean, default: false },
            siteConfirmed: { type: Boolean, default: false },
            antibioticProphylaxisGiven: { type: Boolean, default: false },
            criticalStepsReviewed: { type: Boolean, default: false },
            anticipatedBloodLossDiscussed: { type: Boolean, default: false },
            imagingDisplayed: { type: Boolean, default: false },
            completedAt: Date,
            completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
        // Sign-Out (before patient leaves OT)
        signOut: {
            procedureRecorded: { type: Boolean, default: false },
            instrumentCountCorrect: { type: Boolean, default: false },
            specimenLabelled: { type: Boolean, default: false },
            equipmentIssuesDocumented: { type: Boolean, default: false },
            recoveryPlanCommunicated: { type: Boolean, default: false },
            completedAt: Date,
            completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
    },
    { _id: false }
);

const preOpAssessmentSchema = new mongoose.Schema(
    {
        assessmentDate: { type: Date, default: Date.now },
        assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        history: String,
        physicalExamination: String,
        investigations: String,
        asaGrade: { type: String, enum: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        riskFactors: [String],
        allergies: [String],
        currentMedications: [String],
        fasting: String,
        consent: {
            obtained: { type: Boolean, default: false },
            obtainedAt: Date,
            witnessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
        fitForSurgery: { type: Boolean, default: false },
        notes: String,
    },
    { _id: false }
);

const implantConsumableSchema = new mongoose.Schema(
    {
        itemType: { type: String, enum: ['implant', 'consumable'], required: true },
        itemName: { type: String, required: true },
        batchNumber: String,
        serialNumber: String,
        quantity: { type: Number, default: 1 },
        unitCost: { type: Number, default: 0 },
        manufacturer: String,
        expiryDate: Date,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const intraOpNoteSchema = new mongoose.Schema(
    {
        time: { type: Date, default: Date.now },
        note: { type: String, required: true },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { _id: false }
);

const postOpOrderSchema = new mongoose.Schema(
    {
        orderType: {
            type: String,
            enum: ['medication', 'investigation', 'diet', 'activity', 'monitoring', 'other'],
            required: true,
        },
        description: { type: String, required: true },
        frequency: String,
        duration: String,
        orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        orderedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['pending', 'executed', 'cancelled'], default: 'pending' },
    },
    { _id: false }
);

const infectionControlSchema = new mongoose.Schema(
    {
        ssiRiskCategory: { type: String, enum: ['clean', 'clean-contaminated', 'contaminated', 'dirty'] },
        antibioticProphylaxis: {
            given: { type: Boolean, default: false },
            drug: String,
            dose: String,
            timeGiven: Date,
        },
        skinPrepDone: { type: Boolean, default: false },
        sterilityMaintained: { type: Boolean, default: false },
        postOpInfection: { type: Boolean, default: false },
        infectionDetails: String,
        reportedAt: Date,
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: String,
    },
    { _id: false }
);

// ─── Main Surgery Schema ───────────────────────────────────────────────────────

const surgerySchema = new mongoose.Schema(
    {
        surgeryNumber: {
            type: String,
            unique: true,
            required: true,
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
        // ─── Team mapping ──────────────────────────────────────────────────────────
        surgeon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Surgeon is required'],
        },
        assistantSurgeons: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        anesthetist: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        nurses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // ─── Scheduling ────────────────────────────────────────────────────────────
        otNumber: {
            type: String,
            trim: true,
        },
        scheduledDate: {
            type: Date,
            required: [true, 'Scheduled date is required'],
        },
        scheduledTime: {
            type: String,
            required: [true, 'Scheduled time is required'],
        },
        estimatedDuration: {
            type: Number, // minutes
        },
        actualStartTime: Date,
        actualEndTime: Date,
        // ─── Surgery details ───────────────────────────────────────────────────────
        surgeryType: {
            type: String,
            required: [true, 'Surgery type is required'],
            trim: true,
        },
        diagnosis: {
            type: String,
            trim: true,
        },
        procedure: {
            type: String,
            trim: true,
        },
        anesthesiaType: {
            type: String,
            enum: ['general', 'regional', 'local', 'sedation', 'spinal', 'epidural', 'combined'],
        },
        // ─── Extended OT module fields ─────────────────────────────────────────────
        preOpAssessment: preOpAssessmentSchema,
        whoChecklist: whoChecklistSchema,
        anesthesiaRecord: anesthesiaRecordSchema,
        implantsAndConsumables: [implantConsumableSchema],
        intraOpNotes: [intraOpNoteSchema],
        postOpOrders: [postOpOrderSchema],
        infectionControl: infectionControlSchema,
        // ─── Outcome & instructions ────────────────────────────────────────────────
        complications: {
            type: String,
            trim: true,
        },
        postOpInstructions: {
            type: String,
            trim: true,
        },
        // ─── Billing linkage ───────────────────────────────────────────────────────
        billingGenerated: {
            type: Boolean,
            default: false,
        },
        billingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Billing',
        },
        // ─── Status ────────────────────────────────────────────────────────────────
        status: {
            type: String,
            enum: Object.values(SURGERY_STATUS),
            default: SURGERY_STATUS.SCHEDULED,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
surgerySchema.index({ surgeryNumber: 1 });
surgerySchema.index({ patient: 1 });
surgerySchema.index({ surgeon: 1 });
surgerySchema.index({ scheduledDate: 1 });
surgerySchema.index({ status: 1 });
surgerySchema.index({ otNumber: 1, scheduledDate: 1 });

// ─── Auto-generate surgeryNumber ───────────────────────────────────────────────
surgerySchema.pre('save', async function (next) {
    if (this.isNew && !this.surgeryNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Surgery').countDocuments();
        this.surgeryNumber = `SRG${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

const Surgery = mongoose.model('Surgery', surgerySchema);

module.exports = Surgery;
