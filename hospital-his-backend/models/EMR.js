const mongoose = require('mongoose');
const { VISIT_TYPES } = require('../config/constants');

/**
 * EMR Model (Electronic Medical Records)
 * Represents clinical records for patient visits
 */

const emrSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        visit: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'visitModel',
            required: [true, 'Visit reference is required'],
        },
        visitModel: {
            type: String,
            enum: ['Appointment', 'Admission', 'Emergency'],
            required: true,
        },
        visitType: {
            type: String,
            enum: Object.values(VISIT_TYPES),
            required: [true, 'Visit type is required'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            default: Date.now,
        },
        vitals: {
            bloodPressure: { type: String },
            pulse: { type: Number },
            temperature: { type: Number },
            respiratoryRate: { type: Number },
            oxygenSaturation: { type: Number },
            weight: { type: Number },
            height: { type: Number },
            bmi: { type: Number },
        },
        chiefComplaint: {
            type: String,
            trim: true,
        },
        presentingIllness: {
            type: String,
            trim: true,
        },
        examination: {
            type: String,
            trim: true,
        },
        diagnosis: {
            type: String,
            trim: true,
        },
        treatment: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Doctor is required'],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
emrSchema.index({ patient: 1 });
emrSchema.index({ visit: 1 });
emrSchema.index({ doctor: 1 });
emrSchema.index({ date: -1 });
emrSchema.index({ visitType: 1 });

// Pre-save hook to calculate BMI if height and weight are provided
emrSchema.pre('save', function (next) {
    if (this.vitals && this.vitals.height && this.vitals.weight) {
        // BMI = weight (kg) / height (m)^2
        const heightInMeters = this.vitals.height / 100;
        this.vitals.bmi = parseFloat((this.vitals.weight / (heightInMeters * heightInMeters)).toFixed(2));
    }
    next();
});

const EMR = mongoose.model('EMR', emrSchema);

module.exports = EMR;
