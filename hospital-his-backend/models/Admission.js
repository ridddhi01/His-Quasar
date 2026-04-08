const mongoose = require('mongoose');
const { ADMISSION_STATUS } = require('../config/constants');

/**
 * Admission Model
 * Represents IPD admissions
 */

const admissionSchema = new mongoose.Schema(
    {
        admissionNumber: {
            type: String,
            unique: true,
            required: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Doctor is required'],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department is required'],
        },
        ward: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ward',
        },
        bed: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bed',
        },
        admissionDate: {
            type: Date,
            required: [true, 'Admission date is required'],
            default: Date.now,
        },
        dischargeDate: {
            type: Date,
        },
        admissionType: {
            type: String,
            enum: ['emergency', 'planned'],
            default: 'planned',
        },
        diagnosis: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(ADMISSION_STATUS),
            default: ADMISSION_STATUS.ADMITTED,
        },
        estimatedDischarge: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Clinical Data
        vitals: [{
            temperature: String,
            bpSystolic: Number,
            bpDiastolic: Number,
            pulse: Number,
            spo2: Number,
            respiratoryRate: Number,
            recordedAt: { type: Date, default: Date.now },
            recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        clinicalNotes: [{
            note: { type: String, required: true },
            type: { type: String, enum: ['doctor_round', 'nursing_note', 'procedure_note'], required: true },
            recordedAt: { type: Date, default: Date.now },
            recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        // Billing & Discharge Control
        billing: {
            status: { type: String, enum: ['pending', 'cleared'], default: 'pending' },
            lastChargeGeneration: Date,
            advances: [{
                amount: Number,
                date: Date,
                receiptNumber: String,
                collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
            }]
        },
        discharge: {
            initiatedAt: Date,
            isApprovedByDoctor: { type: Boolean, default: false },
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            billingCleared: { type: Boolean, default: false },
            summary: String
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
admissionSchema.index({ admissionNumber: 1 });
admissionSchema.index({ patient: 1 });
admissionSchema.index({ doctor: 1 });
admissionSchema.index({ status: 1 });
admissionSchema.index({ bed: 1 });
admissionSchema.index({ admissionDate: -1 });

// Auto-generate admissionNumber before saving
admissionSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Admission').countDocuments();
        this.admissionNumber = `ADM${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

const Admission = mongoose.model('Admission', admissionSchema);

module.exports = Admission;
