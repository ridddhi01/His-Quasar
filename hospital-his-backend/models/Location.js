const mongoose = require('mongoose');

/**
 * Location Model
 * Represents storage locations/warehouses for inventory
 */

const locationSchema = new mongoose.Schema(
    {
        locationCode: {
            type: String,
            required: [true, 'Location code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        locationName: {
            type: String,
            required: [true, 'Location name is required'],
            trim: true,
        },
        locationType: {
            type: String,
            enum: ['warehouse', 'store', 'department', 'sub-store'],
            required: true,
        },
        parentLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        address: {
            type: String,
            trim: true,
        },
        contactPerson: {
            type: String,
            trim: true,
        },
        contactPhone: {
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
locationSchema.index({ locationCode: 1 });
locationSchema.index({ locationName: 1 });
locationSchema.index({ locationType: 1 });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
