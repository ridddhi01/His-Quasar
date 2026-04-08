/**
 * Validation Middleware
 * Uses Joi for request validation
 */

const Joi = require('joi');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Validate request body, query, or params
 * @param {Object} schema - Joi validation schema object with body, query, params keys
 */
exports.validate = (schema) => {
    return (req, res, next) => {
        const validationOptions = {
            abortEarly: false, // Include all errors
            allowUnknown: true, // Ignore unknown props
            stripUnknown: true, // Remove unknown props
        };

        const errors = [];

        // Validate body
        if (schema.body) {
            const { error, value } = schema.body.validate(req.body, validationOptions);
            if (error) {
                errors.push(...error.details.map((d) => d.message));
            } else {
                req.body = value;
            }
        }

        // Validate query
        if (schema.query) {
            const { error, value } = schema.query.validate(req.query, validationOptions);
            if (error) {
                errors.push(...error.details.map((d) => d.message));
            } else {
                req.query = value;
            }
        }

        // Validate params
        if (schema.params) {
            const { error, value } = schema.params.validate(req.params, validationOptions);
            if (error) {
                errors.push(...error.details.map((d) => d.message));
            } else {
                req.params = value;
            }
        }

        if (errors.length > 0) {
            return next(new ErrorResponse(errors.join(', '), 400));
        }

        next();
    };
};

// Common validation schemas
exports.schemas = {
    // MongoDB ObjectId
    objectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),

    // Pagination
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string(),
        order: Joi.string().valid('asc', 'desc').default('desc'),
    }),

    // Date range
    dateRange: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    }),

    // Patient creation
    createPatient: Joi.object({
        firstName: Joi.string().required().min(2).max(50),
        lastName: Joi.string().required().min(2).max(50),
        dateOfBirth: Joi.date().required().max('now'),
        gender: Joi.string().required().valid('Male', 'Female', 'Other'),
        phone: Joi.string().required().pattern(/^[0-9+\-\s]+$/),
        email: Joi.string().email(),
        address: Joi.object({
            street: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            pincode: Joi.string(),
        }),
        bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allergies: Joi.array().items(Joi.string()),
    }),

    // User login
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required().min(6),
    }),

    // Create user
    createUser: Joi.object({
        username: Joi.string().required().min(3).max(50),
        email: Joi.string().email().required(),
        password: Joi.string().required().min(6),
        role: Joi.string().required(),
        department: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
        profile: Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            phone: Joi.string(),
            qualification: Joi.string(),
            specialization: Joi.string(),
            registrationNumber: Joi.string(),
        }).required(),
    }),
};
