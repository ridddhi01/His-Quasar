const mongoose = require('mongoose');
const { AI_PREDICTION_TYPES } = require('../config/constants');

/**
 * AIPrediction Model
 * Represents AI predictions and operational forecasts
 */

const aiPredictionSchema = new mongoose.Schema(
    {
        predictionType: {
            type: String,
            enum: Object.values(AI_PREDICTION_TYPES),
            required: [true, 'Prediction type is required'],
        },
        predictionDate: {
            type: Date,
            default: Date.now,
        },
        forecastPeriod: {
            from: { type: Date, required: true },
            to: { type: Date, required: true },
        },
        predictions: [
            {
                timestamp: { type: Date, required: true },
                predictedValue: { type: Number, required: true },
                confidence: { type: Number, min: 0, max: 1 },
                lowerBound: { type: Number },
                upperBound: { type: Number },
            },
        ],
        aggregatedPrediction: {
            average: { type: Number },
            peak: { type: Number },
            peakTime: { type: Date },
            minimum: { type: Number },
            minimumTime: { type: Date },
        },
        accuracy: {
            type: Number, // Calculated after actual data is available
            min: 0,
            max: 1,
        },
        actualValues: [
            {
                timestamp: { type: Date },
                actualValue: { type: Number },
            },
        ],
        modelVersion: {
            type: String,
            trim: true,
        },
        metadata: {
            trainingDataRange: {
                from: { type: Date },
                to: { type: Date },
            },
            algorithm: { type: String, trim: true },
            features: [{ type: String }],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
aiPredictionSchema.index({ predictionType: 1 });
aiPredictionSchema.index({ predictionDate: -1 });
aiPredictionSchema.index({ 'forecastPeriod.from': 1, 'forecastPeriod.to': 1 });

const AIPrediction = mongoose.model('AIPrediction', aiPredictionSchema);

module.exports = AIPrediction;
