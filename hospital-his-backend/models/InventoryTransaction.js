const mongoose = require('mongoose');

/**
 * InventoryTransaction Model
 * Represents stock in/out records
 */

const inventoryTransactionSchema = new mongoose.Schema(
    {
        transactionNumber: {
            type: String,
            unique: true,
            required: true,
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory',
            required: [true, 'Item is required'],
        },
        transactionType: {
            type: String,
            enum: ['stock-in', 'stock-out', 'adjustment', 'transfer', 'return'],
            required: [true, 'Transaction type is required'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
        },
        previousQuantity: {
            type: Number,
            required: true,
        },
        newQuantity: {
            type: Number,
            required: true,
        },
        rate: {
            type: Number,
            min: [0, 'Rate cannot be negative'],
        },
        totalAmount: {
            type: Number,
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        issuedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        supplier: {
            type: String,
            trim: true,
        },
        invoiceNumber: {
            type: String,
            trim: true,
        },
        reason: {
            type: String,
            trim: true,
        },
        remarks: {
            type: String,
            trim: true,
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
inventoryTransactionSchema.index({ transactionNumber: 1 });
inventoryTransactionSchema.index({ item: 1 });
inventoryTransactionSchema.index({ transactionType: 1 });
inventoryTransactionSchema.index({ createdAt: -1 });

// Auto-generate transactionNumber before saving
inventoryTransactionSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('InventoryTransaction').countDocuments();
        this.transactionNumber = `INV${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

module.exports = InventoryTransaction;
