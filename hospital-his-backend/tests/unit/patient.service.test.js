const patientService = require('../../services/patient.service');
const Patient = require('../../models/Patient');

// Mock the Patient model
jest.mock('../../models/Patient');

describe('Patient Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generatePatientId', () => {
        it('should generate first patient ID as PAT00000001', async () => {
            Patient.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            });

            const patientId = await patientService.generatePatientId();
            expect(patientId).toBe('PAT00000001');
        });

        it('should increment patient ID based on last patient', async () => {
            Patient.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue({ patientId: 'PAT00000005' }),
            });

            const patientId = await patientService.generatePatientId();
            expect(patientId).toBe('PAT00000006');
        });
    });

    describe('registerPatient', () => {
        it('should create a new patient with generated ID', async () => {
            const mockPatientData = {
                firstName: 'John',
                lastName: 'Doe',
                phone: '9876543210',
            };

            Patient.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            });
            Patient.create.mockResolvedValue({
                ...mockPatientData,
                patientId: 'PAT00000001',
            });

            const result = await patientService.registerPatient(mockPatientData);

            expect(Patient.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...mockPatientData,
                    patientId: 'PAT00000001',
                })
            );
            expect(result.patientId).toBe('PAT00000001');
        });
    });

    describe('searchPatients', () => {
        it('should search patients by query', async () => {
            const mockPatients = [
                { patientId: 'PAT00000001', firstName: 'John' },
                { patientId: 'PAT00000002', firstName: 'Jane' },
            ];

            Patient.find.mockReturnValue({
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockPatients),
            });
            Patient.countDocuments.mockResolvedValue(2);

            const result = await patientService.searchPatients({ query: 'Jo' });

            expect(result.patients).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should apply pagination', async () => {
            Patient.find.mockReturnValue({
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([]),
            });
            Patient.countDocuments.mockResolvedValue(50);

            const result = await patientService.searchPatients({}, { page: 2, limit: 10 });

            expect(result.page).toBe(2);
            expect(result.pages).toBe(5);
        });
    });
});
