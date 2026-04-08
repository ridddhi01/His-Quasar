const mongoose = require('mongoose');

/**
 * System Configuration Model
 * Stores hospital-wide system settings
 * Only Admin can modify these settings
 */

const systemConfigSchema = new mongoose.Schema(
    {
        // Configuration key (unique identifier)
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        // Configuration value (flexible type)
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        // Category for grouping
        category: {
            type: String,
            enum: [
                'hospital_info',
                'billing',
                'clinical',
                'security',
                'notifications',
                'integrations',
                'backup',
                'compliance',
            ],
            required: true,
        },
        // Description of the setting
        description: {
            type: String,
        },
        // Data type for UI rendering
        dataType: {
            type: String,
            enum: ['string', 'number', 'boolean', 'json', 'array'],
            default: 'string',
        },
        // Whether this setting requires system restart
        requiresRestart: {
            type: Boolean,
            default: false,
        },
        // Last modified tracking
        lastModifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        lastModifiedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Index for category queries
systemConfigSchema.index({ category: 1 });

// Pre-save hook to track modifications
systemConfigSchema.pre('save', function (next) {
    if (this.isModified('value')) {
        this.lastModifiedAt = new Date();
    }
    next();
});

/**
 * Static: Get all configs by category
 */
systemConfigSchema.statics.getByCategory = async function (category) {
    return this.find({ category }).sort({ key: 1 });
};

/**
 * Static: Get single config value
 */
systemConfigSchema.statics.getValue = async function (key, defaultValue = null) {
    const config = await this.findOne({ key });
    return config ? config.value : defaultValue;
};

/**
 * Static: Set config value (upsert)
 */
systemConfigSchema.statics.setValue = async function (key, value, userId, options = {}) {
    return this.findOneAndUpdate(
        { key },
        {
            value,
            lastModifiedBy: userId,
            lastModifiedAt: new Date(),
            ...options,
        },
        { upsert: true, new: true }
    );
};

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

module.exports = SystemConfig;
