const mongoose = require('mongoose');
const { INVENTORY_STATUS } = require('../config/constants');

const inventorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Medicine name is required'],
            trim: true,
            unique: true,
        },
        genericName: {
            type: String,
            trim: true,
        },
        category: {
            type: String, // e.g., Tablet, Syrup, Injection
            required: true,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            default: 0,
        },
        batchNumber: {
            type: String,
            trim: true,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        manufacturer: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(INVENTORY_STATUS),
            default: INVENTORY_STATUS.AVAILABLE,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
inventorySchema.index({ name: 1 });
inventorySchema.index({ genericName: 1 });
inventorySchema.index({ stock: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
