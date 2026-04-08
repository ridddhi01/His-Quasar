/**
 * Break-Glass Middleware
 * Checks and logs emergency access during break-glass sessions
 * 
 * Use this middleware on routes that need to be accessible via break-glass
 */

const BreakGlassLog = require('../models/BreakGlassLog');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Check if user has break-glass access
 * Use on routes that should be accessible via break-glass
 * 
 * @param {String} action - 'view', 'update', 'create', 'critical_action'
 */
exports.checkBreakGlass = (action = 'view') => {
    return async (req, res, next) => {
        // Check if user has break-glass permissions enabled
        if (!req.user.breakGlassPermissions?.enabled) {
            return next();  // Continue with normal authorization
        }

        // Check if break-glass is not expired
        if (req.user.breakGlassPermissions.expiresAt < new Date()) {
            req.user.breakGlassPermissions.enabled = false;
            await req.user.save();
            return next();  // Continue with normal authorization
        }

        // Get active break-glass log
        const activeLog = await BreakGlassLog.findOne({
            requestedBy: req.user._id,
            status: 'active',
            expiresAt: { $gt: new Date() },
        });

        if (!activeLog) {
            return next();  // No active log, continue normally
        }

        // Check access level
        const accessLevel = activeLog.accessLevel;
        const allowedActions = {
            view_only: ['view'],
            full_clinical: ['view', 'update', 'create'],
            emergency: ['view', 'update', 'create', 'critical_action'],
        };

        if (!allowedActions[accessLevel]?.includes(action)) {
            return next(new ErrorResponse(
                `Break-glass access level '${accessLevel}' does not allow '${action}' action`,
                403
            ));
        }

        // Mark that this request is under break-glass
        req.isBreakGlass = true;
        req.breakGlassLog = activeLog;

        next();
    };
};

/**
 * Log patient record access during break-glass
 * Use after authorization passes and before controller
 */
exports.logBreakGlassAccess = (entity, action = 'view') => {
    return async (req, res, next) => {
        // Only log if under break-glass
        if (!req.isBreakGlass || !req.breakGlassLog) {
            return next();
        }

        const log = req.breakGlassLog;

        // Extract patient info from request
        const patientId = req.params.patientId || req.body.patient || req.query.patientId;
        const entityId = req.params.id || req.params.entityId;

        // Add to accessed records
        log.accessedRecords.push({
            patient: patientId,
            entity,
            entityId,
            action,
            ipAddress: req.ip,
            details: `${req.method} ${req.originalUrl}`,
            timestamp: new Date(),
        });

        await log.save();

        // Add header to response indicating break-glass access
        res.set('X-Break-Glass-Access', 'true');
        res.set('X-Break-Glass-Level', log.accessLevel);

        next();
    };
};

/**
 * Require break-glass for sensitive operations
 * Use on routes that should ONLY be accessible via break-glass (not normal access)
 */
exports.requireBreakGlass = () => {
    return async (req, res, next) => {
        if (!req.user.breakGlassPermissions?.enabled) {
            return next(new ErrorResponse(
                'This action requires break-glass access',
                403
            ));
        }

        if (req.user.breakGlassPermissions.expiresAt < new Date()) {
            return next(new ErrorResponse(
                'Break-glass access has expired',
                403
            ));
        }

        const activeLog = await BreakGlassLog.findOne({
            requestedBy: req.user._id,
            status: 'active',
            expiresAt: { $gt: new Date() },
        });

        if (!activeLog) {
            return next(new ErrorResponse(
                'No active break-glass session found',
                403
            ));
        }

        req.isBreakGlass = true;
        req.breakGlassLog = activeLog;

        next();
    };
};

/**
 * Deny break-glass access for critical operations
 * Use on routes that should NEVER be accessible via break-glass
 */
exports.denyBreakGlass = () => {
    return (req, res, next) => {
        if (req.isBreakGlass || req.user.breakGlassPermissions?.enabled) {
            return next(new ErrorResponse(
                'This action is not permitted under break-glass access',
                403
            ));
        }
        next();
    };
};

module.exports = exports;
