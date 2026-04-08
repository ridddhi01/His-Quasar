const { isValidEmail, isValidPhone, isStrongPassword, isValidBloodGroup } = require('../../utils/validators');

describe('Validators', () => {
    describe('isValidEmail', () => {
        it('should return true for valid emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.org')).toBe(true);
            expect(isValidEmail('user+tag@mail.co.in')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });

    describe('isValidPhone', () => {
        it('should return true for 10-digit phone numbers', () => {
            expect(isValidPhone('9876543210')).toBe(true);
            expect(isValidPhone('0123456789')).toBe(true);
        });

        it('should return false for invalid phone numbers', () => {
            expect(isValidPhone('123')).toBe(false);
            expect(isValidPhone('12345678901')).toBe(false);
            expect(isValidPhone('abcdefghij')).toBe(false);
            expect(isValidPhone('')).toBe(false);
        });
    });

    describe('isStrongPassword', () => {
        it('should return true for strong passwords', () => {
            expect(isStrongPassword('Password1')).toBe(true);
            expect(isStrongPassword('SecurePass123')).toBe(true);
        });

        it('should return false for weak passwords', () => {
            expect(isStrongPassword('password')).toBe(false);
            expect(isStrongPassword('PASSWORD')).toBe(false);
            expect(isStrongPassword('12345678')).toBe(false);
            expect(isStrongPassword('Pass1')).toBe(false);
        });
    });

    describe('isValidBloodGroup', () => {
        it('should return true for valid blood groups', () => {
            expect(isValidBloodGroup('A+')).toBe(true);
            expect(isValidBloodGroup('O-')).toBe(true);
            expect(isValidBloodGroup('AB+')).toBe(true);
        });

        it('should return false for invalid blood groups', () => {
            expect(isValidBloodGroup('C+')).toBe(false);
            expect(isValidBloodGroup('A')).toBe(false);
            expect(isValidBloodGroup('')).toBe(false);
        });
    });
});
