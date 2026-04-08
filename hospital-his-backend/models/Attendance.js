const mongoose = require('mongoose');

/**
 * Attendance Model
 * Represents staff attendance records
 */

const attendanceSchema = new mongoose.Schema(
    {
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
            required: [true, 'Staff is required'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        checkIn: {
            time: { type: Date },
            location: { type: String, trim: true },
            method: { type: String, enum: ['biometric', 'manual', 'app'] },
        },
        checkOut: {
            time: { type: Date },
            location: { type: String, trim: true },
            method: { type: String, enum: ['biometric', 'manual', 'app'] },
        },
        shift: {
            type: String,
            enum: ['morning', 'afternoon', 'night', 'general'],
            default: 'general',
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'half-day', 'leave', 'holiday', 'week-off'],
            required: true,
        },
        leaveType: {
            type: String,
            enum: ['casual', 'sick', 'earned', 'unpaid', 'compensatory'],
        },
        workHours: {
            type: Number,
            default: 0,
        },
        overtime: {
            type: Number,
            default: 0,
        },
        remarks: {
            type: String,
            trim: true,
        },
        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index for staff + date
attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

// Indexes
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

// Pre-save hook to calculate work hours
attendanceSchema.pre('save', function (next) {
    if (this.checkIn?.time && this.checkOut?.time) {
        const diffMs = this.checkOut.time - this.checkIn.time;
        this.workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }
    next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
