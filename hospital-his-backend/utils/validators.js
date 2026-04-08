const mongoose = require('mongoose');

/**
 * Input Validators
 * Custom validation functions for various inputs
 */

/**
 * Validate MongoDB ObjectId
 */
exports.isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate email format
 */
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number (10 digits)
 */
exports.isValidPhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate password strength
 */
exports.isStrongPassword = (password) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

/**
 * Validate date string (YYYY-MM-DD)
 */
exports.isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

/**
 * Validate time string (HH:MM)
 */
exports.isValidTime = (timeString) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
};

/**
 * Validate Pincode (6 digits for India)
 */
exports.isValidPincode = (pincode) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
};

/**
 * Validate Aadhaar number (12 digits)
 */
exports.isValidAadhaar = (aadhaar) => {
    const aadhaarRegex = /^[0-9]{12}$/;
    return aadhaarRegex.test(aadhaar);
};

/**
 * Validate PAN number
 */
exports.isValidPAN = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
};

/**
 * Validate GST number
 */
exports.isValidGST = (gst) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
};

/**
 * Validate URL
 */
exports.isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate age (reasonable range)
 */
exports.isValidAge = (age) => {
    return Number.isInteger(age) && age >= 0 && age <= 150;
};

/**
 * Validate amount (positive number with 2 decimal places max)
 */
exports.isValidAmount = (amount) => {
    return typeof amount === 'number' && amount >= 0 && Number.isFinite(amount);
};

/**
 * Validate blood group
 */
exports.isValidBloodGroup = (bloodGroup) => {
    const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return validGroups.includes(bloodGroup);
};

/**
 * Sanitize string input
 */
exports.sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate file extension
 */
exports.isValidFileExtension = (filename, allowedExtensions) => {
    const ext = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(ext);
};
