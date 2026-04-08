const IncidentReport = require('../models/IncidentReport');
const Department = require('../models/Department');
const User = require('../models/User');
const { INCIDENT_REPORT_STATUS, USER_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper: Check if user is department head for a given department
const isDepartmentHead = async (userId, departmentId) => {
    const dept = await Department.findById(departmentId);
    return dept && dept.head && dept.head.toString() === userId.toString();
};

// Helper: Check if user is admin or compliance officer
const isAdminOrCompliance = (user) => {
    return [USER_ROLES.ADMIN, USER_ROLES.COMPLIANCE].includes(user.role);
};

/**
 * @desc    Create incident report
 * @route   POST /api/incidents
 * @access  All authenticated staff
 */
exports.createIncident = asyncHandler(async (req, res, next) => {
    // Always use department from logged-in user
    const userDepartment = req.user.department;
    if (!userDepartment) {
        return next(new ErrorResponse('User is not assigned to any department', 400));
    }

    // Find department head for auto-assignment
    let assignedTo = null;
    const dept = await Department.findById(userDepartment).populate('head');
    if (dept && dept.head) {
        assignedTo = dept.head._id;
    }

    // Build incident data
    const incidentData = {
        ...req.body,
        department: userDepartment, // enforce department from user
        reporterId: req.user._id,
        status: INCIDENT_REPORT_STATUS.SUBMITTED,
        assignedTo,
        activityLog: [{
            actorId: req.user._id,
            action: 'created',
            details: { assignedTo: assignedTo ? assignedTo.toString() : null },
            timestamp: new Date(),
        }],
    };

    const incident = await IncidentReport.create(incidentData);

    // Populate for response
    const populatedIncident = await IncidentReport.findById(incident._id)
        .populate('reporterId', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .populate('assignedTo', 'profile.firstName profile.lastName');

    res.status(201).json({
        success: true,
        data: populatedIncident,
    });
});

/**
 * @desc    Get all incident reports (RBAC-aware)
 * @route   GET /api/incidents
 * @access  Staff: own reports only | Dept Head/Head Nurse: department reports | Compliance: all harm incidents | Admin: all
 */
exports.getAllIncidents = asyncHandler(async (req, res, next) => {
    const { status, department, myReports, departmentReports, harmOnly } = req.query;
    const user = req.user;

    let query = {};

    // Admin can see all
    if (user.role === USER_ROLES.ADMIN) {
        if (status) query.status = status;
        if (department) query.department = department;
    }
    // Compliance can see all, but primarily focuses on harm incidents
    else if (user.role === USER_ROLES.COMPLIANCE) {
        // If harmOnly flag is set, filter to harm incidents only
        if (harmOnly === 'true') {
            query.wasHarm = true;
        }
        if (status) query.status = status;
        if (department) query.department = department;
    }
    // myReports=true: current user's own reports
    else if (myReports === 'true') {
        query.reporterId = user._id;
        if (status) query.status = status;
    }
    // departmentReports=true: for department heads OR head_nurse
    else if (departmentReports === 'true' && user.department) {
        const userDeptId = user.department._id || user.department;
        const isHead = await isDepartmentHead(user._id, userDeptId);
        const isHeadNurse = user.role === USER_ROLES.HEAD_NURSE;

        if (isHead || isHeadNurse) {
            // Department heads and head nurses can see all incidents in their department
            query.$or = [
                { department: userDeptId },
                { assignedTo: user._id }
            ];
        } else {
            // Non-head staff trying to access dept reports - only show own
            query.reporterId = user._id;
        }
        if (status) query.status = status;
    }
    // Default: staff can only see their own reports
    else {
        query.reporterId = user._id;
        if (status) query.status = status;
    }

    const incidents = await IncidentReport.find(query)
        .populate('reporterId', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .populate('assignedTo', 'profile.firstName profile.lastName')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: incidents.length,
        data: incidents,
    });
});

/**
 * @desc    Get incident report by ID (RBAC-aware)
 * @route   GET /api/incidents/:id
 * @access  Reporter, Assigned Dept Head, Head Nurse, or Admin/Compliance
 */
exports.getIncidentById = asyncHandler(async (req, res, next) => {
    const incident = await IncidentReport.findById(req.params.id)
        .populate('reporterId', 'profile.firstName profile.lastName email')
        .populate('department', 'name departmentCode head')
        .populate('assignedTo', 'profile.firstName profile.lastName email')
        .populate('activityLog.actorId', 'profile.firstName profile.lastName');

    if (!incident) {
        return next(new ErrorResponse('Incident report not found', 404));
    }

    const user = req.user;
    const userDeptId = user.department?._id?.toString() || user.department?.toString();
    const incidentDeptId = incident.department?._id?.toString();

    const isReporter = incident.reporterId._id.toString() === user._id.toString();
    const isAssignee = incident.assignedTo && incident.assignedTo._id.toString() === user._id.toString();
    const isDeptHead = incident.department?.head?.toString() === user._id.toString();
    const isHeadNurse = user.role === USER_ROLES.HEAD_NURSE && userDeptId === incidentDeptId;
    const isAdminUser = isAdminOrCompliance(user);

    // RBAC: only reporter, assignee, dept head, head nurse (same dept), or admin/compliance can view
    if (!isReporter && !isAssignee && !isDeptHead && !isHeadNurse && !isAdminUser) {
        return next(new ErrorResponse('Not authorized to view this incident', 403));
    }

    // Determine management permissions
    const canManage = isAssignee || isDeptHead || isHeadNurse || isAdminUser;

    res.status(200).json({
        success: true,
        data: incident,
        permissions: {
            canChangeStatus: canManage,
            canReassign: isAdminUser,
            canAddNotes: canManage,
        },
    });
});

/**
 * @desc    Update incident status
 * @route   PUT /api/incidents/:id/status
 * @access  Assigned Dept Head, Head Nurse, or Admin only
 */
exports.updateIncidentStatus = asyncHandler(async (req, res, next) => {
    const { status, reviewNotes } = req.body;
    const incident = await IncidentReport.findById(req.params.id)
        .populate('department', 'head');

    if (!incident) {
        return next(new ErrorResponse('Incident report not found', 404));
    }

    const user = req.user;
    const userDeptId = user.department?._id?.toString() || user.department?.toString();
    const incidentDeptId = incident.department?._id?.toString();

    const isAssignee = incident.assignedTo && incident.assignedTo.toString() === user._id.toString();
    const isDeptHead = incident.department?.head?.toString() === user._id.toString();
    const isHeadNurse = user.role === USER_ROLES.HEAD_NURSE && userDeptId === incidentDeptId;
    const isAdminUser = isAdminOrCompliance(user);

    if (!isAssignee && !isDeptHead && !isHeadNurse && !isAdminUser) {
        return next(new ErrorResponse('Not authorized to change status', 403));
    }

    // Validate status transition
    const validTransitions = {
        [INCIDENT_REPORT_STATUS.SUBMITTED]: [INCIDENT_REPORT_STATUS.IN_REVIEW],
        [INCIDENT_REPORT_STATUS.IN_REVIEW]: [INCIDENT_REPORT_STATUS.CLOSED, INCIDENT_REPORT_STATUS.SUBMITTED],
        [INCIDENT_REPORT_STATUS.CLOSED]: [], // Cannot transition from closed
    };

    if (!validTransitions[incident.status]?.includes(status)) {
        return next(new ErrorResponse(`Invalid status transition from ${incident.status} to ${status}`, 400));
    }

    const oldStatus = incident.status;
    incident.status = status;

    // Add review notes if provided
    if (reviewNotes) {
        incident.reviewNotes = reviewNotes;
    }

    // Add to activity log
    incident.activityLog.push({
        actorId: user._id,
        action: 'status_changed',
        details: { fromStatus: oldStatus, toStatus: status, reviewNotes: reviewNotes || null },
        timestamp: new Date(),
    });

    await incident.save();

    const updatedIncident = await IncidentReport.findById(incident._id)
        .populate('reporterId', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .populate('assignedTo', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        data: updatedIncident,
    });
});

/**
 * @desc    Reassign incident to another user
 * @route   PUT /api/incidents/:id/assign
 * @access  Admin/Compliance only
 */
exports.reassignIncident = asyncHandler(async (req, res, next) => {
    const { assignedTo } = req.body;
    const user = req.user;

    if (!isAdminOrCompliance(user)) {
        return next(new ErrorResponse('Only admin or compliance can reassign incidents', 403));
    }

    const incident = await IncidentReport.findById(req.params.id);
    if (!incident) {
        return next(new ErrorResponse('Incident report not found', 404));
    }

    // Verify target user exists
    const targetUser = await User.findById(assignedTo);
    if (!targetUser) {
        return next(new ErrorResponse('Target user not found', 404));
    }

    const oldAssignee = incident.assignedTo;
    incident.assignedTo = assignedTo;

    // Add to activity log
    incident.activityLog.push({
        actorId: user._id,
        action: 'reassigned',
        details: { fromUserId: oldAssignee ? oldAssignee.toString() : null, toUserId: assignedTo },
        timestamp: new Date(),
    });

    await incident.save();

    const updatedIncident = await IncidentReport.findById(incident._id)
        .populate('reporterId', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .populate('assignedTo', 'profile.firstName profile.lastName');

    res.status(200).json({
        success: true,
        data: updatedIncident,
    });
});

/**
 * @desc    Add review notes to incident
 * @route   PUT /api/incidents/:id/notes
 * @access  Assigned Dept Head or Admin
 */
exports.addReviewNotes = asyncHandler(async (req, res, next) => {
    const { reviewNotes } = req.body;
    const incident = await IncidentReport.findById(req.params.id)
        .populate('department', 'head');

    if (!incident) {
        return next(new ErrorResponse('Incident report not found', 404));
    }

    const user = req.user;
    const isAssignee = incident.assignedTo && incident.assignedTo.toString() === user._id.toString();
    const isDeptHead = incident.department?.head?.toString() === user._id.toString();
    const isAdminUser = isAdminOrCompliance(user);

    if (!isAssignee && !isDeptHead && !isAdminUser) {
        return next(new ErrorResponse('Not authorized to add notes', 403));
    }

    incident.reviewNotes = reviewNotes;

    incident.activityLog.push({
        actorId: user._id,
        action: 'notes_updated',
        details: { notes: reviewNotes },
        timestamp: new Date(),
    });

    await incident.save();

    res.status(200).json({
        success: true,
        data: incident,
    });
});
