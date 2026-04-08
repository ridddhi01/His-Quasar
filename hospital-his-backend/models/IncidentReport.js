const mongoose = require('mongoose');
const { INCIDENT_REPORT_STATUS } = require('../config/constants');

/**
 * IncidentReport Model
 * Represents incident/near-miss reports for risk management
 */

const incidentReportSchema = new mongoose.Schema(
    {
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Reporter is required'],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: [true, 'Department is required'],
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        occurredAt: {
            type: Date,
            required: [true, 'Occurrence date/time is required'],
        },
        wasHarm: {
            type: Boolean,
            required: [true, 'Harm indicator is required'],
            default: false,
        },
        whatHappened: {
            type: String,
            required: [true, 'Description of what happened is required'],
            trim: true,
        },
        whatCouldHaveGoneWrong: {
            type: String,
            required: [true, 'Description of potential consequences is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(INCIDENT_REPORT_STATUS),
            default: INCIDENT_REPORT_STATUS.SUBMITTED,
            required: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewNotes: {
            type: String,
            trim: true,
            default: '',
        },
        // Audit trail for status changes, assignments, and other actions
        activityLog: [{
            actorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            action: {
                type: String,
                required: true,
                enum: ['created', 'status_changed', 'assigned', 'reassigned', 'notes_updated', 'viewed'],
            },
            details: {
                type: mongoose.Schema.Types.Mixed, // e.g., { fromStatus: 'submitted', toStatus: 'in_review' }
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Indexes for common queries
incidentReportSchema.index({ reporterId: 1 });
incidentReportSchema.index({ department: 1 });
incidentReportSchema.index({ status: 1 });
incidentReportSchema.index({ occurredAt: -1 });
incidentReportSchema.index({ assignedTo: 1 });
incidentReportSchema.index({ createdAt: -1 });

const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);

// Export model and status constants
module.exports = IncidentReport;
module.exports.INCIDENT_REPORT_STATUS = INCIDENT_REPORT_STATUS;
