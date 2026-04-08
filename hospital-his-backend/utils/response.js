/**
 * Response Utility
 * Standardized API response helpers
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code
 */
exports.successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code
 * @param {Object} errors - Additional error details
 */
exports.errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        error: message,
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data
 * @param {Object} pagination - Pagination info
 * @param {String} message - Success message
 */
exports.paginatedResponse = (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination,
    });
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource
 * @param {String} message - Success message
 */
exports.createdResponse = (res, data, message = 'Resource created successfully') => {
    return res.status(201).json({
        success: true,
        message,
        data,
    });
};

/**
 * No content response (204)
 * @param {Object} res - Express response object
 */
exports.noContentResponse = (res) => {
    return res.status(204).send();
};

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {String} resource - Resource name
 */
exports.notFoundResponse = (res, resource = 'Resource') => {
    return res.status(404).json({
        success: false,
        error: `${resource} not found`,
    });
};

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
exports.unauthorizedResponse = (res, message = 'Unauthorized access') => {
    return res.status(401).json({
        success: false,
        error: message,
    });
};

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
exports.forbiddenResponse = (res, message = 'Access forbidden') => {
    return res.status(403).json({
        success: false,
        error: message,
    });
};

/**
 * Bad request response (400)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} errors - Validation errors
 */
exports.badRequestResponse = (res, message = 'Bad request', errors = null) => {
    const response = {
        success: false,
        error: message,
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(400).json(response);
};

/**
 * Conflict response (409)
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
exports.conflictResponse = (res, message = 'Resource already exists') => {
    return res.status(409).json({
        success: false,
        error: message,
    });
};
