const mongoose = require('mongoose');
const { PAYMENT_STATUS, VISIT_TYPES } = require('../config/constants');

/**
 * Billing Model
 * Represents bills and invoices
 */

const billingSchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            unique: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        visit: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'visitModel',
            // Optional for manual bills
        },
        visitModel: {
            type: String,
            enum: ['Appointment', 'Admission', 'Emergency'],
            // Required only if visit is present
        },
        visitType: {
            type: String,
            enum: Object.values(VISIT_TYPES),
            default: 'opd',
        },
        billDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['draft', 'finalized', 'cancelled'],
            default: 'draft',
        },
        items: [
            {
                itemType: {
                    type: String,
                    enum: ['consultation', 'procedure', 'lab', 'radiology', 'medicine', 'bed', 'surgery', 'nursing', 'other'],
                    required: true,
                },
                itemReference: {
                    type: mongoose.Schema.Types.ObjectId,
                },
                description: {
                    type: String,
                    required: true,
                    trim: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: [1, 'Quantity must be at least 1'],
                },
                rate: {
                    type: Number,
                    required: true,
                    min: [0, 'Rate cannot be negative'],
                },
                amount: {
                    type: Number,
                    required: true,
                },
                discount: {
                    type: Number,
                    default: 0,
                },
                tax: {
                    type: Number,
                    default: 0,
                },
                netAmount: {
                    type: Number,
                    required: true,
                },
                isBilled: {
                    type: Boolean,
                    default: true,
                },
                billedAt: {
                    type: Date,
                    default: Date.now,
                },
                isSystemGenerated: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        subtotal: {
            type: Number,
            required: true,
            default: 0,
        },
        totalDiscount: {
            type: Number,
            default: 0,
        },
        totalTax: {
            type: Number,
            default: 0,
        },
        grandTotal: {
            type: Number,
            required: true,
            default: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        balanceAmount: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: Object.values(PAYMENT_STATUS),
            default: PAYMENT_STATUS.PENDING,
        },
        insuranceClaim: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Insurance',
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Payment Responsibility
        paymentResponsibility: {
            patientAmount: { type: Number, default: 0 },
            insuranceAmount: { type: Number, default: 0 },
        },
        insuranceStatus: {
            type: String,
            enum: ['none', 'pending', 'submitted', 'approved', 'rejected', 'settled'],
            default: 'none',
        },
        // Discount Approval Workflow
        discountRequest: {
            amount: { type: Number, default: 0 },
            reason: { type: String, trim: true },
            requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            requestedAt: { type: Date },
            status: {
                type: String,
                enum: ['none', 'pending', 'approved', 'rejected'],
                default: 'none',
            },
        },
        discountApprovedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        discountApprovalDate: {
            type: Date,
        },
        discountRejectionReason: {
            type: String,
            trim: true,
        },
        // Lock Mechanism
        isLocked: {
            type: Boolean,
            default: false,
        },
        lockedAt: {
            type: Date,
        },
        lockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Audit Trail
        auditTrail: [
            {
                action: {
                    type: String,
                    required: true,
                    // Actions: created, updated, finalized, discount_requested, discount_approved, discount_rejected, payment_received, cancelled
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
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes
billingSchema.index({ billNumber: 1 });
billingSchema.index({ patient: 1 });
billingSchema.index({ visit: 1 });
billingSchema.index({ paymentStatus: 1 });
billingSchema.index({ billDate: -1 });

// Auto-generate billNumber before saving
billingSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Billing').countDocuments();
        this.billNumber = `BILL${dateStr}${String(count + 1).padStart(5, '0')}`;
    }

    // Calculate totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.totalTax = this.items.reduce((sum, item) => sum + (item.tax || 0), 0);
    this.grandTotal = this.subtotal - this.totalDiscount + this.totalTax;
    this.balanceAmount = this.grandTotal - this.paidAmount;

    // Update payment status
    if (this.paidAmount >= this.grandTotal) {
        this.paymentStatus = PAYMENT_STATUS.PAID;
    } else if (this.paidAmount > 0) {
        this.paymentStatus = PAYMENT_STATUS.PARTIAL;
    } else {
        this.paymentStatus = PAYMENT_STATUS.PENDING;
    }

    next();
});

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;
