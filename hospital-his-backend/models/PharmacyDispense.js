const mongoose = require('mongoose');

/**
 * PharmacyDispense Model
 * Represents medicine dispensing records
 */

const pharmacyDispenseSchema = new mongoose.Schema(
    {
        dispenseNumber: {
            type: String,
            unique: true,
        },
        prescription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Prescription',
            required: [true, 'Prescription is required'],
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        items: [
            {
                medicine: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Medicine',
                    required: true,
                },
                inventoryBatch: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'PharmacyInventory',
                },
                // Denormalized batch details for traceability
                batchNumber: {
                    type: String,
                    required: true,
                },
                expiryDate: Date,
                supplier: String,
                grnNumber: String,
                prescribedQuantity: {
                    type: Number,
                    required: true,
                },
                dispensedQuantity: {
                    type: Number,
                    required: true,
                },
                unitPrice: {
                    type: Number,
                    required: true,
                },
                totalPrice: {
                    type: Number,
                    required: true,
                },
                // Recall status at time of dispense
                recallStatus: {
                    type: String,
                    enum: ['none', 'recalled', 'checked'],
                    default: 'none',
                },
                recallCheckedAt: Date,
                // Safety checks for this item
                interactionChecked: {
                    type: Boolean,
                    default: false,
                },
                safetyOverride: {
                    required: {
                        type: Boolean,
                        default: false,
                    },
                    approvedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    },
                    reason: String,
                    approvedAt: Date,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
        },
        netAmount: {
            type: Number,
            required: true,
        },
        dispensedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Dispensed by is required'],
        },
        dispensedAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['pending', 'partial', 'completed', 'cancelled'],
            default: 'completed',
        },
        notes: {
            type: String,
            trim: true,
        },
        // For IPD: link to admission and MAR creation
        admission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
        },
        marScheduleCreated: {
            type: Boolean,
            default: false,
        },
        // Billing link
        billingRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Billing',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
pharmacyDispenseSchema.index({ dispenseNumber: 1 });
pharmacyDispenseSchema.index({ prescription: 1 });
pharmacyDispenseSchema.index({ patient: 1 });
pharmacyDispenseSchema.index({ dispensedAt: -1 });

// Auto-generate dispenseNumber before saving
pharmacyDispenseSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('PharmacyDispense').countDocuments();
        this.dispenseNumber = `DIS${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const PharmacyDispense = mongoose.model('PharmacyDispense', pharmacyDispenseSchema);

module.exports = PharmacyDispense;
