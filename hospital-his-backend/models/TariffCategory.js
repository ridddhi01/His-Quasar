const mongoose = require('mongoose');

/**
 * TariffCategory Model
 * Represents tariff categories for grouping services
 */

const tariffCategorySchema = new mongoose.Schema(
    {
        categoryCode: {
            type: String,
            unique: true,
            required: [true, 'Category code is required'],
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TariffCategory',
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
tariffCategorySchema.index({ categoryCode: 1 });
tariffCategorySchema.index({ name: 'text' });
tariffCategorySchema.index({ parent: 1 });

// Virtual for child categories
tariffCategorySchema.virtual('children', {
    ref: 'TariffCategory',
    localField: '_id',
    foreignField: 'parent',
});

tariffCategorySchema.set('toJSON', { virtuals: true });
tariffCategorySchema.set('toObject', { virtuals: true });

const TariffCategory = mongoose.model('TariffCategory', tariffCategorySchema);

module.exports = TariffCategory;
