const NursingShift = require('../models/NursingShift');
const User = require('../models/User');
const Ward = require('../models/Ward');
const Admission = require('../models/Admission');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { createAuditLog } = require('../services/audit.service');

/**
 * Nurse Assignment Controller
 * For Nurse Supervisors / Head Nurses to manage duty assignments
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DUTY ROSTER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all nurses
 * @route   GET /api/nurse-assignments/nurses
 * @access  Nurse Supervisor, Admin
 */
exports.getAllNurses = asyncHandler(async (req, res, next) => {
    const nurses = await User.find({ role: 'nurse', isActive: true })
        .select('username email profile department')
        .populate('department', 'name');

    res.status(200).json({
        success: true,
        count: nurses.length,
        data: nurses,
    });
});

/**
 * @desc    Create shift assignment (duty roster)
 * @route   POST /api/nurse-assignments/roster
 * @access  Nurse Supervisor, Admin
 */
exports.createShiftAssignment = asyncHandler(async (req, res, next) => {
    const { nurseId, shiftType, shiftDate, wardIds, nurseRole, supervisorId } = req.body;

    // Check if nurse already has a shift on this date/type
    const existingShift = await NursingShift.findOne({
        nurse: nurseId,
        shiftType,
        shiftDate: new Date(shiftDate),
        status: { $ne: 'cancelled' }
    });

    if (existingShift) {
        return next(new ErrorResponse('Nurse already has a shift scheduled for this date and time', 400));
    }

    // Get shift timings
    const { startTime, endTime } = NursingShift.getShiftTimings(shiftType, new Date(shiftDate));

    // Create shift assignment
    const shift = await NursingShift.create({
        nurse: nurseId,
        shiftType,
        shiftDate: new Date(shiftDate),
        startTime,
        endTime,
        assignedWards: wardIds,
        nurseRole: nurseRole || 'staff_nurse',
        supervisor: supervisorId || req.user._id,
        status: 'scheduled',
        createdBy: req.user._id
    });

    await createAuditLog({
        user: req.user._id,
        action: 'SHIFT_ASSIGN',
        entity: 'NursingShift',
        entityId: shift._id,
        description: `Assigned shift to nurse`,
    });

    await shift.populate([
        { path: 'nurse', select: 'profile.firstName profile.lastName' },
        { path: 'assignedWards', select: 'name wardNumber' }
    ]);

    res.status(201).json({
        success: true,
        data: shift,
    });
});

/**
 * @desc    Get duty roster for a date range
 * @route   GET /api/nurse-assignments/roster
 * @access  Nurse Supervisor, Admin
 */
exports.getDutyRoster = asyncHandler(async (req, res, next) => {
    const { startDate, endDate, wardId, nurseId } = req.query;

    const query = {
        status: { $ne: 'cancelled' }
    };

    if (startDate && endDate) {
        query.shiftDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (wardId) {
        query.assignedWards = wardId;
    }

    if (nurseId) {
        query.nurse = nurseId;
    }

    const roster = await NursingShift.find(query)
        .sort({ shiftDate: 1, shiftType: 1 })
        .populate('nurse', 'profile.firstName profile.lastName')
        .populate('assignedWards', 'name wardNumber')
        .populate('supervisor', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        count: roster.length,
        data: roster,
    });
});

/**
 * @desc    Update shift assignment
 * @route   PUT /api/nurse-assignments/roster/:shiftId
 * @access  Nurse Supervisor, Admin
 */
exports.updateShiftAssignment = asyncHandler(async (req, res, next) => {
    const { shiftId } = req.params;
    const { wardIds, nurseRole, notes } = req.body;

    const shift = await NursingShift.findById(shiftId);
    if (!shift) {
        return next(new ErrorResponse('Shift not found', 404));
    }

    if (shift.status !== 'scheduled') {
        return next(new ErrorResponse('Cannot modify an active or completed shift', 400));
    }

    if (wardIds) shift.assignedWards = wardIds;
    if (nurseRole) shift.nurseRole = nurseRole;
    if (notes) shift.notes = notes;

    await shift.save();

    res.status(200).json({
        success: true,
        data: shift,
    });
});

/**
 * @desc    Cancel shift assignment
 * @route   DELETE /api/nurse-assignments/roster/:shiftId
 * @access  Nurse Supervisor, Admin
 */
exports.cancelShiftAssignment = asyncHandler(async (req, res, next) => {
    const { shiftId } = req.params;

    const shift = await NursingShift.findById(shiftId);
    if (!shift) {
        return next(new ErrorResponse('Shift not found', 404));
    }

    if (shift.status !== 'scheduled') {
        return next(new ErrorResponse('Cannot cancel an active or completed shift', 400));
    }

    shift.status = 'cancelled';
    await shift.save();

    await createAuditLog({
        user: req.user._id,
        action: 'SHIFT_CANCEL',
        entity: 'NursingShift',
        entityId: shift._id,
        description: 'Cancelled shift assignment',
    });

    res.status(200).json({
        success: true,
        message: 'Shift cancelled successfully',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT ASSIGNMENT WITHIN SHIFT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Assign specific patients to nurse within their shift
 * @route   POST /api/nurse-assignments/patients
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
exports.assignPatientsToNurse = asyncHandler(async (req, res, next) => {
    const { shiftId, patientAssignments } = req.body;
    // patientAssignments: [{ patientId, admissionId, bedId }]

    const shift = await NursingShift.findById(shiftId);
    if (!shift) {
        return next(new ErrorResponse('Shift not found', 404));
    }

    shift.assignedPatients = patientAssignments.map(pa => ({
        patient: pa.patientId,
        admission: pa.admissionId,
        bed: pa.bedId,
        assignedAt: new Date()
    }));

    await shift.save();

    await shift.populate([
        { path: 'assignedPatients.patient', select: 'patientId firstName lastName' },
        { path: 'assignedPatients.bed', select: 'bedNumber' }
    ]);

    res.status(200).json({
        success: true,
        data: shift,
    });
});

/**
 * @desc    Get patients in a ward eligible for assignment
 * @route   GET /api/nurse-assignments/ward/:wardId/patients
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
exports.getWardPatients = asyncHandler(async (req, res, next) => {
    const { wardId } = req.params;

    const admissions = await Admission.find({
        ward: wardId,
        status: 'admitted'
    })
        .populate('patient', 'patientId firstName lastName gender dateOfBirth')
        .populate('bed', 'bedNumber')
        .select('admissionNumber diagnosis admittedAt');

    res.status(200).json({
        success: true,
        count: admissions.length,
        data: admissions,
    });
});

/**
 * @desc    Get current assignments for a ward shift
 * @route   GET /api/nurse-assignments/ward/:wardId/shift
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
exports.getCurrentWardAssignments = asyncHandler(async (req, res, next) => {
    const { wardId } = req.params;
    const { shiftType } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
        assignedWards: wardId,
        shiftDate: today,
        status: { $in: ['scheduled', 'active'] }
    };

    if (shiftType) {
        query.shiftType = shiftType;
    }

    const shifts = await NursingShift.find(query)
        .populate('nurse', 'profile.firstName profile.lastName')
        .populate('assignedPatients.patient', 'patientId firstName lastName')
        .populate('assignedPatients.bed', 'bedNumber');

    res.status(200).json({
        success: true,
        count: shifts.length,
        data: shifts,
    });
});

/**
 * @desc    Swap patients between nurses
 * @route   POST /api/nurse-assignments/swap
 * @access  Nurse Supervisor, Head Nurse, Admin
 */
exports.swapPatientAssignment = asyncHandler(async (req, res, next) => {
    const { fromShiftId, toShiftId, patientId, admissionId } = req.body;

    const fromShift = await NursingShift.findById(fromShiftId);
    const toShift = await NursingShift.findById(toShiftId);

    if (!fromShift || !toShift) {
        return next(new ErrorResponse('Shift not found', 404));
    }

    // Remove from source
    fromShift.assignedPatients = fromShift.assignedPatients.filter(
        p => p.patient.toString() !== patientId
    );

    // Add to destination
    const admission = await Admission.findById(admissionId).populate('bed');
    toShift.assignedPatients.push({
        patient: patientId,
        admission: admissionId,
        bed: admission?.bed?._id,
        assignedAt: new Date()
    });

    await Promise.all([fromShift.save(), toShift.save()]);

    await createAuditLog({
        user: req.user._id,
        action: 'PATIENT_SWAP',
        entity: 'NursingShift',
        entityId: toShift._id,
        description: `Swapped patient assignment between nurses`,
    });

    res.status(200).json({
        success: true,
        message: 'Patient assignment swapped successfully',
    });
});

module.exports = exports;
