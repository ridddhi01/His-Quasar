const mongoose = require('mongoose');

/**
 * Vital Signs Model
 * Structured vital sign recordings with threshold-based alerts
 */

const vitalSignsSchema = new mongoose.Schema(
    {
        recordNumber: {
            type: String,
            unique: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        admission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
            required: [true, 'Admission is required'],
        },
        // Vital sign readings
        bloodPressure: {
            systolic: Number,
            diastolic: Number,
            position: {
                type: String,
                enum: ['sitting', 'standing', 'lying', 'left_lateral'],
                default: 'sitting',
            },
        },
        pulse: {
            rate: Number,
            rhythm: {
                type: String,
                enum: ['regular', 'irregular'],
                default: 'regular',
            },
            character: String, // bounding, weak, thready
        },
        temperature: {
            value: Number,
            unit: {
                type: String,
                enum: ['celsius', 'fahrenheit'],
                default: 'celsius',
            },
            site: {
                type: String,
                enum: ['oral', 'axillary', 'rectal', 'tympanic', 'temporal'],
                default: 'oral',
            },
        },
        respiratoryRate: {
            rate: Number,
            pattern: {
                type: String,
                enum: ['normal', 'shallow', 'deep', 'labored', 'irregular'],
                default: 'normal',
            },
        },
        oxygenSaturation: {
            value: Number,
            onOxygen: { type: Boolean, default: false },
            oxygenFlow: Number, // L/min if on oxygen
            deliveryDevice: String, // nasal cannula, mask, etc.
        },
        painScore: {
            score: {
                type: Number,
                min: 0,
                max: 10,
            },
            location: String,
            character: String, // sharp, dull, throbbing
        },
        // Additional measurements
        weight: {
            value: Number,
            unit: {
                type: String,
                enum: ['kg', 'lb'],
                default: 'kg',
            },
        },
        height: {
            value: Number,
            unit: {
                type: String,
                enum: ['cm', 'ft'],
                default: 'cm',
            },
        },
        bloodGlucose: {
            value: Number,
            timing: {
                type: String,
                enum: ['fasting', 'random', 'pre_meal', 'post_meal'],
            },
        },
        // Glasgow Coma Scale for neuro patients
        gcs: {
            eye: { type: Number, min: 1, max: 4 },
            verbal: { type: Number, min: 1, max: 5 },
            motor: { type: Number, min: 1, max: 6 },
            total: Number,
        },
        // Level of consciousness
        consciousness: {
            type: String,
            enum: ['alert', 'drowsy', 'confused', 'unresponsive', 'sedated', 'pain'],
            default: 'alert',
        },
        // Pupil assessment
        pupils: {
            left: {
                size: Number, // mm
                reaction: { type: String, enum: ['brisk', 'sluggish', 'fixed'] },
            },
            right: {
                size: Number,
                reaction: { type: String, enum: ['brisk', 'sluggish', 'fixed'] },
            },
        },
        // Alert flags
        isAbnormal: { type: Boolean, default: false },
        isCritical: { type: Boolean, default: false },
        abnormalParameters: [String],
        criticalParameters: [String],
        // Alert generated
        alertGenerated: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CriticalAlert',
        },
        // Recording details
        recordedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingShift',
        },
        relatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NursingTask',
        },
        notes: String,
        // Review by doctor
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: Date,
        reviewNotes: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
vitalSignsSchema.index({ patient: 1, recordedAt: -1 });
vitalSignsSchema.index({ admission: 1 });
vitalSignsSchema.index({ recordedBy: 1 });
vitalSignsSchema.index({ isCritical: 1, isAbnormal: 1 });

// Auto-generate record number
vitalSignsSchema.pre('save', async function (next) {
    if (this.isNew && !this.recordNumber) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('VitalSigns').countDocuments();
        this.recordNumber = `VS${dateStr}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Check thresholds and set alert flags
vitalSignsSchema.pre('save', function (next) {
    this.abnormalParameters = [];
    this.criticalParameters = [];

    // Define thresholds
    const thresholds = {
        systolic: { low: 90, high: 140, criticalLow: 80, criticalHigh: 180 },
        diastolic: { low: 60, high: 90, criticalLow: 50, criticalHigh: 120 },
        pulse: { low: 60, high: 100, criticalLow: 40, criticalHigh: 150 },
        temperature: { low: 36, high: 37.5, criticalLow: 35, criticalHigh: 39.5 },
        respiratoryRate: { low: 12, high: 20, criticalLow: 8, criticalHigh: 30 },
        oxygenSaturation: { low: 95, criticalLow: 90 },
    };

    // Check blood pressure
    if (this.bloodPressure?.systolic) {
        if (this.bloodPressure.systolic < thresholds.systolic.criticalLow ||
            this.bloodPressure.systolic > thresholds.systolic.criticalHigh) {
            this.criticalParameters.push('systolic_bp');
        } else if (this.bloodPressure.systolic < thresholds.systolic.low ||
            this.bloodPressure.systolic > thresholds.systolic.high) {
            this.abnormalParameters.push('systolic_bp');
        }
    }

    if (this.bloodPressure?.diastolic) {
        if (this.bloodPressure.diastolic < thresholds.diastolic.criticalLow ||
            this.bloodPressure.diastolic > thresholds.diastolic.criticalHigh) {
            this.criticalParameters.push('diastolic_bp');
        } else if (this.bloodPressure.diastolic < thresholds.diastolic.low ||
            this.bloodPressure.diastolic > thresholds.diastolic.high) {
            this.abnormalParameters.push('diastolic_bp');
        }
    }

    // Check pulse
    if (this.pulse?.rate) {
        if (this.pulse.rate < thresholds.pulse.criticalLow ||
            this.pulse.rate > thresholds.pulse.criticalHigh) {
            this.criticalParameters.push('pulse');
        } else if (this.pulse.rate < thresholds.pulse.low ||
            this.pulse.rate > thresholds.pulse.high) {
            this.abnormalParameters.push('pulse');
        }
    }

    // Check temperature
    if (this.temperature?.value) {
        const temp = this.temperature.unit === 'fahrenheit'
            ? (this.temperature.value - 32) * 5 / 9
            : this.temperature.value;
        if (temp < thresholds.temperature.criticalLow || temp > thresholds.temperature.criticalHigh) {
            this.criticalParameters.push('temperature');
        } else if (temp < thresholds.temperature.low || temp > thresholds.temperature.high) {
            this.abnormalParameters.push('temperature');
        }
    }

    // Check respiratory rate
    if (this.respiratoryRate?.rate) {
        if (this.respiratoryRate.rate < thresholds.respiratoryRate.criticalLow ||
            this.respiratoryRate.rate > thresholds.respiratoryRate.criticalHigh) {
            this.criticalParameters.push('respiratory_rate');
        } else if (this.respiratoryRate.rate < thresholds.respiratoryRate.low ||
            this.respiratoryRate.rate > thresholds.respiratoryRate.high) {
            this.abnormalParameters.push('respiratory_rate');
        }
    }

    // Check oxygen saturation
    if (this.oxygenSaturation?.value) {
        if (this.oxygenSaturation.value < thresholds.oxygenSaturation.criticalLow) {
            this.criticalParameters.push('oxygen_saturation');
        } else if (this.oxygenSaturation.value < thresholds.oxygenSaturation.low) {
            this.abnormalParameters.push('oxygen_saturation');
        }
    }

    // Set flags
    this.isAbnormal = this.abnormalParameters.length > 0 || this.criticalParameters.length > 0;
    this.isCritical = this.criticalParameters.length > 0;

    next();
});

const VitalSigns = mongoose.model('VitalSigns', vitalSignsSchema);

module.exports = VitalSigns;
