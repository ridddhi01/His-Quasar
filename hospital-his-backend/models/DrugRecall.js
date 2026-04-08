const mongoose = require('mongoose');

/**
 * DrugRecall Model
 * 
 * Manages the complete lifecycle of drug recalls:
 * 1. Initiation (manual or regulatory import)
 * 2. Batch blocking
 * 3. Affected patient identification
 * 4. Notification tracking
 * 5. Resolution
 * 
 * MEDICO-LEGAL: This model is critical for patient safety and regulatory compliance.
 * All changes are audited via the actionsTaken array and external AuditLog.
 */

const drugRecallSchema = new mongoose.Schema(
    {
        // Recall identification
        recallNumber: {
            type: String,
            unique: true,
        },

        // Affected medicine
        medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            required: [true, 'Medicine is required'],
        },

        // Recalled batches with inventory references
        recalledBatches: [{
            batchNumber: {
                type: String,
                required: true,
            },
            inventoryRef: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PharmacyInventory',
            },
            quantityAtRecall: Number,
            blockedAt: {
                type: Date,
                default: Date.now,
            },
        }],

        // Recall details
        recallDate: {
            type: Date,
            default: Date.now,
            required: true,
        },
        reason: {
            type: String,
            required: [true, 'Recall reason is required'],
            trim: true,
        },
        recallClass: {
            type: String,
            enum: ['class-i', 'class-ii', 'class-iii'],
            // Class I: Serious health hazard
            // Class II: May cause temporary health problems
            // Class III: Not likely to cause health problems
        },
        regulatoryReference: {
            type: String,
            trim: true,
            // e.g., FDA recall number, CDSCO reference
        },
        regulatoryBody: {
            type: String,
            trim: true,
            // e.g., "FDA", "CDSCO", "EMA"
        },

        // Status
        status: {
            type: String,
            enum: ['active', 'resolved', 'cancelled'],
            default: 'active',
        },
        resolutionDate: Date,
        resolutionNotes: String,

        // Affected patients (populated by service after recall initiation)
        affectedPatients: [{
            patient: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Patient',
            },
            dispenseRef: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PharmacyDispense',
            },
            batchNumber: String,
            quantityReceived: Number,
            dispensedAt: Date,
            notified: {
                type: Boolean,
                default: false,
            },
            notifiedAt: Date,
            notifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        }],

        // Notification tracking
        notificationsSent: {
            patients: { type: Number, default: 0 },
            doctors: { type: Number, default: 0 },
            pharmacists: { type: Number, default: 0 },
        },

        // Full audit trail of actions taken
        actionsTaken: [{
            action: {
                type: String,
                required: true,
                // e.g., "recall_initiated", "batch_blocked", "patient_notified", "recall_resolved"
            },
            takenBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            takenAt: {
                type: Date,
                default: Date.now,
            },
            details: String,
            metadata: mongoose.Schema.Types.Mixed,
        }],

        // Initiator
        initiatedBy: {
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
drugRecallSchema.index({ recallNumber: 1 });
drugRecallSchema.index({ medicine: 1 });
drugRecallSchema.index({ status: 1 });
drugRecallSchema.index({ recallDate: -1 });
drugRecallSchema.index({ 'recalledBatches.batchNumber': 1 });

// Auto-generate recallNumber
drugRecallSchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('DrugRecall').countDocuments();
        this.recallNumber = `RCL${dateStr}${String(count + 1).padStart(4, '0')}`;

        // Add initial action
        this.actionsTaken.push({
            action: 'recall_initiated',
            takenBy: this.initiatedBy,
            takenAt: new Date(),
            details: `Recall initiated for ${this.recalledBatches.length} batch(es)`,
        });
    }
    next();
});

/**
 * Static method to check if a batch is recalled.
 * 
 * @param {ObjectId} medicineId - Medicine ID
 * @param {String} batchNumber - Batch number
 * @returns {Object|null} - Recall object or null
 */
drugRecallSchema.statics.isBatchRecalled = async function (medicineId, batchNumber) {
    const recall = await this.findOne({
        medicine: medicineId,
        status: 'active',
        'recalledBatches.batchNumber': batchNumber,
    });
    return recall;
};

/**
 * Static method to get all active recalls.
 */
drugRecallSchema.statics.getActiveRecalls = async function () {
    return this.find({ status: 'active' })
        .populate('medicine', 'name genericName medicineCode')
        .sort({ recallDate: -1 });
};

const DrugRecall = mongoose.model('DrugRecall', drugRecallSchema);

module.exports = DrugRecall;
