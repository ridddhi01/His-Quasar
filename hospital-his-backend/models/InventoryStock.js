const mongoose = require('mongoose');
const { INVENTORY_STATUS } = require('../config/constants');

/**
 * InventoryStock Model
 * Represents batch-wise stock ledger at each location
 */

const inventoryStockSchema = new mongoose.Schema(
    {
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem',
            required: [true, 'Item is required'],
        },
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: [true, 'Location is required'],
        },
        batchNumber: {
            type: String,
            trim: true,
        },
        expiryDate: {
            type: Date,
        },
        manufacturingDate: {
            type: Date,
        },
        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        reservedQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        availableQuantity: {
            type: Number,
            default: 0,
        },
        purchaseRate: {
            type: Number,
            default: 0,
        },
        sellingRate: {
            type: Number,
            default: 0,
        },
        grn: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GRN',
        },
        status: {
            type: String,
            enum: Object.values(INVENTORY_STATUS),
            default: INVENTORY_STATUS.AVAILABLE,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        blockReason: {
            type: String,
            trim: true,
        },
        blockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        blockedAt: {
            type: Date,
        },
        lastMovementDate: {
            type: Date,
        },
        lastMovementType: {
            type: String,
            enum: ['receipt', 'issue', 'return', 'transfer-in', 'transfer-out', 'adjustment'],
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

// Compound indexes for efficient queries
inventoryStockSchema.index({ item: 1, location: 1, batchNumber: 1 }, { unique: true, sparse: true });
inventoryStockSchema.index({ item: 1, location: 1 });
inventoryStockSchema.index({ location: 1 });
inventoryStockSchema.index({ expiryDate: 1 });
inventoryStockSchema.index({ status: 1 });
inventoryStockSchema.index({ quantity: 1 });

// Calculate available quantity before saving
inventoryStockSchema.pre('save', function (next) {
    this.availableQuantity = this.quantity - this.reservedQuantity;
    next();
});

// Virtual for checking if expired
inventoryStockSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});

// Virtual for checking if near expiry (30 days)
inventoryStockSchema.virtual('isNearExpiry').get(function () {
    if (!this.expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.expiryDate <= thirtyDaysFromNow && !this.isExpired;
});

inventoryStockSchema.set('toJSON', { virtuals: true });
inventoryStockSchema.set('toObject', { virtuals: true });

const InventoryStock = mongoose.model('InventoryStock', inventoryStockSchema);

module.exports = InventoryStock;
