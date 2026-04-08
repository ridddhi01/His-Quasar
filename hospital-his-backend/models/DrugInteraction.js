const mongoose = require('mongoose');

/**
 * Drug Interaction Model
 * Defines interactions between medications
 * Admin configures these; Pharmacy/Prescription systems use them for alerts
 */

const drugInteractionSchema = new mongoose.Schema(
    {
        // Drug Pair
        drug1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            required: [true, 'First drug is required'],
        },
        drug1Name: {
            type: String,
            required: true,  // Denormalized for quick lookup
        },
        drug2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            required: [true, 'Second drug is required'],
        },
        drug2Name: {
            type: String,
            required: true,  // Denormalized for quick lookup
        },

        // Interaction Details
        interactionType: {
            type: String,
            enum: ['pharmacokinetic', 'pharmacodynamic', 'combined'],
            required: true,
        },
        severity: {
            type: String,
            enum: ['minor', 'moderate', 'major', 'contraindicated'],
            required: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        mechanism: {
            type: String,  // How the interaction occurs
        },
        clinicalEffect: {
            type: String,  // Clinical outcome of the interaction
        },
        recommendation: {
            type: String,
            required: [true, 'Recommendation is required'],
        },

        // Evidence
        evidenceLevel: {
            type: String,
            enum: ['established', 'probable', 'suspected', 'theoretical'],
            default: 'suspected',
        },
        references: [{
            source: String,
            citation: String,
            url: String,
        }],

        // Alert Configuration
        alertMessage: {
            type: String,
        },
        blockPrescription: {
            type: Boolean,
            default: false,  // If true, cannot co-prescribe without override
        },
        requiresOverride: {
            type: Boolean,
            default: false,  // Requires supervisor approval
        },
        overrideRoles: [{
            type: String,
            enum: ['senior_doctor', 'pharmacist', 'admin'],
        }],

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },

        // Audit
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        lastModifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: Date,
    },
    {
        timestamps: true,
    }
);

// Compound index for drug pairs (bidirectional lookup)
drugInteractionSchema.index({ drug1: 1, drug2: 1 }, { unique: true });
drugInteractionSchema.index({ drug2: 1, drug1: 1 });
drugInteractionSchema.index({ severity: 1 });
drugInteractionSchema.index({ isActive: 1 });
drugInteractionSchema.index({ drug1Name: 'text', drug2Name: 'text' });

/**
 * Static: Check interactions for a list of drugs
 * @param {Array} drugIds - Array of Medicine ObjectIds
 * @returns {Array} - List of interactions found
 */
drugInteractionSchema.statics.checkInteractions = async function (drugIds) {
    if (!drugIds || drugIds.length < 2) return [];

    const interactions = [];

    // Check all pairs
    for (let i = 0; i < drugIds.length; i++) {
        for (let j = i + 1; j < drugIds.length; j++) {
            const interaction = await this.findOne({
                $or: [
                    { drug1: drugIds[i], drug2: drugIds[j] },
                    { drug1: drugIds[j], drug2: drugIds[i] },
                ],
                isActive: true,
            });

            if (interaction) {
                interactions.push(interaction);
            }
        }
    }

    // Sort by severity (contraindicated first)
    const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
    interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return interactions;
};

/**
 * Static: Get all interactions for a specific drug
 */
drugInteractionSchema.statics.getInteractionsForDrug = async function (drugId) {
    return this.find({
        $or: [{ drug1: drugId }, { drug2: drugId }],
        isActive: true,
    })
        .populate('drug1', 'name genericName')
        .populate('drug2', 'name genericName')
        .sort({ severity: 1 });
};

// Pre-save: Generate alert message if not provided
drugInteractionSchema.pre('save', function (next) {
    if (!this.alertMessage) {
        this.alertMessage = `Drug interaction alert: ${this.drug1Name} and ${this.drug2Name} - ${this.severity.toUpperCase()}. ${this.recommendation}`;
    }
    next();
});

const DrugInteraction = mongoose.model('DrugInteraction', drugInteractionSchema);

module.exports = DrugInteraction;
