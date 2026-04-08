const mongoose = require('mongoose');
const { BED_STATUS, BED_TYPES } = require('../config/constants');

/**
 * Bed Model
 * Represents bed master and allocation
 */

const bedSchema = new mongoose.Schema(
    {
        bedNumber: {
            type: String,
            required: [true, 'Bed number is required'],
            trim: true,
        },
        ward: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ward',
            required: [true, 'Ward is required'],
        },
        bedType: {
            type: String,
            enum: Object.values(BED_TYPES),
            required: [true, 'Bed type is required'],
        },
        status: {
            type: String,
            enum: Object.values(BED_STATUS),
            default: BED_STATUS.AVAILABLE,
        },
        currentPatient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
        },
        currentAdmission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
        },
        tariff: {
            type: Number,
            required: [true, 'Tariff is required'],
            min: [0, 'Tariff cannot be negative'],
        },
        features: [{ type: String }],
        lastCleanedAt: {
            type: Date,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index for bed number within ward
bedSchema.index({ bedNumber: 1, ward: 1 }, { unique: true });

// Indexes
bedSchema.index({ ward: 1 });
bedSchema.index({ bedType: 1 });
bedSchema.index({ status: 1 });
bedSchema.index({ currentPatient: 1 });

const Bed = mongoose.model('Bed', bedSchema);

module.exports = Bed;
