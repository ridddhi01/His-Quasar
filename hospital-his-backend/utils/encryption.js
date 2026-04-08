const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Encryption Utilities
 * Password hashing and encryption functions
 */

const SALT_ROUNDS = 10;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

/**
 * Hash password using bcrypt
 */
exports.hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 */
exports.comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

/**
 * Encrypt text using AES-256-CBC
 */
exports.encrypt = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt text
 */
exports.decrypt = (encryptedText) => {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

/**
 * Generate random token
 */
exports.generateToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash value using SHA256
 */
exports.hashSHA256 = (value) => {
    return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Generate password reset token
 */
exports.generateResetToken = () => {
    const token = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return { token, hashedToken, expires };
};

/**
 * Verify reset token
 */
exports.verifyResetToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate secure random number
 */
exports.secureRandomNumber = (min, max) => {
    const range = max - min;
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0) / 0xffffffff;
    return Math.floor(randomNumber * range) + min;
};

/**
 * Mask sensitive data
 */
exports.maskSensitiveData = (data, fieldsToMask = ['password', 'token', 'secret']) => {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    fieldsToMask.forEach((field) => {
        if (masked[field]) {
            masked[field] = '********';
        }
    });
    return masked;
};
