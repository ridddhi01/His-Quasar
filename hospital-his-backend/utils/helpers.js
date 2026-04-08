/**
 * Helper Utility Functions
 * Common utility functions used throughout the application
 */

/**
 * Generate a unique code with prefix
 * @param {String} prefix - Prefix for the code (e.g., 'PAT', 'BIL')
 * @param {Number} length - Length of the numeric part
 */
exports.generateCode = (prefix, length = 6) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
    return `${prefix}${timestamp}${random}`.substring(0, prefix.length + length);
};

/**
 * Generate sequential code based on count
 * @param {String} prefix - Prefix for the code
 * @param {Number} count - Current count
 * @param {Number} padding - Number of digits to pad
 */
exports.generateSequentialCode = (prefix, count, padding = 6) => {
    return `${prefix}${String(count + 1).padStart(padding, '0')}`;
};

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth - Date of birth
 */
exports.calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/**
 * Format currency amount
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency code (default: INR)
 */
exports.formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
    }).format(amount);
};

/**
 * Format date to Indian format
 * @param {Date} date - Date to format
 */
exports.formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

/**
 * Format date and time
 * @param {Date} date - Date to format
 */
exports.formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Parse query string for pagination
 * @param {Object} query - Express request query object
 */
exports.parsePagination = (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const sort = query.sort || '-createdAt';

    return { page, limit, skip, sort };
};

/**
 * Build pagination response
 * @param {Number} total - Total number of documents
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 */
exports.buildPaginationResponse = (total, page, limit) => {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
    };
};

/**
 * Sanitize object - remove undefined and null values
 * @param {Object} obj - Object to sanitize
 */
exports.sanitizeObject = (obj) => {
    const sanitized = {};
    Object.keys(obj).forEach((key) => {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            sanitized[key] = obj[key];
        }
    });
    return sanitized;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 */
exports.deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if string is valid MongoDB ObjectId
 * @param {String} id - String to check
 */
exports.isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Generate random alphanumeric string
 * @param {Number} length - Length of the string
 */
exports.generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Mask sensitive data (e.g., phone, email)
 * @param {String} data - Data to mask
 * @param {String} type - Type of data ('phone', 'email')
 */
exports.maskSensitiveData = (data, type) => {
    if (!data) return '';

    switch (type) {
        case 'phone':
            return data.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
        case 'email':
            const [local, domain] = data.split('@');
            return `${local.substring(0, 2)}****@${domain}`;
        default:
            return data;
    }
};

/**
 * Calculate percentage
 * @param {Number} value - Current value
 * @param {Number} total - Total value
 * @param {Number} decimals - Decimal places
 */
exports.calculatePercentage = (value, total, decimals = 2) => {
    if (total === 0) return 0;
    return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * Get date range for common periods
 * @param {String} period - 'today', 'week', 'month', 'year'
 */
exports.getDateRange = (period) => {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
};
