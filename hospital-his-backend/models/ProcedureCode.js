const mongoose = require('mongoose');

/**
 * Procedure Code Model
 * Master data for CPT codes and local procedure codes
 * Used for clinical coding and billing
 */

const procedureCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, 'Procedure code is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        codeType: {
            type: String,
            enum: ['cpt', 'local', 'icd10-pcs', 'hcpcs'],
            default: 'cpt',
            required: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        shortDescription: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            trim: true,
            // e.g., "Evaluation and Management", "Surgery", "Radiology", "Laboratory"
        },
        subcategory: {
            type: String,
            trim: true,
        },
        baseRate: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Relative Value Units (for Medicare/insurance calculations)
        rvu: {
            work: { type: Number, default: 0 },
            practice: { type: Number, default: 0 },
            malpractice: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        // Common modifiers for this code
        commonModifiers: [{
            type: String,
            trim: true,
        }],
        // Requires documentation/authorization
        requiresAuth: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        effectiveDate: {
            type: Date,
        },
        expirationDate: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
procedureCodeSchema.index({ code: 1 });
procedureCodeSchema.index({ codeType: 1 });
procedureCodeSchema.index({ category: 1 });
procedureCodeSchema.index({ description: 'text', shortDescription: 'text' });
procedureCodeSchema.index({ isActive: 1 });

// Virtual for full display
procedureCodeSchema.virtual('displayName').get(function () {
    return `${this.code} - ${this.shortDescription || this.description}`;
});

// Ensure virtuals are included in JSON
procedureCodeSchema.set('toJSON', { virtuals: true });
procedureCodeSchema.set('toObject', { virtuals: true });

const ProcedureCode = mongoose.model('ProcedureCode', procedureCodeSchema);

module.exports = ProcedureCode;
