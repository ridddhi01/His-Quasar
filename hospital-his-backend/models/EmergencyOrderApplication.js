const mongoose = require('mongoose');

/**
 * Emergency Order Application Model
 * Tracks when order sets (bundles) are applied to emergency cases
 * Links to actual created orders in Lab, Radiology, and Pharmacy
 */

const emergencyOrderApplicationSchema = new mongoose.Schema(
    {
        // Reference to the emergency case
        emergencyCase: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Emergency',
            required: [true, 'Emergency case is required'],
        },

        // Reference to the applied order set
        orderSet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrderSet',
            required: [true, 'Order set is required'],
        },

        // Doctor who applied the bundle
        appliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Applying user is required'],
        },

        // When the bundle was applied
        appliedAt: {
            type: Date,
            default: Date.now,
        },

        // Bundle category for quick identification
        bundleCategory: {
            type: String,
            enum: ['cardiac', 'stroke', 'trauma', 'sepsis', 'respiratory', 'pediatric', 'obstetric', 'general'],
            required: true,
        },

        // Trauma level (only if category is trauma)
        traumaLevel: {
            type: Number,
            enum: [1, 2, 3],
        },

        // Selected investigations from the bundle
        selectedInvestigations: [{
            test: {
                type: mongoose.Schema.Types.ObjectId,
                refPath: 'selectedInvestigations.testType',
            },
            testType: {
                type: String,
                enum: ['LabTestMaster', 'RadiologyMaster'],
            },
            testName: String,
            priority: {
                type: String,
                enum: ['routine', 'urgent', 'stat'],
                default: 'stat',
            },
            included: {
                type: Boolean,
                default: true,
            },
        }],

        // Selected medications from the bundle
        selectedMedications: [{
            medicine: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Medicine',
            },
            medicineName: String,
            dosage: String,
            route: String,
            frequency: String,
            duration: String,
            included: {
                type: Boolean,
                default: true,
            },
        }],

        // Selected procedures from the bundle
        selectedProcedures: [{
            procedureName: String,
            priority: {
                type: String,
                enum: ['routine', 'urgent', 'stat'],
                default: 'urgent',
            },
            included: {
                type: Boolean,
                default: true,
            },
        }],

        // Created orders - references to actual orders in other modules
        createdOrders: {
            labTests: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'LabTest',
            }],
            radiologyTests: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Radiology',
            }],
            prescriptions: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Prescription',
            }],
        },

        // Status of the bundle application
        status: {
            type: String,
            enum: ['applied', 'partially-applied', 'cancelled'],
            default: 'applied',
        },

        // Notes added during application
        applicationNotes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
emergencyOrderApplicationSchema.index({ emergencyCase: 1 });
emergencyOrderApplicationSchema.index({ orderSet: 1 });
emergencyOrderApplicationSchema.index({ appliedBy: 1 });
emergencyOrderApplicationSchema.index({ bundleCategory: 1 });
emergencyOrderApplicationSchema.index({ appliedAt: -1 });

const EmergencyOrderApplication = mongoose.model('EmergencyOrderApplication', emergencyOrderApplicationSchema);

module.exports = EmergencyOrderApplication;
