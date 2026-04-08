const mongoose = require('mongoose');

/**
 * InsuranceProvider Model
 * Represents insurance company master
 */

const insuranceProviderSchema = new mongoose.Schema(
    {
        providerCode: {
            type: String,
            unique: true,
            required: [true, 'Provider code is required'],
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['tpa', 'psu', 'private', 'government'],
            required: true,
        },
        contactPerson: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            pincode: { type: String, trim: true },
        },
        website: {
            type: String,
            trim: true,
        },
        claimSubmissionEmail: {
            type: String,
            trim: true,
        },
        settlementPeriod: {
            type: Number, // days
            default: 30,
        },
        discountPercent: {
            type: Number,
            default: 0,
        },
        panelRate: {
            type: Number, // percentage of tariff
            default: 100,
        },
        isActive: {
            type: Boolean,
            default: true,
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

// Indexes
insuranceProviderSchema.index({ providerCode: 1 });
insuranceProviderSchema.index({ name: 'text' });
insuranceProviderSchema.index({ isActive: 1 });

const InsuranceProvider = mongoose.model('InsuranceProvider', insuranceProviderSchema);

module.exports = InsuranceProvider;
