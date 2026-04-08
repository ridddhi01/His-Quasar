const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../config/constants');

/**
 * User Model
 * Represents all user types in the system (doctors, nurses, staff, etc.)
 */

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [50, 'Username cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            required: [true, 'Role is required'],
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        profile: {
            firstName: {
                type: String,
                required: [true, 'First name is required'],
                trim: true,
            },
            lastName: {
                type: String,
                required: [true, 'Last name is required'],
                trim: true,
            },
            phone: {
                type: String,
                trim: true,
            },
            qualification: {
                type: String,
                trim: true,
            },
            specialization: {
                type: String,
                trim: true,
            },
            registrationNumber: {
                type: String,
                trim: true,
            },
            employeeId: {
                type: String,
                trim: true,
            },
            dateOfJoining: {
                type: Date,
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        refreshToken: {
            type: String,
            select: false,
        },

        // ═══════════════════════════════════════════════════════════════════
        // SECURITY & ACCESS CONTROL FIELDS
        // ═══════════════════════════════════════════════════════════════════

        // Account Status
        accountStatus: {
            type: String,
            enum: ['active', 'suspended', 'locked', 'pending_activation', 'deactivated'],
            default: 'active',
        },
        deactivatedAt: {
            type: Date,
        },
        deactivatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        deactivationReason: {
            type: String,
        },

        // Account Lockout
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        lockoutUntil: {
            type: Date,
        },
        lastFailedLogin: {
            type: Date,
        },

        // Password Security
        passwordChangedAt: {
            type: Date,
        },
        passwordExpiresAt: {
            type: Date,
        },
        passwordHistory: [{
            hash: String,
            changedAt: Date,
        }],
        mustChangePassword: {
            type: Boolean,
            default: false,
        },
        passwordResetToken: {
            type: String,
            select: false,
        },
        passwordResetExpires: {
            type: Date,
            select: false,
        },

        // Break-Glass Access (Emergency Override)
        breakGlassPermissions: {
            enabled: {
                type: Boolean,
                default: false,
            },
            grantedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            grantedAt: {
                type: Date,
            },
            expiresAt: {
                type: Date,
            },
            reason: {
                type: String,
            },
            accessLevel: {
                type: String,
                enum: ['view_only', 'full_clinical', 'emergency'],
                default: 'view_only',
            },
        },

        // Role History (Audit Trail)
        roleHistory: [{
            previousRole: String,
            newRole: String,
            changedAt: {
                type: Date,
                default: Date.now,
            },
            changedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            reason: String,
        }],

        // Supervisor/Reporting
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // Session Management
        activeSessions: [{
            sessionId: String,
            deviceInfo: String,
            ipAddress: String,
            createdAt: Date,
            lastActivity: Date,
        }],
        maxConcurrentSessions: {
            type: Number,
            default: 3,
        },

        // Permissions Override (Temporary)
        temporaryPermissions: [{
            permission: String,
            grantedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            grantedAt: Date,
            expiresAt: Date,
            reason: String,
        }],

        // Created By tracking
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
userSchema.virtual('fullName').get(function () {
    return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
