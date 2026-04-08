const CarePlan = require('../models/CarePlan');
const Admission = require('../models/Admission');
const NursingTask = require('../models/NursingTask');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { createAuditLog } = require('../services/audit.service');

/**
 * Care Plan Controller - For Doctors
 * Doctors create and modify care plans, nurses execute them
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CARE PLAN CRUD (Doctor Functions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Create a new care plan
 * @route   POST /api/care-plans
 * @access  Doctor, Admin
 */
exports.createCarePlan = asyncHandler(async (req, res, next) => {
    const {
        patientId,
        admissionId,
        title,
        diagnosis,
        category,
        goals,
        interventions,
        startDate,
        endDate,
        assignedNurses // Optional - supervisor can also assign later
    } = req.body;

    // Validate admission
    const admission = await Admission.findById(admissionId);
    if (!admission || admission.status !== 'admitted') {
        return next(new ErrorResponse('Invalid or inactive admission', 400));
    }

    // Create care plan
    const carePlan = await CarePlan.create({
        patient: patientId,
        admission: admissionId,
        title,
        diagnosis,
        category,
        goals: goals.map(g => ({
            description: g.description,
            targetDate: g.targetDate,
            priority: g.priority || 'medium',
            status: 'active'
        })),
        interventions: interventions.map(i => ({
            description: i.description,
            frequency: i.frequency,
            instructions: i.instructions,
            startDate: i.startDate || startDate || new Date(),
            endDate: i.endDate || endDate,
            status: 'active'
        })),
        status: 'active',
        startDate: startDate || new Date(),
        endDate,
        assignedNurses: assignedNurses || [],
        createdBy: req.user._id
    });

    // Auto-generate nursing tasks for each intervention
    await generateInterventionTasks(carePlan);

    await createAuditLog({
        user: req.user._id,
        action: 'CARE_PLAN_CREATE',
        entity: 'CarePlan',
        entityId: carePlan._id,
        description: `Created care plan: ${title}`,
    });

    await carePlan.populate([
        { path: 'patient', select: 'patientId firstName lastName' },
        { path: 'createdBy', select: 'profile.firstName profile.lastName' },
        { path: 'assignedNurses', select: 'profile.firstName profile.lastName' }
    ]);

    res.status(201).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Get all care plans for a patient
 * @route   GET /api/care-plans/patient/:patientId
 * @access  Doctor, Nurse, Admin
 */
exports.getPatientCarePlans = asyncHandler(async (req, res, next) => {
    const { patientId } = req.params;
    const { status = 'active' } = req.query;

    const query = { patient: patientId };
    if (status !== 'all') {
        query.status = status;
    }

    const carePlans = await CarePlan.find(query)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'profile.firstName profile.lastName')
        .populate('assignedNurses', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: carePlans.length,
        data: carePlans,
    });
});

/**
 * @desc    Get care plan by ID
 * @route   GET /api/care-plans/:id
 * @access  Doctor, Nurse, Admin
 */
exports.getCarePlanById = asyncHandler(async (req, res, next) => {
    const carePlan = await CarePlan.findById(req.params.id)
        .populate('patient', 'patientId firstName lastName')
        .populate('admission', 'admissionNumber')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .populate('assignedNurses', 'profile.firstName profile.lastName')
        .populate('interventions.completions.completedBy', 'profile.firstName profile.lastName')
        .populate('evaluations.evaluatedBy', 'profile.firstName profile.lastName')
        .populate('flaggedIssues.flaggedBy', 'profile.firstName profile.lastName')
        .populate('flaggedIssues.resolvedBy', 'profile.firstName profile.lastName');

    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Update care plan (modify goals/interventions)
 * @route   PUT /api/care-plans/:id
 * @access  Doctor, Admin
 */
exports.updateCarePlan = asyncHandler(async (req, res, next) => {
    let carePlan = await CarePlan.findById(req.params.id);

    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    // Only creator or admin can modify
    if (carePlan.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to modify this care plan', 403));
    }

    const { goals, interventions, status, endDate, changeReason } = req.body;

    // Log modification
    carePlan.modifications.push({
        modifiedBy: req.user._id,
        changes: JSON.stringify(req.body),
        reason: changeReason
    });

    // Update fields
    if (goals) carePlan.goals = goals;
    if (interventions) {
        carePlan.interventions = interventions;
        // Regenerate tasks for new interventions
        await NursingTask.deleteMany({
            sourceReference: carePlan._id,
            source: 'care_plan',
            status: 'pending'
        });
        await generateInterventionTasks(carePlan);
    }
    if (status) carePlan.status = status;
    if (endDate) carePlan.endDate = endDate;

    await carePlan.save();

    await createAuditLog({
        user: req.user._id,
        action: 'CARE_PLAN_UPDATE',
        entity: 'CarePlan',
        entityId: carePlan._id,
        description: `Updated care plan: ${carePlan.title}`,
    });

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Add goal to care plan
 * @route   POST /api/care-plans/:id/goals
 * @access  Doctor, Admin
 */
exports.addGoal = asyncHandler(async (req, res, next) => {
    const carePlan = await CarePlan.findById(req.params.id);

    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    const { description, targetDate, priority } = req.body;

    carePlan.goals.push({
        description,
        targetDate,
        priority: priority || 'medium',
        status: 'active'
    });

    carePlan.modifications.push({
        modifiedBy: req.user._id,
        changes: `Added goal: ${description}`,
        reason: 'Goal addition'
    });

    await carePlan.save();

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Add intervention to care plan
 * @route   POST /api/care-plans/:id/interventions
 * @access  Doctor, Admin
 */
exports.addIntervention = asyncHandler(async (req, res, next) => {
    const carePlan = await CarePlan.findById(req.params.id);

    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    const { description, frequency, instructions, startDate, endDate } = req.body;

    const intervention = {
        description,
        frequency,
        instructions,
        startDate: startDate || new Date(),
        endDate: endDate || carePlan.endDate,
        status: 'active'
    };

    carePlan.interventions.push(intervention);

    carePlan.modifications.push({
        modifiedBy: req.user._id,
        changes: `Added intervention: ${description}`,
        reason: 'Intervention addition'
    });

    await carePlan.save();

    // Generate tasks for the new intervention
    await generateInterventionTasksForSingle(carePlan, carePlan.interventions.length - 1);

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Update goal status (mark as achieved/discontinued)
 * @route   PUT /api/care-plans/:id/goals/:goalIndex
 * @access  Doctor, Admin
 */
exports.updateGoalStatus = asyncHandler(async (req, res, next) => {
    const { id, goalIndex } = req.params;
    const { status, notes } = req.body;

    const carePlan = await CarePlan.findById(id);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    const goal = carePlan.goals[goalIndex];
    if (!goal) {
        return next(new ErrorResponse('Goal not found', 404));
    }

    goal.status = status;
    if (status === 'achieved') {
        goal.achievedAt = new Date();
        goal.achievedNotes = notes;
    }

    await carePlan.save();

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Resolve flagged issue
 * @route   POST /api/care-plans/:id/issues/:issueIndex/resolve
 * @access  Doctor, Admin
 */
exports.resolveIssue = asyncHandler(async (req, res, next) => {
    const { id, issueIndex } = req.params;
    const { resolution } = req.body;

    const carePlan = await CarePlan.findById(id);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    const issue = carePlan.flaggedIssues[issueIndex];
    if (!issue) {
        return next(new ErrorResponse('Issue not found', 404));
    }

    issue.status = 'resolved';
    issue.resolvedBy = req.user._id;
    issue.resolvedAt = new Date();
    issue.resolution = resolution;

    await carePlan.save();

    await createAuditLog({
        user: req.user._id,
        action: 'CARE_PLAN_ISSUE_RESOLVE',
        entity: 'CarePlan',
        entityId: carePlan._id,
        description: `Resolved issue in care plan`,
    });

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Discontinue care plan
 * @route   POST /api/care-plans/:id/discontinue
 * @access  Doctor, Admin
 */
exports.discontinueCarePlan = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    const carePlan = await CarePlan.findById(req.params.id);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    carePlan.status = 'discontinued';
    carePlan.endDate = new Date();
    carePlan.modifications.push({
        modifiedBy: req.user._id,
        changes: 'Discontinued care plan',
        reason
    });

    await carePlan.save();

    // Cancel pending tasks
    await NursingTask.updateMany(
        { sourceReference: carePlan._id, source: 'care_plan', status: 'pending' },
        { status: 'cancelled' }
    );

    await createAuditLog({
        user: req.user._id,
        action: 'CARE_PLAN_DISCONTINUE',
        entity: 'CarePlan',
        entityId: carePlan._id,
        description: `Discontinued care plan: ${carePlan.title}`,
    });

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

/**
 * @desc    Assign nurses to care plan
 * @route   POST /api/care-plans/:id/assign-nurses
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
exports.assignNurses = asyncHandler(async (req, res, next) => {
    const { nurseIds } = req.body;

    const carePlan = await CarePlan.findById(req.params.id);
    if (!carePlan) {
        return next(new ErrorResponse('Care plan not found', 404));
    }

    carePlan.assignedNurses = nurseIds;
    await carePlan.save();

    await carePlan.populate('assignedNurses', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        data: carePlan,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate nursing tasks for all interventions in a care plan
 */
async function generateInterventionTasks(carePlan) {
    const tasks = [];
    const now = new Date();

    for (let i = 0; i < carePlan.interventions.length; i++) {
        const intervention = carePlan.interventions[i];

        if (intervention.status !== 'active') continue;

        // Generate first day's tasks
        const schedules = generateScheduleFromFrequency(intervention.frequency, now);

        for (const scheduledTime of schedules) {
            tasks.push({
                taskType: 'care_plan_intervention',
                source: 'care_plan',
                sourceReference: carePlan._id,
                sourceModel: 'CarePlan',
                patient: carePlan.patient,
                admission: carePlan.admission,
                title: `Care Plan: ${intervention.description}`,
                description: intervention.instructions || intervention.description,
                priority: 'medium',
                scheduledTime,
                frequency: intervention.frequency,
                createdBy: carePlan.createdBy
            });
        }
    }

    if (tasks.length > 0) {
        // Use sequential loop to ensure unique taskNumber generation via pre-save hook
        for (const task of tasks) {
            await NursingTask.create(task);
        }
    }
}

/**
 * Generate tasks for a single intervention
 */
async function generateInterventionTasksForSingle(carePlan, interventionIndex) {
    const intervention = carePlan.interventions[interventionIndex];
    const now = new Date();
    const schedules = generateScheduleFromFrequency(intervention.frequency, now);

    const tasks = schedules.map(scheduledTime => ({
        taskType: 'care_plan_intervention',
        source: 'care_plan',
        sourceReference: carePlan._id,
        sourceModel: 'CarePlan',
        patient: carePlan.patient,
        admission: carePlan.admission,
        title: `Care Plan: ${intervention.description}`,
        description: intervention.instructions || intervention.description,
        priority: 'medium',
        scheduledTime,
        frequency: intervention.frequency,
        createdBy: carePlan.createdBy
    }));

    if (tasks.length > 0) {
        // Use sequential loop to ensure unique taskNumber generation via pre-save hook
        for (const task of tasks) {
            await NursingTask.create(task);
        }
    }
}

/**
 * Generate schedule times based on frequency
 */
function generateScheduleFromFrequency(frequency, startTime) {
    const schedule = [];
    const today = new Date(startTime);
    today.setHours(0, 0, 0, 0);

    const timeSlots = {
        'once': ['08:00'],
        'hourly': Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
        'q2h': ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        'q4h': ['06:00', '10:00', '14:00', '18:00', '22:00'],
        'q6h': ['06:00', '12:00', '18:00', '00:00'],
        'q8h': ['06:00', '14:00', '22:00'],
        'q12h': ['06:00', '18:00'],
        'daily': ['08:00'],
        'prn': ['08:00'], // As needed - create one reminder
        'as_needed': ['08:00']
    };

    const slots = timeSlots[frequency] || ['08:00'];

    for (const slot of slots) {
        const [hours, minutes] = slot.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Only add future times
        if (scheduledTime > startTime) {
            schedule.push(scheduledTime);
        }
    }

    return schedule;
}

module.exports = exports;
