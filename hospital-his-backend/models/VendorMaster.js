const mongoose = require('mongoose');

/**
 * VendorMaster Model
 * Represents vendors/suppliers for inventory procurement
 */

const vendorMasterSchema = new mongoose.Schema(
    {
        vendorCode: {
            type: String,
            required: [true, 'Vendor code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        vendorName: {
            type: String,
            required: [true, 'Vendor name is required'],
            trim: true,
        },
        vendorType: {
            type: String,
            enum: ['equipment', 'consumables', 'general', 'services', 'mixed'],
            required: true,
        },
        contactPerson: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        alternatePhone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            pincode: { type: String, trim: true },
            country: { type: String, trim: true, default: 'India' },
        },
        gstNumber: {
            type: String,
            trim: true,
            uppercase: true,
        },
        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
        },
        bankDetails: {
            bankName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true, uppercase: true },
            accountHolderName: { type: String, trim: true },
        },
        paymentTerms: {
            type: String,
            enum: ['advance', 'cod', 'credit-7', 'credit-15', 'credit-30', 'credit-45', 'credit-60'],
            default: 'credit-30',
        },
        creditLimit: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        notes: {
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
vendorMasterSchema.index({ vendorCode: 1 });
vendorMasterSchema.index({ vendorName: 'text' });
vendorMasterSchema.index({ vendorType: 1 });
vendorMasterSchema.index({ gstNumber: 1 });
vendorMasterSchema.index({ isActive: 1 });

const VendorMaster = mongoose.model('VendorMaster', vendorMasterSchema);

module.exports = VendorMaster;
