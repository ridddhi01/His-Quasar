const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

/**
 * Notification Model
 * Represents system notifications
 */

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required'],
        },
        type: {
            type: String,
            enum: Object.values(NOTIFICATION_TYPES),
            required: [true, 'Type is required'],
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
        },
        relatedEntity: {
            type: { type: String, trim: true },
            id: { type: mongoose.Schema.Types.ObjectId },
        },
        actionUrl: {
            type: String,
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        priority: {
            type: Number,
            default: 0, // Higher = more important
        },
        expiresAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
