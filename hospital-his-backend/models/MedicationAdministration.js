const mongoose = require('mongoose');

/**
 * Medication Administration Record (MAR) Model
 * Safety-first medication administration tracking
 */

const medicationAdministrationSchema = new mongoose.Schema(
    {
        marNumber: {
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
        // Source prescription
        prescription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Prescription',
            required: [true, 'Prescription is required'],
        },
        // Medication details (copied from prescription for record)
        medication: {
            medicine: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Medicine',
                required: true,
            },
            medicineName: String,
            dosage: String,
            route: {
                type: String,
                enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'sublingual', 'rectal', 'ophthalmic', 'otic', 'nasal', 'transdermal'],
                required: true,
            },
            frequency: String,
            instructions: String,
        },
        // Scheduling
        scheduledTime: {
            type: Date,
            required: [true, 'Scheduled time is required'],
        },
        // Administration status
        status: {
            type: String,
            enum: ['scheduled', 'given', 'delayed', 'skipped', 'refused', 'held', 'discontinued'],
            default: 'scheduled',
        },
        // If given
        administeredAt: Date,
        administeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        actualDose: String,
        actualRoute: String,
        // Verification (5 Rights)
        verification: {
            rightPatient: { type: Boolean, default: false },
            rightDrug: { type: Boolean, default: false },
            rightDose: { type: Boolean, default: false },
            rightRoute: { type: Boolean, default: false },
            rightTime: { type: Boolean, default: false },
            verifiedAt: Date,
        },
        // Safety checks
        allergyChecked: { type: Boolean, default: false },
        allergyAlert: { type: Boolean, default: false },
        allergyDetails: String,
        interactionChecked: { type: Boolean, default: false },
        interactionAlert: { type: Boolean, default: false },
        interactionDetails: String,
        // Vital signs before administration (if required)
        preAdminVitals: {
            required: { type: Boolean, default: false },
            vitalsRecord: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'VitalSigns',
            },
        },
        // If delayed
        delayedReason: String,
        delayedTo: Date,
        delayedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // If skipped or refused
        skipReason: {
            type: String,
            enum: [
                'patient_refused',
                'patient_npo',
                'patient_vomiting',
                'patient_away',
                'medication_unavailable',
                'vital_signs_abnormal',
                'doctor_hold',
                'allergy_concern',
                'adverse_reaction',
                'other'
            ],
        },
        skipDetails: String,
        skippedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // If held by doctor
        heldBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        holdReason: String,
        // Witness (for controlled substances)
        witnessRequired: { type: Boolean, default: false },
        witness: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Patient response
        patientResponse: String,
        adverseReaction: {
            occurred: { type: Boolean, default: false },
            description: String,
            severity: {
                type: String,
                enum: ['mild', 'moderate', 'severe', 'life_threatening'],
            },
            reportedAt: Date,
        },
        // Notes
        notes: String,
        // Related task
        relatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingTask',
        },
        // Shift reference
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingShift',
        },
        // Alert generated
        alertGenerated: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CriticalAlert',
        },
        // Billing
        billed: { type: Boolean, default: false },
        billingItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BillingItem',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
medicationAdministrationSchema.index({ patient: 1, scheduledTime: 1 });
medicationAdministrationSchema.index({ prescription: 1 });
medicationAdministrationSchema.index({ status: 1 });
medicationAdministrationSchema.index({ administeredBy: 1 });
medicationAdministrationSchema.index({ admission: 1 });

// Auto-generate MAR number
medicationAdministrationSchema.pre('save', async function (next) {
    if (this.isNew && !this.marNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('MedicationAdministration').countDocuments();
        this.marNumber = `MAR${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Virtual to check if overdue
medicationAdministrationSchema.virtual('isOverdue').get(function () {
    if (this.status !== 'scheduled') return false;
    const now = new Date();
    const gracePeriod = 30 * 60 * 1000; // 30 minutes
    return now > new Date(this.scheduledTime.getTime() + gracePeriod);
});

const MedicationAdministration = mongoose.model('MedicationAdministration', medicationAdministrationSchema);

module.exports = MedicationAdministration;
