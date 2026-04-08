const nodemailer = require('nodemailer');
const config = require('../config/config');
const Notification = require('../models/Notification');

/**
 * Notification Service
 * Handles Email, SMS, and Push notifications
 */

class NotificationService {
    constructor() {
        // Email transporter
        this.emailTransporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });
    }

    /**
     * Send email notification
     */
    async sendEmail(to, subject, html, text) {
        try {
            const mailOptions = {
                from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
                to,
                subject,
                html,
                text,
            };

            const result = await this.emailTransporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send SMS notification
     */
    async sendSMS(phoneNumber, message) {
        // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
        console.log(`SMS to ${phoneNumber}: ${message}`);
        return { success: true, provider: 'mock' };
    }

    /**
     * Send push notification
     */
    async sendPushNotification(userId, title, body, data = {}) {
        // TODO: Integrate with Firebase Cloud Messaging or similar
        console.log(`Push to ${userId}: ${title} - ${body}`);
        return { success: true, provider: 'mock' };
    }

    /**
     * Create in-app notification
     */
    async createNotification(recipientId, type, title, message, relatedEntity = null) {
        return Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            relatedEntity,
            isRead: false,
        });
    }

    /**
     * Send appointment reminder
     */
    async sendAppointmentReminder(appointment) {
        const { patient, doctor, scheduledDate, scheduledTime } = appointment;

        // Email
        if (patient.email) {
            await this.sendEmail(
                patient.email,
                'Appointment Reminder',
                `
          <h2>Appointment Reminder</h2>
          <p>Dear ${patient.firstName},</p>
          <p>This is a reminder for your appointment:</p>
          <ul>
            <li>Date: ${new Date(scheduledDate).toLocaleDateString()}</li>
            <li>Time: ${scheduledTime}</li>
            <li>Doctor: Dr. ${doctor.profile?.firstName} ${doctor.profile?.lastName}</li>
          </ul>
          <p>Please arrive 15 minutes before your scheduled time.</p>
        `
            );
        }

        // SMS
        if (patient.phone) {
            await this.sendSMS(
                patient.phone,
                `Reminder: Your appointment is on ${new Date(scheduledDate).toLocaleDateString()} at ${scheduledTime}. Please arrive 15 mins early.`
            );
        }
    }

    /**
     * Send lab report notification
     */
    async sendLabReportReady(patient, labTest) {
        if (patient.email) {
            await this.sendEmail(
                patient.email,
                'Lab Report Ready',
                `
          <h2>Your Lab Report is Ready</h2>
          <p>Dear ${patient.firstName},</p>
          <p>Your lab test (${labTest.test?.testName}) report is now available.</p>
          <p>Please login to your patient portal or visit the hospital to collect your report.</p>
        `
            );
        }

        if (patient.phone) {
            await this.sendSMS(
                patient.phone,
                `Your lab report for ${labTest.test?.testName} is ready. Please collect from the hospital.`
            );
        }
    }

    /**
     * Send discharge summary
     */
    async sendDischargeSummary(patient, admission) {
        if (patient.email) {
            await this.sendEmail(
                patient.email,
                'Discharge Summary',
                `
          <h2>Discharge Summary</h2>
          <p>Dear ${patient.firstName},</p>
          <p>You have been discharged from ${admission.ward?.name}.</p>
          <p>Admission ID: ${admission.admissionNumber}</p>
          <p>Please follow the discharge instructions provided by your doctor.</p>
          <p>For any queries, contact the hospital helpdesk.</p>
        `
            );
        }
    }

    /**
     * Send bill notification
     */
    async sendBillNotification(patient, bill) {
        if (patient.email) {
            await this.sendEmail(
                patient.email,
                `Bill Generated - ${bill.billNumber}`,
                `
          <h2>Bill Generated</h2>
          <p>Dear ${patient.firstName},</p>
          <p>A bill has been generated for your recent visit.</p>
          <ul>
            <li>Bill Number: ${bill.billNumber}</li>
            <li>Amount: ₹${bill.grandTotal.toFixed(2)}</li>
            <li>Due Amount: ₹${bill.balanceAmount.toFixed(2)}</li>
          </ul>
          <p>Please visit the billing counter for payment.</p>
        `
            );
        }
    }

    /**
     * Notify staff
     */
    async notifyStaff(staffId, type, title, message, actionUrl = null) {
        await this.createNotification(staffId, type, title, message);
        await this.sendPushNotification(staffId, title, message, { actionUrl });
    }
}

module.exports = new NotificationService();
