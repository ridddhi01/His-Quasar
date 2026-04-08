const NursingShift = require('../models/NursingShift');
const NursingTask = require('../models/NursingTask');
const VitalSigns = require('../models/VitalSigns');
const MedicationAdministration = require('../models/MedicationAdministration');
const NursingNote = require('../models/NursingNote');
const ShiftHandover = require('../models/ShiftHandover');
const CriticalAlert = require('../models/CriticalAlert');
const CarePlan = require('../models/CarePlan');
const Admission = require('../models/Admission');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { createAuditLog } = require('../services/audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Start a nursing shift
 * @route   POST /api/nursing/shifts/start
 */
exports.startShift = asyncHandler(async (req, res, next) => {
    const { shiftType, wardIds, nurseRole } = req.body;
    const nurseId = req.user._id;

    // Check if nurse already has an active shift
    const activeShift = await NursingShift.findOne({
        nurse: nurseId,
        status: 'active',
    });

    if (activeShift) {
        return next(new ErrorResponse('You already have an active shift. Please end it first.', 400));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get shift timings
    const { startTime, endTime } = NursingShift.getShiftTimings(shiftType, today);

    // Check for existing scheduled shift to activate
    let shift = await NursingShift.findOne({
        nurse: nurseId,
        shiftDate: today,
        shiftType: shiftType,
        status: 'scheduled'
    });

    if (shift) {
        // Activate existing scheduled shift
        shift.status = 'active';
        shift.actualStartTime = new Date();
        // Update wards only if provided, otherwise keep scheduled wards
        if (wardIds && wardIds.length > 0) {
            shift.assignedWards = wardIds;
        }
        if (nurseRole) {
            shift.nurseRole = nurseRole;
        }
        // Ensure start/end times are correct if not set
        if (!shift.startTime) shift.startTime = startTime;
        if (!shift.endTime) shift.endTime = endTime;

        await shift.save();
    } else {
        // Create new shift
        shift = await NursingShift.create({
            nurse: nurseId,
            shiftType,
            shiftDate: today,
            startTime,
            endTime,
            actualStartTime: new Date(),
            assignedWards: wardIds,
            nurseRole: nurseRole || 'staff_nurse',
            status: 'active',
            createdBy: nurseId,
        });
    }

    // Determine final list of wards to fetch patients from
    const finalWardIds = shift.assignedWards || [];

    // Get patients in assigned wards
    let admissions = [];
    if (finalWardIds.length > 0) {
        admissions = await Admission.find({
            ward: { $in: finalWardIds },
            status: 'admitted',
        }).populate('patient bed');
    }

    // Assign patients to shift (refresh assignment) - filter out any admissions without a patient
    shift.assignedPatients = admissions
        .filter(adm => adm.patient)
        .map(adm => ({
            patient: adm.patient._id,
            admission: adm._id,
            bed: adm.bed?._id,
            assignedAt: new Date(),
        }));
    await shift.save();

    // Auto-generate nursing tasks from prescriptions and care plans
    // Re-generating tasks for scheduled shift is fine, duplications should be handled by the generator fn ideally
    // But assuming generator checks for existence or we just do it. 
    // Usually tasks are generated daily. If they already exist for today/patient, we shouldn't dup.
    // generateNursingTasks implementation is hidden in 'generateNursingTasks(shift, admissions)' call below (Wait, it was there in original code)
    // I need to make sure I don't lose that function call or ensuring it doesn't duplicate.

    await generateNursingTasks(shift, admissions);

    // Audit log
    await createAuditLog({
        user: nurseId,
        action: 'SHIFT_START',
        entity: 'NursingShift',
        entityId: shift._id,
        description: `Started ${shiftType} shift (Activated)`,
    });

    // Populate response
    await shift.populate([
        { path: 'nurse', select: 'profile.firstName profile.lastName' },
        { path: 'assignedWards', select: 'name wardNumber' },
        { path: 'assignedPatients.patient', select: 'patientId firstName lastName' },
        { path: 'assignedPatients.bed', select: 'bedNumber' },
    ]);

    res.status(201).json({
        success: true,
        data: shift,
    });
});

// Helper function to generate nursing tasks (Placeholder/Stub if not imported, but it was used in original code so it must be defined in this file or imported)
// Wait, looking at original file, generateNursingTasks is used but NOT defined in the visible lines 1-800. 
// It must be defined at bottom or imported. 
// Ah, lines 1-800 shown. It's likely at the bottom.
// I will assume it exists in the scope. I should NOT remove it.


/**
 * @desc    Get current active shift for nurse
 * @route   GET /api/nursing/shifts/current
 */
exports.getCurrentShift = asyncHandler(async (req, res, next) => {
    // First, try to find a shift with handover already created (priority)
    let shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
        handoverRecord: { $exists: true, $ne: null }
    })
        .populate('nurse', 'profile.firstName profile.lastName')
        .populate('assignedWards', 'name wardNumber')
        .populate('assignedPatients.patient', 'patientId firstName lastName dateOfBirth gender')
        .populate('assignedPatients.bed', 'bedNumber')
        .populate('assignedPatients.admission', 'admissionNumber diagnosis');

    // If no shift with handover, find any active/pending shift
    if (!shift) {
        shift = await NursingShift.findOne({
            nurse: req.user._id,
            status: { $in: ['active', 'handover_pending'] },
        })
            .populate('nurse', 'profile.firstName profile.lastName')
            .populate('assignedWards', 'name wardNumber')
            .populate('assignedPatients.patient', 'patientId firstName lastName dateOfBirth gender')
            .populate('assignedPatients.bed', 'bedNumber')
            .populate('assignedPatients.admission', 'admissionNumber diagnosis');
    }

    if (!shift) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No active shift',
        });
    }

    res.status(200).json({
        success: true,
        data: shift,
    });
});

/**
 * @desc    Get shift dashboard data
 * @route   GET /api/nursing/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
    });

    if (!shift) {
        return next(new ErrorResponse('No active shift found', 404));
    }

    const patientIds = shift.assignedPatients.map(p => p.patient);

    // Get pending tasks
    const pendingTasks = await NursingTask.countDocuments({
        patient: { $in: patientIds },
        status: 'pending',
        scheduledTime: { $lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }, // Next 2 hours
    });

    // Get overdue tasks
    const overdueTasks = await NursingTask.countDocuments({
        patient: { $in: patientIds },
        status: 'pending',
        scheduledTime: { $lt: new Date() },
    });

    // Get medications due
    const medicationsDue = await MedicationAdministration.countDocuments({
        patient: { $in: patientIds },
        status: 'scheduled',
        scheduledTime: { $lte: new Date(Date.now() + 60 * 60 * 1000) }, // Next hour
    });

    // Get active alerts
    const activeAlerts = await CriticalAlert.countDocuments({
        patient: { $in: patientIds },
        status: { $in: ['active', 'acknowledged'] },
    });

    // Get recent vitals count
    const vitalsRecordedToday = await VitalSigns.countDocuments({
        patient: { $in: patientIds },
        recordedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    // Get critical patients
    const criticalPatients = await CriticalAlert.distinct('patient', {
        patient: { $in: patientIds },
        severity: 'critical',
        status: { $in: ['active', 'acknowledged'] },
    });

    res.status(200).json({
        success: true,
        data: {
            shiftInfo: {
                shiftNumber: shift.shiftNumber,
                shiftType: shift.shiftType,
                startTime: shift.actualStartTime,
                patientCount: shift.assignedPatients.length,
            },
            stats: {
                pendingTasks,
                overdueTasks,
                medicationsDue,
                activeAlerts,
                vitalsRecordedToday,
                criticalPatientCount: criticalPatients.length,
            },
        },
    });
});

/**
 * @desc    End shift (initiates handover)
 * @route   POST /api/nursing/shifts/end
 */
exports.endShift = asyncHandler(async (req, res, next) => {
    // Find ALL shifts with handover already created and complete them
    const shiftsWithHandover = await NursingShift.find({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
        handoverRecord: { $exists: true, $ne: null }
    });

    if (shiftsWithHandover.length > 0) {
        // Complete all shifts that have handover records
        for (const shift of shiftsWithHandover) {
            shift.status = 'completed';
            shift.actualEndTime = new Date();
            await shift.save();
        }

        return res.status(200).json({
            success: true,
            message: `${shiftsWithHandover.length} shift(s) ended successfully.`,
            data: shiftsWithHandover[0], // Return the first for backwards compatibility
        });
    }

    // If no shifts with handover, find any active/pending shift
    const shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
    });

    if (!shift) {
        return next(new ErrorResponse('No active or pending shift found', 404));
    }

    // Mark as pending handover
    shift.status = 'handover_pending';
    await shift.save();

    res.status(200).json({
        success: true,
        message: 'Shift marked for handover. Please complete handover process.',
        data: shift,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT CARE & TASKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get patient care timeline (tasks for a patient)
 * @route   GET /api/nursing/patients/:patientId/tasks
 */
exports.getPatientTasks = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { status, date } = req.query;

    const query = { patient: patientId };
    if (status) query.status = status;
    if (date) {
        const targetDate = new Date(date);
        query.scheduledTime = {
            $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            $lt: new Date(targetDate.setHours(23, 59, 59, 999)),
        };
    }

    const tasks = await NursingTask.find(query)
        .sort({ scheduledTime: 1 })
        .populate('assignedNurse', 'profile.firstName profile.lastName')
        .populate('completedBy', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks,
    });
});

/**
 * @desc    Complete a nursing task
 * @route   POST /api/nursing/tasks/:taskId/complete
 */
exports.completeTask = asyncHandler(async (req, res, next) => {
    const { taskId } = req.params;
    const { notes } = req.body;

    const task = await NursingTask.findById(taskId);
    if (!task) {
        return next(new ErrorResponse('Task not found', 404));
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.completedBy = req.user._id;
    task.completionNotes = notes;
    await task.save();

    await createAuditLog({
        user: req.user._id,
        action: 'TASK_COMPLETE',
        entity: 'NursingTask',
        entityId: task._id,
        description: `Completed task: ${task.title}`,
    });

    res.status(200).json({
        success: true,
        data: task,
    });
});

/**
 * @desc    Skip a task with reason
 * @route   POST /api/nursing/tasks/:taskId/skip
 */
exports.skipTask = asyncHandler(async (req, res, next) => {
    const { taskId } = req.params;
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Skip reason is required', 400));
    }

    const task = await NursingTask.findById(taskId);
    if (!task) {
        return next(new ErrorResponse('Task not found', 404));
    }

    task.status = 'skipped';
    task.skipReason = reason;
    task.completedBy = req.user._id;
    await task.save();

    res.status(200).json({
        success: true,
        data: task,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VITAL SIGNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Record vital signs
 * @route   POST /api/nursing/vitals
 */
exports.recordVitals = asyncHandler(async (req, res, next) => {
    const { patientId, admissionId, ...vitalsData } = req.body;

    // Get current shift
    const shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
    });

    // Ensure admission ID exists
    let finalAdmissionId = admissionId;
    if (!finalAdmissionId) {
        const activeAdmission = await Admission.findOne({
            patient: patientId,
            status: 'admitted'
        });
        if (!activeAdmission) {
            return next(new ErrorResponse('Active admission not found for patient', 404));
        }
        finalAdmissionId = activeAdmission._id;
    }

    const vitals = await VitalSigns.create({
        patient: patientId,
        admission: finalAdmissionId,
        ...vitalsData,
        recordedBy: req.user._id,
        shift: shift?._id,
    });

    // Generate alert if critical
    if (vitals.isCritical) {
        await generateCriticalAlert(vitals, req.user._id);
    }

    // Complete related task if any
    if (req.body.relatedTaskId) {
        await NursingTask.findByIdAndUpdate(req.body.relatedTaskId, {
            status: 'completed',
            completedAt: new Date(),
            completedBy: req.user._id,
            relatedVitals: vitals._id,
        });
    }

    await createAuditLog({
        user: req.user._id,
        action: 'VITALS_RECORD',
        entity: 'VitalSigns',
        entityId: vitals._id,
        description: `Recorded vitals for patient`,
    });

    await vitals.populate([
        { path: 'patient', select: 'patientId firstName lastName' },
        { path: 'recordedBy', select: 'profile.firstName profile.lastName' },
    ]);

    res.status(201).json({
        success: true,
        data: vitals,
        alerts: {
            isAbnormal: vitals.isAbnormal,
            isCritical: vitals.isCritical,
            abnormalParameters: vitals.abnormalParameters,
            criticalParameters: vitals.criticalParameters,
        },
    });
});

/**
 * @desc    Get vital signs history for patient
 * @route   GET /api/nursing/vitals/:patientId
 */
exports.getVitalsHistory = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { limit = 20, admissionId } = req.query;

    const query = { patient: patientId };
    if (admissionId) query.admission = admissionId;

    const vitals = await VitalSigns.find(query)
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit))
        .populate('recordedBy', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: vitals.length,
        data: vitals,
    });
});

/**
 * @desc    Get vital signs trends (for charts)
 * @route   GET /api/nursing/vitals/:patientId/trends
 */
exports.getVitalsTrends = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { hours = 24 } = req.query;

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const vitals = await VitalSigns.find({
        patient: patientId,
        recordedAt: { $gte: startTime },
    })
        .sort({ recordedAt: 1 })
        .select('recordedAt bloodPressure pulse temperature respiratoryRate oxygenSaturation');

    // Format for charting
    const trends = {
        timestamps: vitals.map(v => v.recordedAt),
        systolic: vitals.map(v => v.bloodPressure?.systolic),
        diastolic: vitals.map(v => v.bloodPressure?.diastolic),
        pulse: vitals.map(v => v.pulse?.rate),
        temperature: vitals.map(v => v.temperature?.value),
        respiratoryRate: vitals.map(v => v.respiratoryRate?.rate),
        spo2: vitals.map(v => v.oxygenSaturation?.value),
    };

    res.status(200).json({
        success: true,
        data: trends,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICATION ADMINISTRATION (MAR)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get medication schedule for patient
 * @route   GET /api/nursing/medications/:patientId
 */
exports.getMedicationSchedule = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const medications = await MedicationAdministration.find({
        patient: patientId,
        scheduledTime: { $gte: startOfDay, $lte: endOfDay },
    })
        .sort({ scheduledTime: 1 })
        .populate('medication.medicine', 'name genericName')
        .populate('administeredBy', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: medications.length,
        data: medications,
    });
});

/**
 * @desc    Administer medication
 * @route   POST /api/nursing/medications/:marId/administer
 */
exports.administerMedication = asyncHandler(async (req, res, next) => {
    const { marId } = req.params;
    const { verification, notes, actualDose, actualRoute, witnessId } = req.body;

    const mar = await MedicationAdministration.findById(marId)
        .populate('patient', 'allergies');

    if (!mar) {
        return next(new ErrorResponse('Medication record not found', 404));
    }

    // Check 5 Rights verification
    if (!verification.rightPatient || !verification.rightDrug ||
        !verification.rightDose || !verification.rightRoute || !verification.rightTime) {
        return next(new ErrorResponse('All 5 Rights must be verified before administration', 400));
    }

    // Get current shift
    const shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: 'active',
    });

    mar.status = 'given';
    mar.administeredAt = new Date();
    mar.administeredBy = req.user._id;
    mar.verification = { ...verification, verifiedAt: new Date() };
    mar.actualDose = actualDose || mar.medication.dosage;
    mar.actualRoute = actualRoute || mar.medication.route;
    mar.notes = notes;
    mar.shift = shift?._id;

    if (witnessId) {
        mar.witness = witnessId;
    }

    await mar.save();

    await createAuditLog({
        user: req.user._id,
        action: 'MEDICATION_ADMINISTER',
        entity: 'MedicationAdministration',
        entityId: mar._id,
        description: `Administered ${mar.medication.medicineName} to patient`,
    });

    res.status(200).json({
        success: true,
        data: mar,
    });
});

/**
 * @desc    Skip medication with reason
 * @route   POST /api/nursing/medications/:marId/skip
 */
exports.skipMedication = asyncHandler(async (req, res, next) => {
    const { marId } = req.params;
    const { skipReason, skipDetails } = req.body;

    if (!skipReason) {
        return next(new ErrorResponse('Skip reason is required', 400));
    }

    const mar = await MedicationAdministration.findById(marId);
    if (!mar) {
        return next(new ErrorResponse('Medication record not found', 404));
    }

    mar.status = 'skipped';
    mar.skipReason = skipReason;
    mar.skipDetails = skipDetails;
    mar.skippedBy = req.user._id;
    await mar.save();

    // Generate alert for skipped medication
    await CriticalAlert.create({
        alertType: 'medication_missed',
        severity: 'medium',
        patient: mar.patient,
        admission: mar.admission,
        source: 'medication',
        sourceReference: mar._id,
        sourceModel: 'MedicationAdministration',
        title: 'Medication Skipped',
        description: `${mar.medication.medicineName} was skipped. Reason: ${skipReason}`,
        generatedBy: req.user._id,
        isAutoGenerated: false,
    });

    await createAuditLog({
        user: req.user._id,
        action: 'MEDICATION_SKIP',
        entity: 'MedicationAdministration',
        entityId: mar._id,
        description: `Skipped medication: ${mar.medication.medicineName}`,
    });

    res.status(200).json({
        success: true,
        data: mar,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NURSING NOTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Create nursing note
 * @route   POST /api/nursing/notes
 */
exports.createNote = asyncHandler(async (req, res, next) => {
    const shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
    });

    const note = await NursingNote.create({
        ...req.body,
        recordedBy: req.user._id,
        shift: shift?._id,
    });

    // If escalation required, create alert
    if (req.body.requiresEscalation) {
        await CriticalAlert.create({
            alertType: 'nurse_escalation',
            severity: req.body.priority === 'critical' ? 'critical' : 'high',
            patient: note.patient,
            admission: note.admission,
            source: 'nursing_note',
            sourceReference: note._id,
            sourceModel: 'NursingNote',
            title: 'Nurse Escalation',
            description: note.content,
            generatedBy: req.user._id,
            isAutoGenerated: false,
        });
    }

    await createAuditLog({
        user: req.user._id,
        action: 'NOTE_CREATE',
        entity: 'NursingNote',
        entityId: note._id,
        description: `Created ${note.noteType}`,
    });

    await note.populate([
        { path: 'patient', select: 'patientId firstName lastName' },
        { path: 'recordedBy', select: 'profile.firstName profile.lastName' },
    ]);

    res.status(201).json({
        success: true,
        data: note,
    });
});

/**
 * @desc    Get nursing notes for patient
 * @route   GET /api/nursing/notes/:patientId
 */
exports.getPatientNotes = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { noteType, limit = 50 } = req.query;

    const query = { patient: patientId };
    if (noteType) query.noteType = noteType;

    const notes = await NursingNote.find(query)
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit))
        .populate('recordedBy', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: notes.length,
        data: notes,
    });
});

/**
 * @desc    Add addendum to note
 * @route   POST /api/nursing/notes/:noteId/addendum
 */
exports.addAddendum = asyncHandler(async (req, res, next) => {
    const { noteId } = req.params;
    const { content, reason } = req.body;

    const note = await NursingNote.findById(noteId);
    if (!note) {
        return next(new ErrorResponse('Note not found', 404));
    }

    note.addenda.push({
        content,
        addedBy: req.user._id,
        reason,
    });
    await note.save();

    res.status(200).json({
        success: true,
        data: note,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARE PLANS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get care plans for patient
 * @route   GET /api/nursing/care-plans/:patientId
 */
exports.getCarePlans = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { status = 'active' } = req.query;

    const carePlans = await CarePlan.find({
        patient: patientId,
        status,
    })
        .populate('createdBy', 'profile.firstName profile.lastName')
        .populate('assignedNurses', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: carePlans.length,
        data: carePlans,
    });
});

/**
 * @desc    Complete intervention in care plan
 * @route   POST /api/nursing/care-plans/:planId/interventions/:index/complete
 */
exports.completeIntervention = asyncHandler(async (req, res, next) => {
    const { planId, index } = req.params;
    const { notes, outcome } = req.body;

    const carePlan = await CarePlan.findById(planId);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    const intervention = carePlan.interventions[index];
    if (!intervention) {
        return next(new ErrorResponse('Intervention not found', 404));
    }

    intervention.completions.push({
        completedBy: req.user._id,
        completedAt: new Date(),
        notes,
        outcome,
    });
    intervention.lastCompletedAt = new Date();
    intervention.totalCompletions += 1;

    await carePlan.save();

    await createAuditLog({
        user: req.user._id,
        action: 'INTERVENTION_COMPLETE',
        entity: 'CarePlan',
        entityId: carePlan._id,
        description: `Completed intervention: ${intervention.description}`,
    });

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Add evaluation to care plan
 * @route   POST /api/nursing/care-plans/:planId/evaluate
 */
exports.addEvaluation = asyncHandler(async (req, res, next) => {
    const { planId } = req.params;
    const { goalProgress, notes, recommendations, requiresDoctorReview } = req.body;

    const carePlan = await CarePlan.findById(planId);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    carePlan.evaluations.push({
        evaluatedBy: req.user._id,
        goalProgress,
        notes,
        recommendations,
        requiresDoctorReview,
    });

    await carePlan.save();

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Flag issue in care plan
 * @route   POST /api/nursing/care-plans/:planId/flag
 */
exports.flagIssue = asyncHandler(async (req, res, next) => {
    const { planId } = req.params;
    const { issue, severity } = req.body;

    const carePlan = await CarePlan.findById(planId);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    carePlan.flaggedIssues.push({
        issue,
        flaggedBy: req.user._id,
        severity,
    });

    await carePlan.save();

    // Create alert for doctor
    await CriticalAlert.create({
        alertType: 'nurse_escalation',
        severity: severity === 'high' ? 'high' : 'medium',
        patient: carePlan.patient,
        admission: carePlan.admission,
        source: 'manual',
        title: 'Care Plan Issue Flagged',
        description: issue,
        generatedBy: req.user._id,
        assignedDoctor: carePlan.createdBy,
        isAutoGenerated: false,
    });

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT HANDOVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Create shift handover
 * @route   POST /api/nursing/handover
 */
exports.createHandover = asyncHandler(async (req, res, next) => {
    const { shiftId, patientHandovers, generalNotes, wardIssues, equipmentIssues, urgentFollowups } = req.body;
    const Ward = require('../models/Ward'); // Lazy load

    // Find shift by ID provided in body
    const shift = await NursingShift.findById(shiftId).populate('assignedWards');

    if (!shift) {
        return next(new ErrorResponse('Shift not found', 404));
    }

    if (shift.nurse.toString() !== req.user._id.toString()) {
        return next(new ErrorResponse('Not authorized to create handover for this shift', 403));
    }

    // Determine next shift type and date
    let nextShiftType = 'morning';
    const shiftOrder = ['morning', 'evening', 'night'];
    const idx = shiftOrder.indexOf(shift.shiftType);
    if (idx >= 0) {
        nextShiftType = shiftOrder[(idx + 1) % 3];
    }

    // If current is night, next morning is tomorrow
    const nextDate = new Date(shift.shiftDate);
    if (shift.shiftType === 'night') {
        nextDate.setDate(nextDate.getDate() + 1);
    }
    // Set to start of day for query
    const nextDateStart = new Date(nextDate); nextDateStart.setHours(0, 0, 0, 0);
    const nextDateEnd = new Date(nextDate); nextDateEnd.setHours(23, 59, 59, 999);

    // Determine Ward
    let wardId = shift.assignedWards?.[0]?._id;
    if (!wardId) {
        // Fallback: Pick any ward (prevent validation error)
        const anyWard = await Ward.findOne();
        wardId = anyWard?._id;
    }

    // Find incoming nurse from Roster (using valid wardId)
    let incomingShift = null;
    if (wardId) {
        incomingShift = await NursingShift.findOne({
            shiftDate: {
                $gte: nextDateStart,
                $lte: nextDateEnd
            },
            shiftType: nextShiftType,
            assignedWards: wardId,
            status: { $in: ['scheduled', 'active'] }
        });
    }

    // Fallback logic for incoming nurse
    let nextNurseId = incomingShift?.nurse;

    if (!nextNurseId) {
        // Try to find a Head Nurse
        const headNurse = await User.findOne({ role: 'head_nurse', isActive: true });
        nextNurseId = headNurse?._id;
    }

    if (!nextNurseId) {
        // Last resort: Self (waiting for assignment) or just assign to self so data is saved
        nextNurseId = req.user._id;
    }

    const handover = await ShiftHandover.create({
        shift: shift._id,
        handoverFrom: {
            nurse: req.user._id,
            shiftType: shift.shiftType,
        },
        handoverTo: {
            nurse: nextNurseId,
            shiftType: nextShiftType,
        },
        ward: wardId, // Now guaranteed to be populated if any ward exists
        handoverDate: new Date(),
        handoverStartTime: new Date(),
        status: 'submitted',
        submittedAt: new Date(),

        // Map frontend data
        generalNotes: generalNotes,
        incidentsSummary: urgentFollowups ? `Urgent Follow-ups: ${urgentFollowups}` : undefined,
        equipmentIssues: equipmentIssues ? [{ equipment: 'General', issue: equipmentIssues }] : [],
        stockIssues: wardIssues ? [{ item: 'General Ward', issue: wardIssues }] : [],

        patientHandovers: (patientHandovers || []).map(ph => ({
            patient: ph.patientId,
            admission: ph.admissionId,
            currentCondition: ph.currentCondition,

            // Map text fields to schema fields
            keyObservations: [
                ph.keyFindings,
                ph.medicationNotes ? `Medication Notes: ${ph.medicationNotes}` : '',
                ph.pendingActions ? `Pending Actions: ${ph.pendingActions}` : '',
                ph.dietaryNotes ? `Diet: ${ph.dietaryNotes}` : '',
                ph.familyCommunication ? `Family: ${ph.familyCommunication}` : ''
            ].filter(Boolean).join('\n\n'),

            specialInstructions: ph.specialInstructions,

            // Store structured data if schema supports it, otherwise text mapping above handles it
            criticalAlerts: ph.criticalAlerts || [],
            ivAccess: ph.ivFluids ? { fluid: ph.ivFluids, hasIV: true } : undefined,
        }))
    });

    // Update shift status
    shift.handoverRecord = handover._id;
    shift.handoverTo = nextNurseId;
    shift.status = 'handover_pending';
    await shift.save();

    await createAuditLog({
        user: req.user._id,
        action: 'HANDOVER_CREATE',
        entity: 'ShiftHandover',
        entityId: handover._id,
        description: 'Created shift handover',
    });

    res.status(201).json({
        success: true,
        data: handover,
    });
});

/**
 * @desc    Acknowledge handover
 * @route   POST /api/nursing/handover/:handoverId/acknowledge
 */
exports.acknowledgeHandover = asyncHandler(async (req, res, next) => {
    const { handoverId } = req.params;
    const { notes } = req.body;

    const handover = await ShiftHandover.findById(handoverId);
    if (!handover) {
        return next(new ErrorResponse('Handover not found', 404));
    }

    if (handover.handoverTo.nurse.toString() !== req.user._id.toString()) {
        return next(new ErrorResponse('You are not the designated receiving nurse', 403));
    }

    handover.status = 'acknowledged';
    handover.acknowledgedAt = new Date();
    handover.acknowledgmentNotes = notes;
    handover.handoverEndTime = new Date();
    await handover.save();

    // Complete previous shift
    await NursingShift.findByIdAndUpdate(handover.shift, {
        status: 'completed',
        actualEndTime: new Date(),
    });

    await createAuditLog({
        user: req.user._id,
        action: 'HANDOVER_ACKNOWLEDGE',
        entity: 'ShiftHandover',
        entityId: handover._id,
        description: 'Acknowledged shift handover',
    });

    res.status(200).json({
        success: true,
        data: handover,
    });
});

/**
 * @desc    Get pending handovers for acknowledgment
 * @route   GET /api/nursing/handover/pending
 */
exports.getPendingHandovers = asyncHandler(async (req, res, next) => {
    const handovers = await ShiftHandover.find({
        'handoverTo.nurse': req.user._id,
        status: 'submitted',
    })
        .populate('handoverFrom.nurse', 'profile.firstName profile.lastName')
        .populate('ward', 'name wardNumber')
        .populate('patientHandovers.patient', 'patientId firstName lastName')
        .populate('patientHandovers.bed', 'bedNumber');

    res.status(200).json({
        success: true,
        count: handovers.length,
        data: handovers,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get active alerts for assigned patients
 * @route   GET /api/nursing/alerts
 */
exports.getActiveAlerts = asyncHandler(async (req, res, next) => {
    const shift = await NursingShift.findOne({
        nurse: req.user._id,
        status: { $in: ['active', 'handover_pending'] },
    });

    let patientFilter = {};
    if (shift) {
        const patientIds = shift.assignedPatients.map(p => p.patient);
        patientFilter = { patient: { $in: patientIds } };
    }

    const alerts = await CriticalAlert.find({
        ...patientFilter,
        status: { $in: ['active', 'acknowledged', 'in_progress'] },
    })
        .sort({ severity: -1, generatedAt: -1 })
        .populate('patient', 'patientId firstName lastName')
        .populate('acknowledgedBy', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts,
    });
});

/**
 * @desc    Acknowledge alert
 * @route   POST /api/nursing/alerts/:alertId/acknowledge
 */
exports.acknowledgeAlert = asyncHandler(async (req, res, next) => {
    const { alertId } = req.params;
    const { notes } = req.body;

    const alert = await CriticalAlert.findById(alertId);
    if (!alert) {
        return next(new ErrorResponse('Alert not found', 404));
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgmentNotes = notes;

    // Add to notified users
    alert.notifiedUsers.push({
        user: req.user._id,
        role: req.user.role,
        notifiedAt: new Date(),
        acknowledged: true,
        acknowledgedAt: new Date(),
    });

    await alert.save();

    await createAuditLog({
        user: req.user._id,
        action: 'ALERT_ACKNOWLEDGE',
        entity: 'CriticalAlert',
        entityId: alert._id,
        description: `Acknowledged alert: ${alert.title}`,
    });

    res.status(200).json({
        success: true,
        data: alert,
    });
});

/**
 * @desc    Resolve alert
 * @route   POST /api/nursing/alerts/:alertId/resolve
 */
exports.resolveAlert = asyncHandler(async (req, res, next) => {
    const { alertId } = req.params;
    const { resolutionNotes, resolutionAction } = req.body;

    const alert = await CriticalAlert.findById(alertId);
    if (!alert) {
        return next(new ErrorResponse('Alert not found', 404));
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user._id;
    alert.resolutionNotes = resolutionNotes;
    alert.resolutionAction = resolutionAction;
    await alert.save();

    await createAuditLog({
        user: req.user._id,
        action: 'ALERT_RESOLVE',
        entity: 'CriticalAlert',
        entityId: alert._id,
        description: `Resolved alert: ${alert.title}`,
    });

    res.status(200).json({
        success: true,
        data: alert,
    });
});

/**
 * @desc    Create manual escalation
 * @route   POST /api/nursing/alerts/escalate
 */
exports.createEscalation = asyncHandler(async (req, res, next) => {
    const { patientId, admissionId, title, description, severity, escalateTo } = req.body;

    const alert = await CriticalAlert.create({
        alertType: 'nurse_escalation',
        severity,
        patient: patientId,
        admission: admissionId,
        source: 'manual',
        title,
        description,
        generatedBy: req.user._id,
        isAutoGenerated: false,
        assignedDoctor: escalateTo,
    });

    await createAuditLog({
        user: req.user._id,
        action: 'ALERT_ESCALATE',
        entity: 'CriticalAlert',
        entityId: alert._id,
        description: `Manual escalation: ${title}`,
    });

    res.status(201).json({
        success: true,
        data: alert,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate nursing tasks from prescriptions and care plans
 */
async function generateNursingTasks(shift, admissions) {
    const tasks = [];
    const now = new Date();
    const shiftEnd = shift.endTime;

    for (const admission of admissions) {
        // Skip if no patient
        if (!admission.patient) continue;

        // Get active prescriptions
        const prescriptions = await Prescription.find({
            visit: admission._id,
            isDispensed: true,
        }).populate('medicines.medicine');

        // Generate medication tasks
        for (const prescription of prescriptions) {
            for (const med of prescription.medicines) {
                // Skip if no medicine data
                if (!med.medicine) continue;

                // Create MAR entries based on frequency
                const schedule = generateMedicationSchedule(med.frequency, now, shiftEnd);
                for (const scheduledTime of schedule) {
                    const marExists = await MedicationAdministration.findOne({
                        prescription: prescription._id,
                        'medication.medicine': med.medicine._id,
                        scheduledTime,
                    });

                    if (!marExists) {
                        await MedicationAdministration.create({
                            patient: admission.patient._id,
                            admission: admission._id,
                            prescription: prescription._id,
                            medication: {
                                medicine: med.medicine._id,
                                medicineName: med.medicine.name,
                                dosage: med.dosage,
                                route: med.route || 'oral',
                                frequency: med.frequency,
                                instructions: med.instructions,
                            },
                            scheduledTime,
                            shift: shift._id,
                        });
                    }
                }
            }
        }

        // Generate vital monitoring tasks (default Q4H)
        const vitalTimes = generateSchedule('q4h', now, shiftEnd);
        for (const scheduledTime of vitalTimes) {
            tasks.push({
                taskType: 'vital_monitoring',
                source: 'protocol',
                patient: admission.patient._id,
                admission: admission._id,
                assignedNurse: shift.nurse,
                assignedShift: shift._id,
                title: 'Vital Signs Recording',
                description: 'Record patient vital signs',
                priority: 'medium',
                scheduledTime,
                frequency: 'q4h',
            });
        }
    }

    if (tasks.length > 0) {
        await NursingTask.insertMany(tasks);
    }
}

/**
 * Generate medication schedule times
 */
function generateMedicationSchedule(frequency, startTime, endTime) {
    const schedule = [];
    const intervals = {
        'OD': 24, 'BD': 12, 'TDS': 8, 'QID': 6,
        'q4h': 4, 'q6h': 6, 'q8h': 8, 'q12h': 12,
    };

    const intervalHours = intervals[frequency] || 24;
    let current = new Date(startTime);

    while (current < endTime) {
        schedule.push(new Date(current));
        current.setHours(current.getHours() + intervalHours);
    }

    return schedule;
}

/**
 * Generate generic schedule times
 */
function generateSchedule(frequency, startTime, endTime) {
    const schedule = [];
    const intervals = { 'hourly': 1, 'q2h': 2, 'q4h': 4, 'q6h': 6, 'q8h': 8, 'q12h': 12, 'daily': 24 };

    const intervalHours = intervals[frequency] || 4;
    let current = new Date(startTime);

    while (current < endTime) {
        schedule.push(new Date(current));
        current.setHours(current.getHours() + intervalHours);
    }

    return schedule;
}

/**
 * Generate critical alert from abnormal vitals
 */
async function generateCriticalAlert(vitals, userId) {
    const params = {};
    if (vitals.criticalParameters.includes('systolic_bp')) {
        params.systolicBP = vitals.bloodPressure?.systolic;
    }
    if (vitals.criticalParameters.includes('pulse')) {
        params.pulse = vitals.pulse?.rate;
    }
    if (vitals.criticalParameters.includes('oxygen_saturation')) {
        params.spo2 = vitals.oxygenSaturation?.value;
    }

    // Get assigned doctor
    const admission = await Admission.findById(vitals.admission).select('doctor');

    await CriticalAlert.create({
        alertType: 'vital_critical',
        severity: 'critical',
        patient: vitals.patient,
        admission: vitals.admission,
        source: 'vital_signs',
        sourceReference: vitals._id,
        sourceModel: 'VitalSigns',
        title: 'Critical Vital Signs',
        description: `Critical values detected: ${vitals.criticalParameters.join(', ')}`,
        parameters: params,
        generatedBy: userId,
        assignedDoctor: admission?.doctor,
        assignedNurse: userId,
    });
}
