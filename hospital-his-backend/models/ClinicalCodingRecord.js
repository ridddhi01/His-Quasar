const mongoose = require('mongoose');
const { CLINICAL_CODING_STATUS } = require('../config/constants');

/**
 * Clinical Coding Record Model
 * Links procedure codes to patient encounters (OPD/IPD)
 * Auto-created when an encounter is finalized
 */

const clinicalCodingRecordSchema = new mongoose.Schema(
    {
        codingNumber: {
            type: String,
            unique: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        encounter: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'encounterModel',
            required: [true, 'Encounter is required'],
        },
        encounterModel: {
            type: String,
            enum: ['Appointment', 'Admission', 'Emergency'],
            required: [true, 'Encounter model is required'],
        },
        encounterType: {
            type: String,
            enum: ['opd', 'ipd', 'emergency'],
            required: true,
        },
        finalizingDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Finalizing doctor is required'],
        },
        status: {
            type: String,
            enum: Object.values(CLINICAL_CODING_STATUS),
            default: CLINICAL_CODING_STATUS.AWAITING_CODING,
        },
        // Assigned procedure codes
        assignedCodes: [{
            code: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ProcedureCode',
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1,
            },
            modifier: {
                type: String,
                trim: true,
                // CPT modifiers like "25", "59", "76"
            },
            modifier2: {
                type: String,
                trim: true,
            },
            diagnosisPointer: {
                type: String,
                trim: true,
                // Links to diagnosis codes (A, B, C, D)
            },
            units: {
                type: Number,
                default: 1,
            },
            amount: {
                type: Number,
                default: 0,
            },
            notes: {
                type: String,
                trim: true,
            },
            addedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        // Diagnosis codes (ICD-10)
        diagnosisCodes: [{
            code: {
                type: String,
                required: true,
                trim: true,
            },
            description: {
                type: String,
                trim: true,
            },
            isPrimary: {
                type: Boolean,
                default: false,
            },
            sequence: {
                type: String,
                // A, B, C, D for claim linking
            },
        }],
        // Coder notes and workflow
        coderNotes: {
            type: String,
            trim: true,
        },
        codingQueries: [{
            query: {
                type: String,
                required: true,
            },
            raisedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            raisedAt: {
                type: Date,
                default: Date.now,
            },
            response: {
                type: String,
            },
            respondedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            respondedAt: {
                type: Date,
            },
            status: {
                type: String,
                enum: ['open', 'answered', 'closed'],
                default: 'open',
            },
        }],
        // Workflow tracking
        codedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        codedAt: {
            type: Date,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },
        // Link to billing
        linkedBill: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Billing',
        },
        billSyncedAt: {
            type: Date,
        },
        // Submission tracking
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        submittedAt: {
            type: Date,
        },
        // Approval tracking
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: {
            type: Date,
        },
        // Return tracking
        returnHistory: [{
            returnedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            returnedAt: {
                type: Date,
                default: Date.now,
            },
            reason: {
                type: String,
                required: true,
                trim: true,
            },
            resolvedAt: {
                type: Date,
            },
        }],
        currentReturnReason: {
            type: String,
            trim: true,
        },
        // Audit trail
        auditTrail: [{
            action: {
                type: String,
                required: true,
                // created, codes_added, codes_removed, status_changed, reviewed, synced_to_bill
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
            previousStatus: String,
            newStatus: String,
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
clinicalCodingRecordSchema.index({ codingNumber: 1 });
clinicalCodingRecordSchema.index({ patient: 1 });
clinicalCodingRecordSchema.index({ encounter: 1, encounterModel: 1 }, { unique: true });
clinicalCodingRecordSchema.index({ status: 1 });
clinicalCodingRecordSchema.index({ finalizingDoctor: 1 });
clinicalCodingRecordSchema.index({ codedBy: 1 });
clinicalCodingRecordSchema.index({ createdAt: -1 });

// Auto-generate codingNumber before saving
clinicalCodingRecordSchema.pre('save', async function (next) {
    if (this.isNew && !this.codingNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('ClinicalCodingRecord').countDocuments();
        this.codingNumber = `COD${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Method to add audit entry
clinicalCodingRecordSchema.methods.addAuditEntry = function (action, userId, details = {}, statusChange = null) {
    const entry = {
        action,
        performedBy: userId,
        performedAt: new Date(),
        details,
    };
    if (statusChange) {
        entry.previousStatus = statusChange.from;
        entry.newStatus = statusChange.to;
    }
    this.auditTrail.push(entry);
};

// Virtual for total coded amount
clinicalCodingRecordSchema.virtual('totalAmount').get(function () {
    return this.assignedCodes.reduce((sum, code) => sum + (code.amount || 0) * (code.quantity || 1), 0);
});

// Ensure virtuals are included in JSON
clinicalCodingRecordSchema.set('toJSON', { virtuals: true });
clinicalCodingRecordSchema.set('toObject', { virtuals: true });

const ClinicalCodingRecord = mongoose.model('ClinicalCodingRecord', clinicalCodingRecordSchema);

module.exports = ClinicalCodingRecord;
