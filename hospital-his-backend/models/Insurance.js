const mongoose = require('mongoose');
const { INSURANCE_CLAIM_STATUS } = require('../config/constants');

/**
 * Insurance Model
 * Represents insurance claims
 */

const insuranceSchema = new mongoose.Schema(
    {
        claimNumber: {
            type: String,
            unique: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        admission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
        },
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InsuranceProvider',
            required: [true, 'Insurance provider is required'],
        },
        policyNumber: {
            type: String,
            required: [true, 'Policy number is required'],
            trim: true,
        },
        claimAmount: {
            type: Number,
            required: [true, 'Claim amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        approvedAmount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(INSURANCE_CLAIM_STATUS),
            default: INSURANCE_CLAIM_STATUS.PENDING,
        },
        submittedDate: {
            type: Date,
            default: Date.now,
        },
        approvalDate: {
            type: Date,
        },
        settlementDate: {
            type: Date,
        },
        documents: [{ type: String }],
        remarks: {
            type: String,
            trim: true,
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
        handledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Pre-Authorization
        preAuthStatus: {
            type: String,
            enum: ['not_required', 'pending', 'approved', 'rejected'],
            default: 'not_required',
        },
        preAuthNumber: {
            type: String,
            trim: true,
        },
        preAuthDate: {
            type: Date,
        },
        preAuthAmount: {
            type: Number,
            default: 0,
        },
        // ICD Coding (Mandatory for claim submission)
        icdCodes: [
            {
                code: {
                    type: String,
                    required: true,
                    trim: true,
                },
                description: {
                    type: String,
                    trim: true,
                },
                version: {
                    type: String,
                    enum: ['ICD-10', 'ICD-11'],
                    default: 'ICD-10',
                },
            },
        ],
        // Package Mapping
        packageCode: {
            type: String,
            trim: true,
        },
        packageName: {
            type: String,
            trim: true,
        },
        packageAmount: {
            type: Number,
            default: 0,
        },
        // Settlement Details
        settlementAmount: {
            type: Number,
            default: 0,
        },
        settlementReference: {
            type: String,
            trim: true,
        },
        settlementRemarks: {
            type: String,
            trim: true,
        },
        // TPA Details
        tpaProvider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TPAProvider',
        },
        // Claim Lifecycle Tracking
        claimLifecycle: [
            {
                status: {
                    type: String,
                    required: true,
                },
                updatedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                updatedAt: {
                    type: Date,
                    default: Date.now,
                },
                remarks: {
                    type: String,
                    trim: true,
                },
            },
        ],
        // Audit Trail
        auditTrail: [
            {
                action: {
                    type: String,
                    required: true,
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                performedAt: {
                    type: Date,
                    default: Date.now,
                },
                details: {
                    type: mongoose.Schema.Types.Mixed,
                },
                previousValue: mongoose.Schema.Types.Mixed,
                newValue: mongoose.Schema.Types.Mixed,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes
insuranceSchema.index({ claimNumber: 1 });
insuranceSchema.index({ patient: 1 });
insuranceSchema.index({ status: 1 });
insuranceSchema.index({ provider: 1 });
insuranceSchema.index({ submittedDate: -1 });

// Auto-generate claimNumber before saving
// Validation middleware
insuranceSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Insurance').countDocuments();
        this.claimNumber = `CLM${dateStr}${String(count + 1).padStart(5, '0')}`;
    }

    // Validate ICD codes are present before submitting claim
    if (this.status !== 'pending' && this.status !== 'pre-authorized' && (!this.icdCodes || this.icdCodes.length === 0)) {
        return next(new Error('ICD codes are mandatory before claim submission'));
    }

    next();
});

const Insurance = mongoose.model('Insurance', insuranceSchema);

module.exports = Insurance;
