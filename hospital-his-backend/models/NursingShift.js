const mongoose = require('mongoose');

/**
 * Nursing Shift Model
 * Tracks nurse shift assignments, ward allocations, and shift status
 */

const nursingShiftSchema = new mongoose.Schema(
    {
        shiftNumber: {
            type: String,
            unique: true,
            // required: true, // Auto-generated
        },
        nurse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Nurse is required'],
        },
        shiftType: {
            type: String,
            enum: ['morning', 'evening', 'night'],
            required: [true, 'Shift type is required'],
        },
        shiftDate: {
            type: Date,
            required: [true, 'Shift date is required'],
        },
        // Shift timing based on type
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        actualStartTime: Date,
        actualEndTime: Date,
        // Ward and bed assignments
        assignedWards: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Ward',
            },
        ],
        assignedBeds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Bed',
            },
        ],
        // Patients under care for this shift
        assignedPatients: [
            {
                patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
                admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
                bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
                assignedAt: { type: Date, default: Date.now },
            },
        ],
        // Shift status
        status: {
            type: String,
            enum: ['scheduled', 'active', 'completed', 'handover_pending', 'cancelled'],
            default: 'scheduled',
        },
        // Handover reference
        handoverTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        handoverRecord: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShiftHandover',
        },
        // Role level for access control
        nurseRole: {
            type: String,
            enum: ['staff_nurse', 'senior_nurse', 'head_nurse', 'nurse_supervisor'],
            default: 'staff_nurse',
        },
        // Supervisor assignment
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        notes: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
nursingShiftSchema.index({ nurse: 1, shiftDate: 1 });
nursingShiftSchema.index({ shiftDate: 1, shiftType: 1 });
nursingShiftSchema.index({ status: 1 });
nursingShiftSchema.index({ assignedWards: 1 });

// Auto-generate shift number with UUID to avoid race conditions
nursingShiftSchema.pre('save', async function (next) {
    if (this.isNew && !this.shiftNumber) {
        const dateStr = this.shiftDate.toISOString().slice(0, 10).replace(/-/g, '');
        const shiftCode = this.shiftType.charAt(0).toUpperCase();
        // Use timestamp and random number to ensure uniqueness even with concurrent requests
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.shiftNumber = `NS${dateStr}${shiftCode}${String(timestamp).slice(-4)}${String(random).padStart(4, '0')}`;
    }
    next();
});

// Static method to get shift timings
nursingShiftSchema.statics.getShiftTimings = function (shiftType, date) {
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    const timings = {
        morning: { start: 6, end: 14 },   // 6 AM - 2 PM
        evening: { start: 14, end: 22 },  // 2 PM - 10 PM
        night: { start: 22, end: 6 },     // 10 PM - 6 AM (next day)
    };

    const timing = timings[shiftType];
    const startTime = new Date(baseDate);
    startTime.setHours(timing.start, 0, 0, 0);

    const endTime = new Date(baseDate);
    if (shiftType === 'night') {
        endTime.setDate(endTime.getDate() + 1);
    }
    endTime.setHours(timing.end, 0, 0, 0);

    return { startTime, endTime };
};

const NursingShift = mongoose.model('NursingShift', nursingShiftSchema);

module.exports = NursingShift;
