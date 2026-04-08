const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { APPOINTMENT_STATUS } = require('../config/constants');

/**
 * Appointment Service
 * Handles appointment scheduling business logic
 */

class AppointmentService {
    /**
     * Check doctor availability for a specific slot
     */
    async checkDoctorAvailability(doctorId, date, time) {
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            scheduledDate: date,
            scheduledTime: time,
            status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] },
        });

        return !existingAppointment;
    }

    /**
     * Get available slots for a doctor on a specific date
     */
    async getAvailableSlots(doctorId, date) {
        const doctor = await User.findById(doctorId);
        if (!doctor) return [];

        // Default consultation slots (9 AM to 5 PM, 15-minute intervals)
        const allSlots = [];
        for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                allSlots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
            }
        }

        // Get booked slots
        const bookedAppointments = await Appointment.find({
            doctor: doctorId,
            scheduledDate: date,
            status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] },
        }).select('scheduledTime');

        const bookedSlots = bookedAppointments.map((a) => a.scheduledTime);

        // Return available slots
        return allSlots.filter((slot) => !bookedSlots.includes(slot));
    }

    /**
     * Generate token number for the day
     */
    async generateTokenNumber(doctorId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const count = await Appointment.countDocuments({
            doctor: doctorId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $nin: [APPOINTMENT_STATUS.CANCELLED] },
        });

        return count + 1;
    }

    /**
     * Schedule appointment with validation
     */
    async scheduleAppointment(appointmentData) {
        const { doctor, scheduledDate, scheduledTime } = appointmentData;

        // Check availability
        const isAvailable = await this.checkDoctorAvailability(doctor, scheduledDate, scheduledTime);
        if (!isAvailable) {
            throw new Error('Slot not available');
        }

        // Generate token number
        const tokenNumber = await this.generateTokenNumber(doctor, scheduledDate);

        return Appointment.create({ ...appointmentData, tokenNumber });
    }

    /**
     * Reschedule appointment
     */
    async rescheduleAppointment(appointmentId, newDate, newTime) {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) throw new Error('Appointment not found');

        // Check new slot availability
        const isAvailable = await this.checkDoctorAvailability(appointment.doctor, newDate, newTime);
        if (!isAvailable) throw new Error('New slot not available');

        appointment.scheduledDate = newDate;
        appointment.scheduledTime = newTime;
        appointment.status = APPOINTMENT_STATUS.RESCHEDULED;
        return appointment.save();
    }

    /**
     * Get queue position
     */
    async getQueuePosition(appointmentId) {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return null;

        const startOfDay = new Date(appointment.scheduledDate);
        startOfDay.setHours(0, 0, 0, 0);

        const aheadInQueue = await Appointment.countDocuments({
            doctor: appointment.doctor,
            scheduledDate: startOfDay,
            status: APPOINTMENT_STATUS.CHECKED_IN,
            tokenNumber: { $lt: appointment.tokenNumber },
        });

        return {
            position: aheadInQueue + 1,
            tokenNumber: appointment.tokenNumber,
            estimatedWaitTime: aheadInQueue * 15, // 15 mins per patient
        };
    }

    /**
     * Get doctor's schedule for a date range
     */
    async getDoctorSchedule(doctorId, startDate, endDate) {
        return Appointment.find({
            doctor: doctorId,
            scheduledDate: { $gte: startDate, $lte: endDate },
            status: { $nin: [APPOINTMENT_STATUS.CANCELLED] },
        })
            .populate('patient', 'patientId firstName lastName phone')
            .sort({ scheduledDate: 1, scheduledTime: 1 });
    }
}

module.exports = new AppointmentService();
