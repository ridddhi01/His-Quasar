const mongoose = require('mongoose');

/**
 * Ward Model
 * Represents hospital wards
 */

const wardSchema = new mongoose.Schema(
    {
        wardCode: {
            type: String,
            unique: true,
            required: [true, 'Ward code is required'],
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Ward name is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['general', 'semi-private', 'private', 'icu', 'nicu', 'picu', 'ccu', 'emergency', 'maternity', 'pediatric'],
            required: true,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        floor: {
            type: String,
            trim: true,
        },
        building: {
            type: String,
            trim: true,
        },
        totalBeds: {
            type: Number,
            default: 0,
        },
        nurseStation: {
            type: String,
            trim: true,
        },
        inCharge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        contactNumber: {
            type: String,
            trim: true,
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
wardSchema.index({ wardCode: 1 });
wardSchema.index({ name: 'text' });
wardSchema.index({ type: 1 });
wardSchema.index({ department: 1 });

// Virtual for available beds count (would need to query Bed model)
wardSchema.virtual('beds', {
    ref: 'Bed',
    localField: '_id',
    foreignField: 'ward',
});

wardSchema.set('toJSON', { virtuals: true });
wardSchema.set('toObject', { virtuals: true });

const Ward = mongoose.model('Ward', wardSchema);

module.exports = Ward;
