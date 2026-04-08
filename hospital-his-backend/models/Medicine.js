const mongoose = require('mongoose');

/**
 * Medicine Model
 * Represents the medicine master catalog
 */

const medicineSchema = new mongoose.Schema(
    {
        medicineCode: {
            type: String,
            unique: true,
            required: [true, 'Medicine code is required'],
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Medicine name is required'],
            trim: true,
        },
        genericName: {
            type: String,
            trim: true,
        },
        brand: {
            type: String,
            trim: true,
        },
        manufacturer: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        form: {
            type: String,
            enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'suspension', 'other'],
            required: [true, 'Form is required'],
        },
        strength: {
            type: String,
            trim: true,
        },
        unit: {
            type: String,
            trim: true,
        },
        packSize: {
            type: Number,
            default: 1,
        },
        mrp: {
            type: Number,
            required: [true, 'MRP is required'],
            min: [0, 'MRP cannot be negative'],
        },
        sellingPrice: {
            type: Number,
            required: [true, 'Selling price is required'],
            min: [0, 'Selling price cannot be negative'],
        },
        reorderLevel: {
            type: Number,
            default: 10,
        },
        schedule: {
            type: String,
            enum: ['H', 'H1', 'X', 'G', 'OTC'],
        },
        storageConditions: {
            type: String,
            trim: true,
        },
        contraindications: {
            type: String,
            trim: true,
        },
        sideEffects: {
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
medicineSchema.index({ medicineCode: 1 });
medicineSchema.index({ name: 'text', genericName: 'text' });
medicineSchema.index({ category: 1 });
medicineSchema.index({ isActive: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
