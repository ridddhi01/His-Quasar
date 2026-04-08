const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if user is active
    if (!user.isActive) {
        return next(new ErrorResponse('Account is deactivated', 401));
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res, next) => {
    // Clear refresh token
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new ErrorResponse('Refresh token is required', 400));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtSecret);

    // Find user with matching refresh token
    const user = await User.findOne({
        _id: decoded.id,
        refreshToken: refreshToken,
    });

    if (!user) {
        return next(new ErrorResponse('Invalid refresh token', 401));
    }

    sendTokenResponse(user, 200, res);
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorResponse('User not found with this email', 404));
    }

    // TODO: Generate reset token and send email

    res.status(200).json({
        success: true,
        message: 'Password reset email sent',
    });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // TODO: Implement password reset with token

    res.status(200).json({
        success: true,
        message: 'Password reset successful',
    });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
        return next(new ErrorResponse('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).populate('department');

    res.status(200).json({
        success: true,
        data: user,
    });
});

// Helper function to get token and send response
const sendTokenResponse = async (user, statusCode, res) => {
    // Create access token
    const accessToken = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
        expiresIn: config.jwtExpire,
    });

    // Create refresh token
    const refreshToken = jwt.sign({ id: user._id }, config.jwtSecret, {
        expiresIn: config.jwtRefreshExpire,
    });

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Populate department to include full department info
    await user.populate('department', '_id name departmentCode');

    res.status(statusCode).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            department: user.department, // Include populated department
        },
    });
};
