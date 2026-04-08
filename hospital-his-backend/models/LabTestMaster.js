const mongoose = require('mongoose');

/**
 * LabTestMaster Model
 * Represents the catalog of available lab tests
 */

const labTestMasterSchema = new mongoose.Schema(
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
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        description: {
            type: String,
            trim: true,
        },
        parameters: [
            {
                name: { type: String, required: true },
                unit: { type: String },
                normalRange: { type: String },
                criticalLow: { type: Number },
                criticalHigh: { type: Number },
                method: { type: String },
            },
        ],
        sampleType: {
            type: String,
            enum: ['blood', 'urine', 'stool', 'sputum', 'swab', 'tissue', 'csf', 'other'],
            required: [true, 'Sample type is required'],
        },
        sampleVolume: {
            type: String,
            trim: true,
        },
        turnaroundTime: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        instructions: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
labTestMasterSchema.index({ testCode: 1 });
labTestMasterSchema.index({ testName: 'text' });
labTestMasterSchema.index({ category: 1 });
labTestMasterSchema.index({ isActive: 1 });

const LabTestMaster = mongoose.model('LabTestMaster', labTestMasterSchema);

module.exports = LabTestMaster;
