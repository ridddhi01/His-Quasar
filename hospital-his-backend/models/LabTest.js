const mongoose = require('mongoose');
const { LAB_TEST_STATUS } = require('../config/constants');

/**
 * LabTest Model
 * Represents lab test orders and results
 */

const labTestSchema = new mongoose.Schema(
    {
        testNumber: {
            type: String,
            unique: true,
            required: true,
        },
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
        orderedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Ordering doctor is required'],
        },
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LabTestMaster',
            required: [true, 'Test is required'],
        },
        sampleCollectedAt: {
            type: Date,
        },
        sampleCollectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: Object.values(LAB_TEST_STATUS),
            default: LAB_TEST_STATUS.ORDERED,
        },
        results: [
            {
                parameter: { type: String, required: true },
                value: { type: String, required: true },
                unit: { type: String },
                normalRange: { type: String },
                isAbnormal: { type: Boolean, default: false },
                isCritical: { type: Boolean, default: false },
            },
        ],
        remarks: {
            type: String,
            trim: true,
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        completedAt: {
            type: Date,
        },
        isReportGenerated: {
            type: Boolean,
            default: false,
        },
        reportUrl: {
            type: String,
        },
        // PDF Report Fields
        reportPdf: {
            type: String,  // File path to uploaded PDF
        },
        extractedText: {
            type: String,  // Raw text extracted from PDF
        },
        aiSummary: {
            type: String,  // Cached AI-generated summary
        },
        summaryGeneratedAt: {
            type: Date,    // When summary was generated
        },
        isBilled: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
labTestSchema.index({ testNumber: 1 });
labTestSchema.index({ patient: 1 });
labTestSchema.index({ status: 1 });
labTestSchema.index({ orderedBy: 1 });
labTestSchema.index({ createdAt: -1 });

// Auto-generate testNumber before validation (so required check passes)
labTestSchema.pre('validate', async function (next) {
    if (this.isNew && !this.testNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('LabTest').countDocuments();
        this.testNumber = `LAB${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const LabTest = mongoose.model('LabTest', labTestSchema);

module.exports = LabTest;
