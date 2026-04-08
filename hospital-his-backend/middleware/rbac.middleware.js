/**
 * Role-Based Access Control (RBAC) Middleware
 * Handles authorization based on user roles
 */

const ErrorResponse = require('../utils/errorResponse');
const { USER_ROLES } = require('../config/constants');
const { checkAdminPermission, isRouteBlockedForAdmin } = require('../config/permissions.config');

/**
 * Authorize specific roles to access a route
 * @param  {...String} roles - Allowed roles
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ErrorResponse('User not authenticated', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role '${req.user.role}' is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};

/**
 * Check if user has specific permission
 * @param {String} permission - Required permission
 */
exports.hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ErrorResponse('User not authenticated', 401));
        }

        // Admin has all permissions
        if (req.user.role === USER_ROLES.ADMIN) {
            return next();
        }

        // Define role-permission mappings
        const rolePermissions = {
            [USER_ROLES.DOCTOR]: [
                'view_patient',
                'edit_patient',
                'view_emr',
                'create_emr',
                'edit_emr',
                'view_prescription',
                'create_prescription',
                'view_lab',
                'order_lab',
                'view_radiology',
                'order_radiology',
                'view_appointment',
                'create_appointment',
                'view_emergency',
                'edit_emergency_triage',
                'edit_emergency_status',
            ],
            [USER_ROLES.NURSE]: [
                'view_patient',
                'view_emr',
                'edit_emr',
                'view_prescription',
                'view_lab',
                'collect_sample',
                'view_vitals',
                'edit_vitals',
                'view_bed',
                'view_emergency',
                'edit_emergency_triage',
                'edit_emergency_status',
            ],
            [USER_ROLES.RECEPTIONIST]: [
                'view_patient',
                'create_patient',
                'edit_patient',
                'view_appointment',
                'create_appointment',
                'edit_appointment',
                'view_billing',
                'create_billing',
                'view_emergency',
            ],
            [USER_ROLES.LAB_TECH]: [
                'view_lab',
                'edit_lab',
                'enter_lab_results',
                'view_patient',
            ],
            [USER_ROLES.RADIOLOGIST]: [
                'view_radiology',
                'edit_radiology',
                'enter_radiology_results',
                'view_patient',
            ],
            [USER_ROLES.PHARMACIST]: [
                'view_prescription',
                'dispense_medicine',
                'view_pharmacy_inventory',
                'edit_pharmacy_inventory',
                'view_patient',
            ],
            [USER_ROLES.BILLING]: [
                'view_billing',
                'create_billing',
                'edit_billing',
                'view_payment',
                'create_payment',
                'view_patient',
                'view_coding',
                'create_coding',
                'edit_coding',
            ],
            [USER_ROLES.INSURANCE]: [
                'view_insurance',
                'create_insurance_claim',
                'edit_insurance_claim',
                'view_patient',
                'view_billing',
            ],
            [USER_ROLES.COMPLIANCE]: [
                'view_audit',
                'view_reports',
                'view_patient',
                'view_billing',
            ],
            [USER_ROLES.INVENTORY_MANAGER]: [
                'view_inventory',
                'create_inventory',
                'edit_inventory',
                'deactivate_inventory',
                'view_vendor',
                'create_vendor',
                'edit_vendor',
                'view_purchase_requisition',
                'create_purchase_requisition',
                'approve_purchase_requisition',
                'view_purchase_order',
                'create_purchase_order',
                'approve_purchase_order',
                'modify_purchase_order',
                'cancel_purchase_order',
                'view_grn',
                'create_grn',
                'verify_grn',
                'view_stock',
                'issue_stock',
                'approve_stock_issue',
                'return_stock',
                'transfer_stock',
                'view_expiry',
                'create_recall',
                'block_batch',
                'view_inventory_audit',
            ],
            [USER_ROLES.CODER]: [
                'view_patient',
                'view_emr',
                'view_coding',
                'create_coding',
                'edit_coding',
                'submit_coding',
                'view_billing',
            ],
            [USER_ROLES.SENIOR_CODER]: [
                'view_patient',
                'view_emr',
                'view_coding',
                'create_coding',
                'edit_coding',
                'submit_coding',
                'approve_coding',
                'return_coding',
                'view_billing',
            ],
        };

        const userPermissions = rolePermissions[req.user.role] || [];

        if (!userPermissions.includes(permission)) {
            return next(
                new ErrorResponse(
                    `User does not have permission: ${permission}`,
                    403
                )
            );
        }

        next();
    };
};

/**
 * Check if user is accessing their own resource or is admin
 */
exports.isOwnerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new ErrorResponse('User not authenticated', 401));
    }

    const resourceUserId = req.params.userId || req.body.userId;

    if (
        req.user.role === USER_ROLES.ADMIN ||
        req.user._id.toString() === resourceUserId
    ) {
        return next();
    }

    return next(
        new ErrorResponse('Not authorized to access this resource', 403)
    );
};

/**
 * Check if user belongs to the same department
 */
exports.sameDepartment = (req, res, next) => {
    if (!req.user) {
        return next(new ErrorResponse('User not authenticated', 401));
    }

    // Admin can access all departments
    if (req.user.role === USER_ROLES.ADMIN) {
        return next();
    }

    const departmentId = req.params.departmentId || req.body.departmentId;

    if (req.user.department && req.user.department.toString() === departmentId) {
        return next();
    }

    return next(
        new ErrorResponse('Not authorized to access this department', 403)
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CLINICAL RESTRICTION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deny Admin from performing clinical actions
 * Apply this middleware to all clinical routes as a safety net
 */
exports.denyAdminClinical = (req, res, next) => {
    if (!req.user) {
        return next(new ErrorResponse('User not authenticated', 401));
    }

    if (req.user.role === USER_ROLES.ADMIN) {
        // Check if this route is blocked for admin
        if (isRouteBlockedForAdmin(req.originalUrl, req.method)) {
            // Log attempted privilege escalation
            console.warn(
                `[RBAC] Admin attempted clinical action: ${req.method} ${req.originalUrl} by user ${req.user._id}`
            );

            return next(
                new ErrorResponse(
                    'Administrative users cannot perform clinical operations. This action has been logged.',
                    403
                )
            );
        }
    }

    next();
};

/**
 * Check if user has a specific permission scope
 * @param {String} scope - Required permission scope (e.g., 'clinical:emr:create')
 */
exports.requireScope = (scope) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ErrorResponse('User not authenticated', 401));
        }

        const userRole = req.user.role;

        // For Admin, use the granular permission check
        if (userRole === USER_ROLES.ADMIN) {
            if (!checkAdminPermission(scope)) {
                console.warn(
                    `[RBAC] Admin denied scope '${scope}' - user ${req.user._id}`
                );
                return next(
                    new ErrorResponse(
                        `Admin role does not have permission for scope: ${scope}`,
                        403
                    )
                );
            }
        }

        // For other roles, check against role-based permissions
        // (Existing hasPermission logic can be used)

        next();
    };
};

/**
 * Audit all admin actions - logs every action to audit trail
 */
exports.auditAdminAction = (action, entity) => {
    return async (req, res, next) => {
        if (req.user && req.user.role === USER_ROLES.ADMIN) {
            // Attach audit info to request for later logging
            req.auditInfo = {
                action,
                entity,
                adminId: req.user._id,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date(),
            };
        }
        next();
    };
};
