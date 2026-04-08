const mongoose = require('mongoose');

/**
 * Staff Model
 * Represents staff/HR records
 */

const staffSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            unique: true,
            required: [true, 'Employee ID is required'],
            trim: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        designation: {
            type: String,
            required: [true, 'Designation is required'],
            trim: true,
        },
        employmentType: {
            type: String,
            enum: ['permanent', 'contract', 'consultant', 'intern', 'trainee'],
            required: true,
        },
        joiningDate: {
            type: Date,
            required: [true, 'Joining date is required'],
        },
        endDate: {
            type: Date,
        },
        reportingTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
        },
        salary: {
            basic: { type: Number },
            allowances: { type: Number },
            deductions: { type: Number },
            net: { type: Number },
        },
        bankDetails: {
            bankName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true },
        },
        documents: {
            resume: { type: String },
            idProof: { type: String },
            addressProof: { type: String },
            educationCertificates: [{ type: String }],
        },
        emergencyContact: {
            name: { type: String, trim: true },
            relationship: { type: String, trim: true },
            phone: { type: String, trim: true },
        },
        leaveBalance: {
            casual: { type: Number, default: 12 },
            sick: { type: Number, default: 12 },
            earned: { type: Number, default: 0 },
        },
        status: {
            type: String,
            enum: ['active', 'on-leave', 'resigned', 'terminated', 'retired'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
staffSchema.index({ employeeId: 1 });
staffSchema.index({ user: 1 });
staffSchema.index({ department: 1 });
staffSchema.index({ status: 1 });

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;
