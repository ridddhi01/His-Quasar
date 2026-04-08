const mongoose = require('mongoose');
const { AI_ANOMALY_TYPES, AI_ANOMALY_STATUS } = require('../config/constants');

/**
 * AIAnomaly Model
 * Represents AI-detected revenue leakage anomalies
 */

const aiAnomalySchema = new mongoose.Schema(
    {
        anomalyType: {
            type: String,
            enum: Object.values(AI_ANOMALY_TYPES),
            required: [true, 'Anomaly type is required'],
        },
        detectionDate: {
            type: Date,
            default: Date.now,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
        },
        visit: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'visitModel',
        },
        visitModel: {
            type: String,
            enum: ['Appointment', 'Admission', 'Emergency'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        details: {
            service: { type: String, trim: true },
            expectedRevenue: { type: Number },
            actualRevenue: { type: Number },
            leakageAmount: { type: Number },
            relatedItems: [{ type: mongoose.Schema.Types.Mixed }],
        },
        status: {
            type: String,
            enum: Object.values(AI_ANOMALY_STATUS),
            default: AI_ANOMALY_STATUS.DETECTED,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },
        resolutionNotes: {
            type: String,
            trim: true,
        },
        anomalyScore: {
            type: Number,
            min: 0,
            max: 1,
        },
        modelVersion: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
aiAnomalySchema.index({ anomalyType: 1 });
aiAnomalySchema.index({ status: 1 });
aiAnomalySchema.index({ patient: 1 });
aiAnomalySchema.index({ detectionDate: -1 });
aiAnomalySchema.index({ anomalyScore: -1 });

const AIAnomaly = mongoose.model('AIAnomaly', aiAnomalySchema);

module.exports = AIAnomaly;
