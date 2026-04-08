const mongoose = require('mongoose');
const { PURCHASE_REQUISITION_STATUS } = require('../config/constants');

/**
 * PurchaseRequisition Model
 * Represents purchase requisitions raised before creating purchase orders
 */

const prItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    estimatedRate: {
        type: Number,
        default: 0,
    },
    estimatedAmount: {
        type: Number,
        default: 0,
    },
    remarks: {
        type: String,
        trim: true,
    },
});

const purchaseRequisitionSchema = new mongoose.Schema(
    {
        prNumber: {
            type: String,
            unique: true,
            required: true,
        },
        requestingDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        requestingLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        prDate: {
            type: Date,
            default: Date.now,
        },
        requiredByDate: {
            type: Date,
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal',
        },
        items: [prItemSchema],
        totalEstimatedAmount: {
            type: Number,
            default: 0,
        },
        justification: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(PURCHASE_REQUISITION_STATUS),
            default: PURCHASE_REQUISITION_STATUS.DRAFT,
        },
        submittedAt: {
            type: Date,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: {
            type: Date,
        },
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
        linkedPurchaseOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PurchaseOrder',
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
purchaseRequisitionSchema.index({ prNumber: 1 });
purchaseRequisitionSchema.index({ status: 1 });
purchaseRequisitionSchema.index({ requestingDepartment: 1 });
purchaseRequisitionSchema.index({ createdAt: -1 });

// Auto-generate PR number before saving
purchaseRequisitionSchema.pre('save', async function (next) {
    if (this.isNew && !this.prNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('PurchaseRequisition').countDocuments();
        this.prNumber = `PR${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

const PurchaseRequisition = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);

module.exports = PurchaseRequisition;
