/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/config');

/**
 * Protect routes - Verify JWT token
 */
exports.authenticate = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Get user from token
        req.user = await User.findById(decoded.id).populate('department');

        if (!req.user) {
            return next(new ErrorResponse('User not found', 404));
        }

        if (!req.user.isActive) {
            return next(new ErrorResponse('User account is deactivated', 401));
        }

        next();
    } catch (err) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

/**
 * Grant access to specific roles
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
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
 * Optional authentication - doesn't fail if no token
 */
exports.optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = await User.findById(decoded.id);
        } catch (err) {
            // Token invalid, but continue without user
        }
    }

    next();
});
