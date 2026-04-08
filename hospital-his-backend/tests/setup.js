/**
 * Jest Test Setup
 * Global configuration and utilities for tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRE = '1h';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
    /**
     * Generate mock user data
     */
    generateMockUser: (overrides = {}) => ({
        email: `test${Date.now()}@hospital.com`,
        password: 'Password123',
        username: `testuser${Date.now()}`,
        role: 'doctor',
        isActive: true,
        ...overrides,
    }),

    /**
     * Generate mock patient data
     */
    generateMockPatient: (overrides = {}) => ({
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        phone: '9876543210',
        ...overrides,
    }),

    /**
     * Generate mock appointment data
     */
    generateMockAppointment: (overrides = {}) => ({
        scheduledDate: new Date(),
        scheduledTime: '10:00',
        reason: 'General checkup',
        ...overrides,
    }),
};

// Suppress console logs during tests
if (process.env.SUPPRESS_LOGS === 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
}
