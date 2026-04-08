/**
 * Audit Middleware
 * Logs user actions for compliance and auditing
 */

const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Log action to audit trail
 */
exports.auditLog = (action, resourceType) => {
    return asyncHandler(async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send to capture response
        res.send = function (body) {
            res.body = body;
            return originalSend.call(this, body);
        };

        // Continue with request
        next();

        // After response is sent, log the action
        res.on('finish', async () => {
            try {
                // Only log if user is authenticated
                if (req.user) {
                    const logData = {
                        user: req.user._id,
                        action: action,
                        resourceType: resourceType,
                        resourceId: req.params.id || null,
                        details: {
                            method: req.method,
                            path: req.originalUrl,
                            statusCode: res.statusCode,
                            ip: req.ip || req.connection.remoteAddress,
                            userAgent: req.get('User-Agent'),
                        },
                    };

                    // Don't log request body for sensitive routes
                    const sensitiveRoutes = ['/auth/login', '/auth/change-password'];
                    if (!sensitiveRoutes.some((route) => req.originalUrl.includes(route))) {
                        logData.details.requestBody = req.body;
                    }

                    await AuditLog.create(logData);
                }
            } catch (error) {
                // Don't fail the request if audit logging fails
                console.error('Audit log error:', error.message);
            }
        });
    });
};

/**
 * Simple audit logger for critical actions
 */
exports.logCriticalAction = async (userId, action, resourceType, resourceId, details = {}) => {
    try {
        await AuditLog.create({
            user: userId,
            action,
            resourceType,
            resourceId,
            details,
        });
    } catch (error) {
        console.error('Failed to log critical action:', error.message);
    }
};

/**
 * Audit action types
 */
exports.AUDIT_ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    EXPORT: 'export',
    PRINT: 'print',
    APPROVE: 'approve',
    REJECT: 'reject',
    DISPENSE: 'dispense',
    BILL: 'bill',
    PAYMENT: 'payment',
};

/**
 * Resource types for auditing
 */
exports.RESOURCE_TYPES = {
    PATIENT: 'patient',
    USER: 'user',
    APPOINTMENT: 'appointment',
    ADMISSION: 'admission',
    EMR: 'emr',
    PRESCRIPTION: 'prescription',
    LAB_TEST: 'lab_test',
    RADIOLOGY: 'radiology',
    BILLING: 'billing',
    PAYMENT: 'payment',
    INSURANCE: 'insurance',
    INVENTORY: 'inventory',
    MEDICINE: 'medicine',
    CLINICAL_CODING: 'clinical_coding',
    PROCEDURE_CODE: 'procedure_code',
};
