const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const { APPOINTMENT_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');

/**
 * @desc    Create a new appointment
 * @route   POST /api/opd/appointments
 */
exports.createAppointment = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user.id;

    const appointment = await Appointment.create(req.body);
    await appointment.populate(['patient', 'doctor', 'department']);

    res.status(201).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Get all appointments
 * @route   GET /api/opd/appointments
 */
exports.getAllAppointments = asyncHandler(async (req, res, next) => {
    const { date, doctor, department, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (date) query.scheduledDate = new Date(date);
    if (doctor) query.doctor = doctor;
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const appointments = await Appointment.find(query)
        .populate('patient', 'patientId firstName lastName phone')
        .populate('doctor', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ scheduledDate: 1, tokenNumber: 1 });

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
        success: true,
        count: appointments.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: appointments,
    });
});

/**
 * @desc    Get appointment by ID
 * @route   GET /api/opd/appointments/:id
 */
exports.getAppointmentById = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('patient')
        .populate('doctor', 'profile')
        .populate('department');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    res.status(200).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Update appointment
 * @route   PUT /api/opd/appointments/:id
 */
exports.updateAppointment = asyncHandler(async (req, res, next) => {
    // Fetch full appointment first to ensure all fields are populated
    let appointment = await Appointment.findById(req.params.id)
        .populate('patient')
        .populate('doctor')
        .populate('department');

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    // Update the appointment with new values
    Object.assign(appointment, req.body);
    await appointment.save();

    // Reload to get populated references after save
    appointment = await Appointment.findById(appointment._id)
        .populate('patient')
        .populate('doctor')
        .populate('department');

    // Automated Billing: If status changed to 'completed', add Consultation Fee
    if (req.body.status === 'completed') {
        try {
            const { addItemToBill } = require('../services/billing.internal.service');

            // Ensure appointment has patient and doctor data
            if (!appointment.patient || !appointment.doctor) {
                throw new Error('Appointment patient or doctor is missing');
            }

            await addItemToBill({
                patientId: appointment.patient._id,
                visitId: appointment._id,
                visitType: 'opd',
                itemType: 'consultation',
                itemReference: appointment._id,
                description: `OPD Consultation - Dr. ${appointment.doctor.profile.firstName} ${appointment.doctor.profile.lastName}`,
                quantity: 1,
                rate: undefined, // Will fetch default tariff in service
                generatedBy: req.user.id
            });
            console.log(`[OPD] Billing trigger sent for visit ${appointment._id}`);
        } catch (err) {
            console.error('[OPD] Failed to trigger automated billing:', err);
            console.error(err.stack); // Log stack trace
        }

        // CREATE PRESCRIPTION IF PROVIDED
        if (req.body.prescription && Array.isArray(req.body.prescription) && req.body.prescription.length > 0) {
            try {
                fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Start creating prescription for ${appointment._id}\n`);
                console.log(`[OPD] Creating prescription for visit ${appointment._id}`);
                const prescriptionItems = [];

                for (const medItem of req.body.prescription) {
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Processing med: ${medItem.name}\n`);

                    // Validate required fields
                    const dosage = (medItem.dosage || '').trim();
                    const frequency = (medItem.frequency || '').trim();
                    const duration = (medItem.duration || '').trim();

                    if (!dosage || !frequency || !duration) {
                        fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Missing required fields for ${medItem.name}: dosage=${dosage}, frequency=${frequency}, duration=${duration}\n`);
                        console.warn(`[OPD] Missing required fields for medicine: ${medItem.name}`);
                        continue; // Skip this medicine
                    }

                    // Look up medicine by name (case insensitive regex)
                    let medicine = await Medicine.findOne({
                        $or: [
                            { name: { $regex: new RegExp('^' + medItem.name.trim(), 'i') } },
                            { medicineCode: { $regex: new RegExp('^' + medItem.name.trim(), 'i') } }
                        ]
                    });

                    if (medicine) {
                        fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Found med: ${medicine.name} (${medicine._id})\n`);
                        prescriptionItems.push({
                            medicine: medicine._id,
                            dosage: dosage,
                            frequency: frequency,
                            duration: duration,
                            quantity: medItem.quantity || 10,
                            instructions: (medItem.instructions || '').trim()
                        });
                    } else {
                        fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Med NOT FOUND: ${medItem.name}\n`);
                        console.warn(`[OPD] Medicine not found: ${medItem.name}`);
                    }
                }

                if (prescriptionItems.length > 0) {
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Creating Prescription with ${prescriptionItems.length} items\n`);

                    // CRITICAL FIX: Use appointment.patient._id and appointment.doctor._id properly
                    // appointment was already populated above, so these should be objects not null
                    const newRx = await Prescription.create({
                        patient: appointment.patient._id,
                        doctor: appointment.doctor._id,
                        visit: appointment._id,
                        visitModel: 'Appointment',
                        medicines: prescriptionItems,
                        isDispensed: false,
                        specialInstructions: req.body.notes || ''
                    });
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] Created Rx ID: ${newRx._id}\n`);
                    console.log(`[OPD] Prescription created successfully with ${prescriptionItems.length} items.`);
                } else {
                    fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] No valid medicines found to create Rx\n`);
                }
            } catch (err) {
                fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] ERROR: ${err.message}\n${err.stack}\n`);
                console.error('[OPD] Failed to create prescription:', err);
                console.error(err.stack);
            }
        } else {
            fs.appendFileSync('debug_opd.log', `[${new Date().toISOString()}] No prescription body found or empty array\n`);
        }

        // AUTO-CREATE CLINICAL CODING RECORD
        try {
            const { createCodingForEncounter } = require('../services/clinicalCoding.service');
            await createCodingForEncounter({
                patient: appointment.patient._id,
                encounter: appointment._id,
                encounterModel: 'Appointment',
                encounterType: 'opd',
                finalizingDoctor: appointment.doctor._id || req.user.id,
                createdBy: req.user.id
            });
            console.log(`[OPD] Clinical coding record created for visit ${appointment._id}`);
        } catch (err) {
            console.error('[OPD] Failed to create clinical coding record:', err.message);
        }
    }

    res.status(200).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Cancel appointment
 * @route   DELETE /api/opd/appointments/:id
 */
exports.cancelAppointment = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    await appointment.save();

    res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
    });
});

/**
 * @desc    Check-in patient
 * @route   PUT /api/opd/appointments/:id/checkin
 */
exports.checkInPatient = asyncHandler(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new ErrorResponse('Appointment not found', 404));
    }

    // Generate token number for the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tokenCount = await Appointment.countDocuments({
        doctor: appointment.doctor,
        scheduledDate: { $gte: today },
        status: { $in: [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_CONSULTATION, APPOINTMENT_STATUS.COMPLETED] },
    });

    appointment.status = APPOINTMENT_STATUS.CHECKED_IN;
    appointment.tokenNumber = tokenCount + 1;
    await appointment.save();

    res.status(200).json({
        success: true,
        data: appointment,
    });
});

/**
 * @desc    Get OPD queue
 * @route   GET /api/opd/queue
 */
exports.getOPDQueue = asyncHandler(async (req, res, next) => {
    const { doctor, department } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
        scheduledDate: { $gte: today },
        status: { $in: [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.SCHEDULED] },
    };

    if (doctor) query.doctor = doctor;
    if (department) query.department = department;

    const queue = await Appointment.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('doctor', 'profile.firstName profile.lastName')
        .sort({ tokenNumber: 1, scheduledTime: 1 });

    res.status(200).json({
        success: true,
        count: queue.length,
        data: queue,
    });
});

/**
 * @desc    Get OPD dashboard stats
 * @route   GET /api/opd/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayStats, statusBreakdown] = await Promise.all([
        Appointment.countDocuments({
            scheduledDate: { $gte: today, $lt: tomorrow },
        }),
        Appointment.aggregate([
            { $match: { scheduledDate: { $gte: today, $lt: tomorrow } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalToday: todayStats,
            statusBreakdown: statusBreakdown.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
        },
    });
});
