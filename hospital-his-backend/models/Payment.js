const mongoose = require('mongoose');
const { PAYMENT_MODES } = require('../config/constants');

/**
 * Payment Model
 * Represents payment transactions
 */

const paymentSchema = new mongoose.Schema(
    {
        receiptNumber: {
            type: String,
            unique: true,
            required: true,
        },
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
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        paymentMode: {
            type: String,
            enum: Object.values(PAYMENT_MODES),
            required: [true, 'Payment mode is required'],
        },
        paymentDetails: {
            transactionId: { type: String, trim: true },
            cardLast4: { type: String, trim: true },
            bankName: { type: String, trim: true },
            chequeNumber: { type: String, trim: true },
            upiId: { type: String, trim: true },
        },
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        collectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Collected by is required'],
        },
        remarks: {
            type: String,
            trim: true,
        },
        isRefunded: {
            type: Boolean,
            default: false,
        },
        refundedAt: {
            type: Date,
        },
        refundReason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ bill: 1 });
paymentSchema.index({ patient: 1 });
paymentSchema.index({ paymentDate: -1 });

// Auto-generate receiptNumber before saving
paymentSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Payment').countDocuments();
        this.receiptNumber = `RCP${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
