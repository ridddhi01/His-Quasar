const mongoose = require('mongoose');

/**
 * Critical Value Model
 * Defines thresholds for lab parameters that require immediate attention
 * Admin configures these; Lab/Clinical systems use them for alerts
 */

const criticalValueSchema = new mongoose.Schema(
    {
        // Parameter Identification
        parameterCode: {
            type: String,
            unique: true,
            required: [true, 'Parameter code is required'],
            trim: true,
            uppercase: true,
        },
        parameterName: {
            type: String,
            required: [true, 'Parameter name is required'],
            trim: true,
        },
        category: {
            type: String,
            enum: ['hematology', 'biochemistry', 'microbiology', 'serology', 'urinalysis', 'blood_gas', 'coagulation', 'other'],
            required: true,
        },
        unit: {
            type: String,
            required: [true, 'Unit is required'],
            trim: true,
        },

        // Critical Thresholds
        lowCritical: {
            type: Number,
            required: true,
        },
        lowWarning: {
            type: Number,
        },
        highWarning: {
            type: Number,
        },
        highCritical: {
            type: Number,
            required: true,
        },

        // Normal Range (for reference)
        normalRange: {
            min: Number,
            max: Number,
        },

        // Demographics-specific thresholds
        ageSpecific: [{
            ageGroup: {
                type: String,
                enum: ['neonate', 'infant', 'child', 'adolescent', 'adult', 'elderly'],
            },
            minAge: Number,  // in years
            maxAge: Number,
            lowCritical: Number,
            highCritical: Number,
        }],
        genderSpecific: [{
            gender: {
                type: String,
                enum: ['male', 'female'],
            },
            lowCritical: Number,
            highCritical: Number,
        }],

        // Alert Configuration
        alertMessage: {
            type: String,
            default: 'Critical value detected - Immediate attention required',
        },
        alertSeverity: {
            type: String,
            enum: ['warning', 'critical', 'life_threatening'],
            default: 'critical',
        },
        notifyRoles: [{
            type: String,
            enum: ['doctor', 'nurse', 'lab_tech', 'head_nurse', 'admin'],
        }],
        requiresAcknowledgment: {
            type: Boolean,
            default: true,
        },
        escalationTimeMinutes: {
            type: Number,
            default: 15,  // Escalate if not acknowledged within this time
        },

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
    },
    {
        timestamps: true,
    }
);

// Indexes
criticalValueSchema.index({ parameterCode: 1 });
criticalValueSchema.index({ parameterName: 'text' });
criticalValueSchema.index({ category: 1 });
criticalValueSchema.index({ isActive: 1 });

/**
 * Static: Check if a value is critical
 */
criticalValueSchema.statics.checkValue = async function (parameterCode, value, patientAge, patientGender) {
    const config = await this.findOne({ parameterCode, isActive: true });
    if (!config) return null;

    let lowCrit = config.lowCritical;
    let highCrit = config.highCritical;

    // Check age-specific thresholds
    if (patientAge !== undefined && config.ageSpecific.length > 0) {
        const ageConfig = config.ageSpecific.find(
            ac => patientAge >= (ac.minAge || 0) && patientAge <= (ac.maxAge || 999)
        );
        if (ageConfig) {
            lowCrit = ageConfig.lowCritical || lowCrit;
            highCrit = ageConfig.highCritical || highCrit;
        }
    }

    // Check gender-specific thresholds
    if (patientGender && config.genderSpecific.length > 0) {
        const genderConfig = config.genderSpecific.find(gc => gc.gender === patientGender);
        if (genderConfig) {
            lowCrit = genderConfig.lowCritical || lowCrit;
            highCrit = genderConfig.highCritical || highCrit;
        }
    }

    // Determine status
    if (value <= lowCrit) {
        return { status: 'critical_low', threshold: lowCrit, message: config.alertMessage, severity: config.alertSeverity };
    }
    if (value >= highCrit) {
        return { status: 'critical_high', threshold: highCrit, message: config.alertMessage, severity: config.alertSeverity };
    }
    if (config.lowWarning && value <= config.lowWarning) {
        return { status: 'warning_low', threshold: config.lowWarning };
    }
    if (config.highWarning && value >= config.highWarning) {
        return { status: 'warning_high', threshold: config.highWarning };
    }

    return { status: 'normal' };
};

const CriticalValue = mongoose.model('CriticalValue', criticalValueSchema);

module.exports = CriticalValue;
