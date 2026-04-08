const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 */
router.get('/', notificationController.getUserNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @route   GET /api/notifications/settings
 * @desc    Get notification settings
 */
router.get('/settings', notificationController.getSettings);

/**
 * @route   PUT /api/notifications/settings
 * @desc    Update notification settings
 */
router.put('/settings', notificationController.updateSettings);

module.exports = router;
