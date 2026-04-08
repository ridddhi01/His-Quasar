const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 */
exports.getUserNotifications = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, isRead } = req.query;

    const query = { recipient: req.user.id };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Notification.countDocuments(query);

    res.status(200).json({
        success: true,
        count: notifications.length,
        total,
        page: parseInt(page),
        data: notifications,
    });
});

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread-count
 */
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
    const count = await Notification.countDocuments({
        recipient: req.user.id,
        isRead: false,
    });

    res.status(200).json({
        success: true,
        data: { count },
    });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 */
exports.markAsRead = asyncHandler(async (req, res, next) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: req.user.id,
    });

    if (!notification) {
        return next(new ErrorResponse('Notification not found', 404));
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
        success: true,
        data: notification,
    });
});

/**
 * @desc    Mark all as read
 * @route   PUT /api/notifications/read-all
 */
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
    await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
    });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 */
exports.deleteNotification = asyncHandler(async (req, res, next) => {
    const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipient: req.user.id,
    });

    if (!notification) {
        return next(new ErrorResponse('Notification not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Notification deleted',
    });
});

/**
 * @desc    Get notification settings
 * @route   GET /api/notifications/settings
 */
exports.getSettings = asyncHandler(async (req, res, next) => {
    // TODO: Implement notification settings storage
    res.status(200).json({
        success: true,
        data: {
            email: true,
            push: true,
            sms: false,
        },
    });
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/notifications/settings
 */
exports.updateSettings = asyncHandler(async (req, res, next) => {
    // TODO: Implement notification settings update
    res.status(200).json({
        success: true,
        message: 'Settings updated',
    });
});
