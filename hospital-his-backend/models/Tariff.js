const mongoose = require('mongoose');

/**
 * Tariff Model
 * Represents service pricing master
 */

const tariffSchema = new mongoose.Schema(
    {
        tariffCode: {
            type: String,
            unique: true,
            required: [true, 'Tariff code is required'],
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TariffCategory',
            required: [true, 'Category is required'],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        serviceType: {
            type: String,
            enum: ['consultation', 'procedure', 'investigation', 'nursing', 'room', 'other'],
            required: true,
        },
        basePrice: {
            type: Number,
            required: [true, 'Base price is required'],
            min: [0, 'Price cannot be negative'],
        },
        taxPercent: {
            type: Number,
            default: 0,
        },
        effectiveFrom: {
            type: Date,
            default: Date.now,
        },
        effectiveTo: {
            type: Date,
        },
        description: {
            type: String,
            trim: true,
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
tariffSchema.index({ tariffCode: 1 });
tariffSchema.index({ name: 'text' });
tariffSchema.index({ category: 1 });
tariffSchema.index({ serviceType: 1 });
tariffSchema.index({ isActive: 1 });

// Virtual for price with tax
tariffSchema.virtual('priceWithTax').get(function () {
    return this.basePrice + (this.basePrice * this.taxPercent) / 100;
});

tariffSchema.set('toJSON', { virtuals: true });
tariffSchema.set('toObject', { virtuals: true });

const Tariff = mongoose.model('Tariff', tariffSchema);

module.exports = Tariff;
