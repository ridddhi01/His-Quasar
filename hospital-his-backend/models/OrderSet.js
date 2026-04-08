const mongoose = require('mongoose');

/**
 * Order Set Model
 * Pre-defined bundles for emergency situations (Trauma, Cardiac, Stroke)
 * Admin configures these; Clinical staff applies them
 */

const orderSetSchema = new mongoose.Schema(
    {
        // Identification
        orderSetCode: {
            type: String,
            unique: true,
            required: [true, 'Order set code is required'],
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: [true, 'Order set name is required'],
            trim: true,
        },
        category: {
            type: String,
            enum: ['emergency', 'surgery', 'admission', 'discharge', 'procedure', 'protocol'],
            required: true,
        },
        subCategory: {
            type: String,
            enum: ['trauma', 'cardiac', 'stroke', 'sepsis', 'respiratory', 'pediatric', 'obstetric', 'general'],
        },
        description: {
            type: String,
            trim: true,
        },

        // Included Investigations
        investigations: [{
            test: {
                type: mongoose.Schema.Types.ObjectId,
                refPath: 'investigations.testType',
            },
            testType: {
                type: String,
                enum: ['LabTestMaster', 'RadiologyMaster'],
                required: true,
            },
            testName: String,  // Denormalized for display
            priority: {
                type: String,
                enum: ['routine', 'urgent', 'stat'],
                default: 'urgent',
            },
            isRequired: {
                type: Boolean,
                default: true,
            },
        }],

        // Included Medications
        medications: [{
            medicine: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Medicine',
            },
            medicineName: String,  // Denormalized for display
            dosage: String,
            route: {
                type: String,
                enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhaled', 'sublingual', 'rectal'],
            },
            frequency: String,
            duration: String,
            priority: {
                type: String,
                enum: ['routine', 'urgent', 'stat'],
                default: 'urgent',
            },
            instructions: String,
            isRequired: {
                type: Boolean,
                default: true,
            },
        }],

        // Included Procedures
        procedures: [{
            procedureName: {
                type: String,
                required: true,
            },
            priority: {
                type: String,
                enum: ['routine', 'urgent', 'stat'],
                default: 'urgent',
            },
            instructions: String,
            isRequired: {
                type: Boolean,
                default: true,
            },
        }],

        // Included Nursing Tasks
        nursingTasks: [{
            taskName: String,
            frequency: String,
            instructions: String,
        }],

        // Applicability
        applicableDepartments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        }],

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
        version: {
            type: Number,
            default: 1,
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
    },
    {
        timestamps: true,
    }
);

// Indexes
orderSetSchema.index({ orderSetCode: 1 });
orderSetSchema.index({ category: 1, subCategory: 1 });
orderSetSchema.index({ isActive: 1 });
orderSetSchema.index({ name: 'text', description: 'text' });

// Pre-save: Auto-generate code if not provided
orderSetSchema.pre('save', async function (next) {
    if (this.isNew && !this.orderSetCode) {
        const count = await mongoose.model('OrderSet').countDocuments();
        this.orderSetCode = `OS${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

const OrderSet = mongoose.model('OrderSet', orderSetSchema);

module.exports = OrderSet;
