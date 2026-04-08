const Department = require('../models/Department');
const User = require('../models/User');
const { USER_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 */
exports.getAllDepartments = asyncHandler(async (req, res, next) => {
    const { type, isActive } = req.query;

    const query = {};
    if (type) query.type = type;

    // Default to active departments if not specified
    if (isActive === undefined) {
        query.isActive = true;
    } else {
        query.isActive = isActive === 'true';
    }

    const departments = await Department.find(query)
        .populate('head', 'profile.firstName profile.lastName')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: departments.length,
        data: departments,
    });
});

/**
 * @desc    Create department
 * @route   POST /api/departments
 */
exports.createDepartment = asyncHandler(async (req, res, next) => {
    const department = await Department.create(req.body);

    res.status(201).json({
        success: true,
        data: department,
    });
});

/**
 * @desc    Get department by ID
 * @route   GET /api/departments/:id
 */
exports.getDepartmentById = asyncHandler(async (req, res, next) => {
    const department = await Department.findById(req.params.id).populate('head', 'profile');

    if (!department) {
        return next(new ErrorResponse('Department not found', 404));
    }

    res.status(200).json({
        success: true,
        data: department,
    });
});

/**
 * @desc    Update department
 * @route   PUT /api/departments/:id
 */
exports.updateDepartment = asyncHandler(async (req, res, next) => {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!department) {
        return next(new ErrorResponse('Department not found', 404));
    }

    res.status(200).json({
        success: true,
        data: department,
    });
});

/**
 * @desc    Delete department
 * @route   DELETE /api/departments/:id
 */
exports.deleteDepartment = asyncHandler(async (req, res, next) => {
    const department = await Department.findById(req.params.id);

    if (!department) {
        return next(new ErrorResponse('Department not found', 404));
    }

    department.isActive = false;
    await department.save();

    res.status(200).json({
        success: true,
        message: 'Department deactivated successfully',
    });
});

/**
 * @desc    Get doctors in department
 * @route   GET /api/departments/:id/doctors
 */
exports.getDepartmentDoctors = asyncHandler(async (req, res, next) => {
    const doctors = await User.find({
        department: req.params.id,
        role: USER_ROLES.DOCTOR,
        isActive: true,
    }).select('profile');

    res.status(200).json({
        success: true,
        count: doctors.length,
        data: doctors,
    });
});
