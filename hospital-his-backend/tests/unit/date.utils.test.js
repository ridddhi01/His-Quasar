const { formatDate, formatDateIndian, calculateAge, daysBetween, isToday, addDays } = require('../../utils/date.utils');

describe('Date Utilities', () => {
    describe('formatDate', () => {
        it('should format date to YYYY-MM-DD', () => {
            const date = new Date('2024-01-15');
            expect(formatDate(date)).toBe('2024-01-15');
        });
    });

    describe('formatDateIndian', () => {
        it('should format date to DD/MM/YYYY', () => {
            const date = new Date('2024-01-15');
            expect(formatDateIndian(date)).toBe('15/01/2024');
        });
    });

    describe('calculateAge', () => {
        it('should calculate correct age', () => {
            const today = new Date();
            const birthYear = today.getFullYear() - 25;
            const dob = new Date(birthYear, 0, 1);

            const age = calculateAge(dob);
            expect(age).toBe(25);
        });

        it('should account for birthday not yet passed', () => {
            const today = new Date();
            const futureMonth = (today.getMonth() + 2) % 12;
            const birthYear = today.getFullYear() - 30;
            const dob = new Date(birthYear, futureMonth, 15);

            const age = calculateAge(dob);
            expect(age).toBe(29);
        });
    });

    describe('daysBetween', () => {
        it('should calculate days between dates', () => {
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-10');

            expect(daysBetween(date1, date2)).toBe(9);
        });

        it('should work regardless of date order', () => {
            const date1 = new Date('2024-01-10');
            const date2 = new Date('2024-01-01');

            expect(daysBetween(date1, date2)).toBe(9);
        });
    });

    describe('isToday', () => {
        it('should return true for today', () => {
            expect(isToday(new Date())).toBe(true);
        });

        it('should return false for other days', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(isToday(yesterday)).toBe(false);
        });
    });

    describe('addDays', () => {
        it('should add days to date', () => {
            const date = new Date('2024-01-15');
            const result = addDays(date, 10);

            expect(result.getDate()).toBe(25);
            expect(result.getMonth()).toBe(0);
        });

        it('should handle month overflow', () => {
            const date = new Date('2024-01-25');
            const result = addDays(date, 10);

            expect(result.getMonth()).toBe(1); // February
        });
    });
});
