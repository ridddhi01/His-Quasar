const mongoose = require('mongoose');
const { INVENTORY_STATUS } = require('../config/constants');

/**
 * InventoryItem Model
 * Master data for non-medicine inventory items
 */

const changeHistorySchema = new mongoose.Schema({
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
});

const inventoryItemSchema = new mongoose.Schema(
    {
        itemCode: {
            type: String,
            required: [true, 'Item code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        itemName: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryCategory',
            required: [true, 'Category is required'],
        },
        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryCategory',
        },
        uom: {
            type: String,
            required: [true, 'Unit of Measure is required'],
            trim: true, // e.g., 'PCS', 'KG', 'LTR', 'BOX', 'SET'
        },
        reorderLevel: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxStockLevel: {
            type: Number,
            default: 0,
            min: 0,
        },
        batchTracking: {
            type: Boolean,
            default: false,
        },
        expiryTracking: {
            type: Boolean,
            default: false,
        },
        hsnCode: {
            type: String,
            trim: true,
        },
        gstRate: {
            type: Number,
            default: 0,
        },
        specifications: {
            type: Map,
            of: String,
        },
        defaultLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        status: {
            type: String,
            enum: Object.values(INVENTORY_STATUS),
            default: INVENTORY_STATUS.AVAILABLE,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deactivatedAt: {
            type: Date,
        },
        deactivatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        deactivationReason: {
            type: String,
        },
        changeHistory: [changeHistorySchema],
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
inventoryItemSchema.index({ itemCode: 1 });
inventoryItemSchema.index({ itemName: 'text' });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ status: 1 });
inventoryItemSchema.index({ isActive: 1 });

// Pre-save middleware for audit logging
inventoryItemSchema.pre('save', async function (next) {
    if (!this.isNew) {
        const modifiedPaths = this.modifiedPaths();
        const fieldsToTrack = ['itemName', 'description', 'category', 'subCategory', 'uom',
            'reorderLevel', 'maxStockLevel', 'batchTracking', 'expiryTracking', 'status', 'isActive'];

        for (const path of modifiedPaths) {
            if (fieldsToTrack.includes(path)) {
                // Note: This requires the calling code to set _modifiedBy on the document
                if (this._modifiedBy) {
                    this.changeHistory.push({
                        field: path,
                        oldValue: this._previousValues ? this._previousValues[path] : undefined,
                        newValue: this.get(path),
                        changedBy: this._modifiedBy,
                        reason: this._modificationReason || 'Update',
                    });
                }
            }
        }
    }
    next();
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

module.exports = InventoryItem;
