const mongoose = require('mongoose');
const { STOCK_RETURN_STATUS } = require('../config/constants');

/**
 * StockReturn Model
 * Represents stock returns with mandatory reason capture
 */

const returnItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    acceptedQuantity: {
        type: Number,
        default: 0,
    },
    batchNumber: {
        type: String,
        trim: true,
    },
    expiryDate: {
        type: Date,
    },
    condition: {
        type: String,
        enum: ['good', 'damaged', 'expired', 'defective'],
        required: true,
    },
    remarks: {
        type: String,
        trim: true,
    },
});

const stockReturnSchema = new mongoose.Schema(
    {
        returnNumber: {
            type: String,
            unique: true,
            required: true,
        },
        originalIssue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StockIssue',
        },
        returningDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        returningLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        receivingLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: true,
        },
        returnDate: {
            type: Date,
            default: Date.now,
        },
        items: [returnItemSchema],
        returnReason: {
            type: String,
            required: [true, 'Return reason is required'],
            trim: true,
        },
        returnCategory: {
            type: String,
            enum: ['excess', 'damaged', 'expired', 'wrong-item', 'not-required', 'quality-issue', 'other'],
            required: true,
        },
        totalReturnedQuantity: {
            type: Number,
            default: 0,
        },
        totalAcceptedQuantity: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(STOCK_RETURN_STATUS),
            default: STOCK_RETURN_STATUS.PENDING,
        },
        returnedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        receivedAt: {
            type: Date,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        processedAt: {
            type: Date,
        },
        processingRemarks: {
            type: String,
            trim: true,
        },
        stockUpdated: {
            type: Boolean,
            default: false,
        },
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
stockReturnSchema.index({ returnNumber: 1 });
stockReturnSchema.index({ returningDepartment: 1 });
stockReturnSchema.index({ receivingLocation: 1 });
stockReturnSchema.index({ status: 1 });
stockReturnSchema.index({ returnDate: -1 });

// Auto-generate return number before saving
stockReturnSchema.pre('save', async function (next) {
    if (this.isNew && !this.returnNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('StockReturn').countDocuments();
        this.returnNumber = `RTN${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const StockReturn = mongoose.model('StockReturn', stockReturnSchema);

module.exports = StockReturn;
