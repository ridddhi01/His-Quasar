const mongoose = require('mongoose');

/**
 * BillingItem Model
 * Represents individual billing items (separate from embedded items for complex queries)
 */

const billingItemSchema = new mongoose.Schema(
    {
        bill: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Billing',
            required: [true, 'Bill is required'],
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        itemType: {
            type: String,
            enum: ['consultation', 'procedure', 'lab', 'radiology', 'medicine', 'bed', 'surgery', 'nursing', 'other'],
            required: [true, 'Item type is required'],
        },
        itemReference: {
            type: mongoose.Schema.Types.ObjectId,
        },
        itemModel: {
            type: String,
            enum: ['LabTest', 'Radiology', 'Prescription', 'Surgery', 'Admission', 'Appointment'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
        rate: {
            type: Number,
            required: [true, 'Rate is required'],
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
        discountPercent: {
            type: Number,
            default: 0,
        },
        tax: {
            type: Number,
            default: 0,
        },
        taxPercent: {
            type: Number,
            default: 0,
        },
        netAmount: {
            type: Number,
            required: true,
        },
        isBilled: {
            type: Boolean,
            default: false,
        },
        billedAt: {
            type: Date,
        },
        serviceDate: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
billingItemSchema.index({ bill: 1 });
billingItemSchema.index({ patient: 1 });
billingItemSchema.index({ itemType: 1 });
billingItemSchema.index({ isBilled: 1 });
billingItemSchema.index({ serviceDate: -1 });

// Pre-save hook to calculate amounts
billingItemSchema.pre('save', function (next) {
    this.amount = this.quantity * this.rate;

    if (this.discountPercent > 0) {
        this.discount = (this.amount * this.discountPercent) / 100;
    }

    const afterDiscount = this.amount - this.discount;

    if (this.taxPercent > 0) {
        this.tax = (afterDiscount * this.taxPercent) / 100;
    }

    this.netAmount = afterDiscount + this.tax;
    next();
});

const BillingItem = mongoose.model('BillingItem', billingItemSchema);

module.exports = BillingItem;
