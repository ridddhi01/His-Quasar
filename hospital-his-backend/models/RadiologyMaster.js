const mongoose = require('mongoose');

/**
 * RadiologyMaster Model
 * Represents the catalog of available radiology tests
 */

const radiologyMasterSchema = new mongoose.Schema(
    {
        testCode: {
            type: String,
            unique: true,
            required: [true, 'Test code is required'],
            trim: true,
        },
        testName: {
            type: String,
            required: [true, 'Test name is required'],
            trim: true,
        },
        modality: {
            type: String,
            enum: ['xray', 'ct', 'mri', 'ultrasound', 'pet', 'mammography', 'fluoroscopy', 'other'],
            required: [true, 'Modality is required'],
        },
        bodyPart: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        preparation: {
            type: String,
            trim: true,
        },
        duration: {
            type: Number, // in minutes
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        contrastRequired: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
radiologyMasterSchema.index({ testCode: 1 });
radiologyMasterSchema.index({ testName: 'text' });
radiologyMasterSchema.index({ modality: 1 });
radiologyMasterSchema.index({ isActive: 1 });

const RadiologyMaster = mongoose.model('RadiologyMaster', radiologyMasterSchema);

module.exports = RadiologyMaster;
