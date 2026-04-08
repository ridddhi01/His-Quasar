const mongoose = require('mongoose');
const { RADIOLOGY_STATUS } = require('../config/constants');

/**
 * Radiology Model
 * Represents radiology test orders and reports
 */

const radiologySchema = new mongoose.Schema(
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
            ref: 'RadiologyMaster',
            required: [true, 'Test is required'],
        },
        scheduledAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: Object.values(RADIOLOGY_STATUS),
            default: RADIOLOGY_STATUS.ORDERED,
        },
        findings: {
            type: String,
            trim: true,
        },
        impression: {
            type: String,
            trim: true,
        },
        recommendations: {
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
        images: [{ type: String }],
        reportUrl: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
radiologySchema.index({ testNumber: 1 });
radiologySchema.index({ patient: 1 });
radiologySchema.index({ status: 1 });
radiologySchema.index({ scheduledAt: 1 });
radiologySchema.index({ createdAt: -1 });

// Auto-generate testNumber before validation (must run before 'required' check)
radiologySchema.pre('validate', async function (next) {
    if (this.isNew && !this.testNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Radiology').countDocuments();
        this.testNumber = `RAD${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const Radiology = mongoose.model('Radiology', radiologySchema);

module.exports = Radiology;
