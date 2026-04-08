const mongoose = require('mongoose');

/**
 * Department Model
 * Represents hospital departments
 */

const departmentSchema = new mongoose.Schema(
    {
        departmentCode: {
            type: String,
            unique: true,
            required: [true, 'Department code is required'],
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Department name is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['clinical', 'diagnostic', 'support', 'administrative'],
            required: true,
        },
        head: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        location: {
            building: { type: String, trim: true },
            floor: { type: String, trim: true },
            wing: { type: String, trim: true },
        },
        contactNumber: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        operatingHours: {
            start: { type: String },
            end: { type: String },
        },
        isEmergencyAvailable: {
            type: Boolean,
            default: false,
        },
        consultationFee: {
            type: Number,
            min: [0, 'Fee cannot be negative'],
        },
        followupFee: {
            type: Number,
            min: [0, 'Fee cannot be negative'],
        },
        description: {
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
departmentSchema.index({ departmentCode: 1 });
departmentSchema.index({ name: 'text' });
departmentSchema.index({ type: 1 });
departmentSchema.index({ isActive: 1 });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
