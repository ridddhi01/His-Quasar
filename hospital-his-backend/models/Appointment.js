const mongoose = require('mongoose');
const { APPOINTMENT_STATUS } = require('../config/constants');

/**
 * Appointment Model
 * Represents OPD appointments and follow-ups
 */

const appointmentSchema = new mongoose.Schema(
    {
        appointmentNumber: {
            type: String,
            unique: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Doctor is required'],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department is required'],
        },
        type: {
            type: String,
            default: 'General',
        },
        scheduledDate: {
            type: Date,
            required: [true, 'Scheduled date is required'],
        },
        scheduledTime: {
            type: String,
        },
        status: {
            type: String,
            enum: Object.values(APPOINTMENT_STATUS),
            default: APPOINTMENT_STATUS.SCHEDULED,
        },
        tokenNumber: {
            type: Number,
        },
        chiefComplaint: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        diagnosis: {
            type: String,
            trim: true,
        },
        prescription: [{
            name: String,
            dosage: String,
            frequency: String,
            duration: String,
        }],
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
appointmentSchema.index({ appointmentNumber: 1 });
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ scheduledDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ department: 1, scheduledDate: 1 });

// Auto-generate appointmentNumber before saving
appointmentSchema.pre('save', async function (next) {
    if (this.isNew && !this.appointmentNumber) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

        // Create separate date objects to avoid mutation
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const count = await mongoose.model('Appointment').countDocuments({
            createdAt: {
                $gte: startOfDay,
                $lt: endOfDay,
            },
        });
        this.appointmentNumber = `APT${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
