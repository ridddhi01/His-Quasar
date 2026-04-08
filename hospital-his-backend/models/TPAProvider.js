const mongoose = require('mongoose');

/**
 * TPA Provider Model
 * Represents Third Party Administrator providers for insurance claims
 */

const tpaProviderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'TPA name is required'],
            trim: true,
            unique: true,
        },
        code: {
            type: String,
            required: [true, 'TPA code is required'],
            trim: true,
            unique: true,
            uppercase: true,
        },
        contactPerson: {
            name: {
                type: String,
                trim: true,
            },
            designation: {
                type: String,
                trim: true,
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
            },
            phone: {
                type: String,
                trim: true,
            },
        },
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: {
                type: String,
                default: 'India',
            },
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true,
        },
        agreementDetails: {
            agreementNumber: String,
            startDate: Date,
            endDate: Date,
            terms: String,
        },
        claimSubmissionEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        claimSubmissionPortal: {
            type: String,
            trim: true,
        },
        averageSettlementTime: {
            type: Number, // in days
            default: 30,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
tpaProviderSchema.index({ code: 1 });
tpaProviderSchema.index({ name: 1 });
tpaProviderSchema.index({ isActive: 1 });

const TPAProvider = mongoose.model('TPAProvider', tpaProviderSchema);

module.exports = TPAProvider;
