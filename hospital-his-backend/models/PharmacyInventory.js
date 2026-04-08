const mongoose = require('mongoose');
const { INVENTORY_STATUS } = require('../config/constants');

/**
 * PharmacyInventory Model
 * Represents pharmacy stock with batch tracking
 */

const pharmacyInventorySchema = new mongoose.Schema(
    {
        medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            required: [true, 'Medicine is required'],
        },
        batchNumber: {
            type: String,
            required: [true, 'Batch number is required'],
            trim: true,
        },
        expiryDate: {
            type: Date,
            required: [true, 'Expiry date is required'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [0, 'Quantity cannot be negative'],
        },
        purchaseRate: {
            type: Number,
            required: [true, 'Purchase rate is required'],
            min: [0, 'Purchase rate cannot be negative'],
        },
        sellingRate: {
            type: Number,
            required: [true, 'Selling rate is required'],
            min: [0, 'Selling rate cannot be negative'],
        },
        supplier: {
            type: String,
            trim: true,
        },
        purchaseDate: {
            type: Date,
            default: Date.now,
        },
        invoiceNumber: {
            type: String,
            trim: true,
        },
        // GRN (Goods Receipt Note) tracking
        grnNumber: {
            type: String,
            trim: true,
        },
        grnDate: Date,
        status: {
            type: String,
            enum: Object.values(INVENTORY_STATUS),
            default: INVENTORY_STATUS.AVAILABLE,
        },
        location: {
            type: String,
            trim: true,
        },
        // Recall tracking
        isRecalled: {
            type: Boolean,
            default: false,
        },
        recallRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DrugRecall',
        },
        recalledAt: Date,
        recallBlockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
pharmacyInventorySchema.index({ medicine: 1 });
pharmacyInventorySchema.index({ batchNumber: 1 });
pharmacyInventorySchema.index({ expiryDate: 1 });
pharmacyInventorySchema.index({ status: 1 });
pharmacyInventorySchema.index({ medicine: 1, batchNumber: 1 }, { unique: true });

// Pre-save hook to update status based on quantity and expiry
pharmacyInventorySchema.pre('save', function (next) {
    const today = new Date();

    // Check if expired
    if (this.expiryDate <= today) {
        this.status = INVENTORY_STATUS.EXPIRED;
    } else if (this.quantity <= 0) {
        this.status = INVENTORY_STATUS.OUT_OF_STOCK;
    } else {
        // Check against medicine's reorder level (would need to populate)
        // For now, use a default threshold
        if (this.quantity <= 10) {
            this.status = INVENTORY_STATUS.LOW_STOCK;
        } else {
            this.status = INVENTORY_STATUS.AVAILABLE;
        }
    }
    next();
});

const PharmacyInventory = mongoose.model('PharmacyInventory', pharmacyInventorySchema);

module.exports = PharmacyInventory;
