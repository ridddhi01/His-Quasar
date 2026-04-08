const mongoose = require('mongoose');

/**
 * InventoryCategory Model
 * Represents categories and sub-categories for non-medicine inventory items
 */

const inventoryCategorySchema = new mongoose.Schema(
    {
        categoryCode: {
            type: String,
            required: [true, 'Category code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        categoryName: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
        },
        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryCategory',
        },
        description: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
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
inventoryCategorySchema.index({ categoryCode: 1 });
inventoryCategorySchema.index({ categoryName: 1 });
inventoryCategorySchema.index({ parentCategory: 1 });

const InventoryCategory = mongoose.model('InventoryCategory', inventoryCategorySchema);

module.exports = InventoryCategory;
