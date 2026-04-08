const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all staff
 * @route   GET /api/staff
 */
exports.getAllStaff = asyncHandler(async (req, res, next) => {
    const { department, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const staff = await Staff.find(query)
        .populate('user', 'email profile role')
        .populate('department', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ employeeId: 1 });

    const total = await Staff.countDocuments(query);

    res.status(200).json({
        success: true,
        count: staff.length,
        total,
        page: parseInt(page),
        data: staff,
    });
});

/**
 * @desc    Add staff
 * @route   POST /api/staff
 */
exports.addStaff = asyncHandler(async (req, res, next) => {
    const staff = await Staff.create(req.body);
    await staff.populate(['user', 'department']);

    res.status(201).json({
        success: true,
        data: staff,
    });
});

/**
 * @desc    Get staff by ID
 * @route   GET /api/staff/:id
 */
exports.getStaffById = asyncHandler(async (req, res, next) => {
    const staff = await Staff.findById(req.params.id)
        .populate('user')
        .populate('department')
        .populate('reportingTo');

    if (!staff) {
        return next(new ErrorResponse('Staff not found', 404));
    }

    res.status(200).json({
        success: true,
        data: staff,
    });
});

/**
 * @desc    Update staff
 * @route   PUT /api/staff/:id
 */
exports.updateStaff = asyncHandler(async (req, res, next) => {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!staff) {
        return next(new ErrorResponse('Staff not found', 404));
    }

    res.status(200).json({
        success: true,
        data: staff,
    });
});

/**
 * @desc    Delete staff
 * @route   DELETE /api/staff/:id
 */
exports.deleteStaff = asyncHandler(async (req, res, next) => {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
        return next(new ErrorResponse('Staff not found', 404));
    }

    staff.status = 'terminated';
    await staff.save();

    // Deactivate user account
    await User.findByIdAndUpdate(staff.user, { isActive: false });

    res.status(200).json({
        success: true,
        message: 'Staff terminated successfully',
    });
});

/**
 * @desc    Record attendance
 * @route   POST /api/staff/attendance
 */
exports.recordAttendance = asyncHandler(async (req, res, next) => {
    const attendance = await Attendance.create({
        ...req.body,
        markedBy: req.user.id,
    });

    res.status(201).json({
        success: true,
        data: attendance,
    });
});

/**
 * @desc    Get attendance records
 * @route   GET /api/staff/attendance
 */
exports.getAttendance = asyncHandler(async (req, res, next) => {
    const { staff, date, month, year, page = 1, limit = 50 } = req.query;

    const query = {};
    if (staff) query.staff = staff;
    if (date) query.date = new Date(date);
    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        query.date = { $gte: startDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
        .populate({
            path: 'staff',
            select: 'employeeId',
            populate: { path: 'user', select: 'profile.firstName profile.lastName' },
        })
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ date: -1 });

    res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
    });
});

/**
 * @desc    Apply for leave
 * @route   POST /api/staff/leaves
 */
exports.applyLeave = asyncHandler(async (req, res, next) => {
    // TODO: Implement leave management model and logic
    res.status(201).json({
        success: true,
        message: 'Leave application submitted',
    });
});

/**
 * @desc    Get leave records
 * @route   GET /api/staff/leaves
 */
exports.getLeaves = asyncHandler(async (req, res, next) => {
    // TODO: Implement leave management
    res.status(200).json({
        success: true,
        data: [],
    });
});

/**
 * @desc    Update leave status
 * @route   PUT /api/staff/leaves/:id
 */
exports.updateLeave = asyncHandler(async (req, res, next) => {
    // TODO: Implement leave approval
    res.status(200).json({
        success: true,
        message: 'Leave status updated',
    });
});
