const mongoose = require('mongoose');
const { INVENTORY_RECALL_STATUS } = require('../config/constants');

/**
 * InventoryRecall Model
 * Represents item or batch-level recalls across all locations
 */

const recallLocationSchema = new mongoose.Schema({
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true,
    },
    quantityAffected: {
        type: Number,
        default: 0,
    },
    quantityRecalled: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'not-applicable'],
        default: 'pending',
    },
    recalledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    recalledAt: {
        type: Date,
    },
    remarks: {
        type: String,
        trim: true,
    },
});

const inventoryRecallSchema = new mongoose.Schema(
    {
        recallNumber: {
            type: String,
            unique: true,
            required: true,
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem',
            required: [true, 'Item is required'],
        },
        batchNumber: {
            type: String,
            trim: true,
        },
        recallType: {
            type: String,
            enum: ['item-level', 'batch-level'],
            required: true,
        },
        recallClass: {
            type: String,
            enum: ['class-i', 'class-ii', 'class-iii'],
            default: 'class-ii',
        },
        recallReason: {
            type: String,
            required: [true, 'Recall reason is required'],
            trim: true,
        },
        recallDescription: {
            type: String,
            trim: true,
        },
        manufacturerNotice: {
            type: String,
            trim: true,
        },
        regulatoryReference: {
            type: String,
            trim: true,
        },
        recallDate: {
            type: Date,
            default: Date.now,
        },
        effectiveDate: {
            type: Date,
            default: Date.now,
        },
        affectedLocations: [recallLocationSchema],
        totalQuantityAffected: {
            type: Number,
            default: 0,
        },
        totalQuantityRecalled: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(INVENTORY_RECALL_STATUS),
            default: INVENTORY_RECALL_STATUS.ACTIVE,
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        completedAt: {
            type: Date,
        },
        completionRemarks: {
            type: String,
            trim: true,
        },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        cancelledAt: {
            type: Date,
        },
        cancellationReason: {
            type: String,
            trim: true,
        },
        auditTrail: [{
            action: { type: String, required: true },
            performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            performedAt: { type: Date, default: Date.now },
            location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
            details: { type: mongoose.Schema.Types.Mixed },
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
inventoryRecallSchema.index({ recallNumber: 1 });
inventoryRecallSchema.index({ item: 1 });
inventoryRecallSchema.index({ batchNumber: 1 });
inventoryRecallSchema.index({ status: 1 });
inventoryRecallSchema.index({ recallDate: -1 });

// Auto-generate recall number before saving
inventoryRecallSchema.pre('save', async function (next) {
    if (this.isNew && !this.recallNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('InventoryRecall').countDocuments();
        this.recallNumber = `RCL${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const InventoryRecall = mongoose.model('InventoryRecall', inventoryRecallSchema);

module.exports = InventoryRecall;
