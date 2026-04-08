const billingService = require('../../services/billing.service');
const Billing = require('../../models/Billing');

jest.mock('../../models/Billing');

describe('Billing Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateTotals', () => {
        it('should calculate correct totals for items', () => {
            const items = [
                { quantity: 2, rate: 100, discountPercent: 10, taxPercent: 18 },
                { quantity: 1, rate: 500, discountAmount: 50, taxPercent: 18 },
            ];

            const totals = billingService.calculateTotals(items);

            expect(totals.subtotal).toBe(700);
            expect(totals.totalDiscount).toBe(70); // 20 + 50
            expect(totals.totalTax).toBeCloseTo(113.4); // (180 * 0.18) + (450 * 0.18)
            expect(totals.grandTotal).toBeCloseTo(743.4);
        });

        it('should handle items without discount or tax', () => {
            const items = [
                { quantity: 3, rate: 100 },
                { quantity: 2, rate: 200 },
            ];

            const totals = billingService.calculateTotals(items);

            expect(totals.subtotal).toBe(700);
            expect(totals.totalDiscount).toBe(0);
            expect(totals.totalTax).toBe(0);
            expect(totals.grandTotal).toBe(700);
        });
    });

    describe('generateBillNumber', () => {
        it('should generate bill number with date prefix', async () => {
            Billing.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            });

            const billNumber = await billingService.generateBillNumber();

            const today = new Date();
            const expectedPrefix = `BIL${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
            expect(billNumber.startsWith(expectedPrefix)).toBe(true);
            expect(billNumber).toMatch(/BIL\d{6}\d{6}/);
        });
    });

    describe('getPaymentStatus', () => {
        it('should return PAID when paid equals total', () => {
            const status = billingService.getPaymentStatus(1000, 1000);
            expect(status).toBe('paid');
        });

        it('should return PARTIAL when paid is less than total', () => {
            const status = billingService.getPaymentStatus(500, 1000);
            expect(status).toBe('partial');
        });

        it('should return PENDING when nothing is paid', () => {
            const status = billingService.getPaymentStatus(0, 1000);
            expect(status).toBe('pending');
        });
    });
});
