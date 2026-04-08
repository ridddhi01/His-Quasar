const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const User = require('../../models/User');
const Patient = require('../../models/Patient');
const Appointment = require('../../models/Appointment');
const Billing = require('../../models/Billing');

let mongoServer;

/**
 * End-to-End Tests
 * Tests complete user workflows from start to finish
 */

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('E2E: OPD Patient Flow', () => {
    let receptionistToken;
    let doctorToken;
    let billingToken;
    let patientId;
    let appointmentId;
    let billId;

    beforeAll(async () => {
        // Create test users
        await User.create([
            {
                email: 'receptionist@hospital.com',
                password: 'Password123',
                username: 'receptionist1',
                role: 'receptionist',
                isActive: true,
            },
            {
                email: 'doctor@hospital.com',
                password: 'Password123',
                username: 'doctor1',
                role: 'doctor',
                isActive: true,
            },
            {
                email: 'billing@hospital.com',
                password: 'Password123',
                username: 'billing1',
                role: 'billing',
                isActive: true,
            },
        ]);

        // Get tokens
        const receptionistRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'receptionist@hospital.com', password: 'Password123' });
        receptionistToken = receptionistRes.body.token;

        const doctorRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'doctor@hospital.com', password: 'Password123' });
        doctorToken = doctorRes.body.token;

        const billingRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'billing@hospital.com', password: 'Password123' });
        billingToken = billingRes.body.token;
    });

    it('Step 1: Receptionist registers new patient', async () => {
        const res = await request(app)
            .post('/api/patients')
            .set('Authorization', `Bearer ${receptionistToken}`)
            .send({
                firstName: 'OPD',
                lastName: 'Patient',
                dateOfBirth: '1985-06-15',
                gender: 'male',
                phone: '9876543001',
                email: 'opdpatient@email.com',
            });

        expect(res.statusCode).toBe(201);
        patientId = res.body.data._id;
        expect(res.body.data.patientId).toMatch(/^PAT/);
    });

    it('Step 2: Receptionist books appointment', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const res = await request(app)
            .post('/api/opd/appointments')
            .set('Authorization', `Bearer ${receptionistToken}`)
            .send({
                patient: patientId,
                scheduledDate: tomorrow.toISOString(),
                scheduledTime: '10:00',
                reason: 'General checkup',
            });

        expect(res.statusCode).toBe(201);
        appointmentId = res.body.data._id;
        expect(res.body.data.tokenNumber).toBeDefined();
    });

    it('Step 3: Patient checks in', async () => {
        const res = await request(app)
            .put(`/api/opd/appointments/${appointmentId}/check-in`)
            .set('Authorization', `Bearer ${receptionistToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('checked-in');
    });

    it('Step 4: Doctor starts consultation', async () => {
        const res = await request(app)
            .put(`/api/opd/appointments/${appointmentId}/start`)
            .set('Authorization', `Bearer ${doctorToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('in-consultation');
    });

    it('Step 5: Doctor completes consultation', async () => {
        const res = await request(app)
            .put(`/api/opd/appointments/${appointmentId}/complete`)
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                notes: 'Patient has mild fever. Prescribed paracetamol.',
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('completed');
    });

    it('Step 6: Billing generates bill', async () => {
        const res = await request(app)
            .post('/api/billing')
            .set('Authorization', `Bearer ${billingToken}`)
            .send({
                patient: patientId,
                visit: appointmentId,
                visitModel: 'Appointment',
                items: [
                    {
                        description: 'Consultation Fee',
                        quantity: 1,
                        rate: 500,
                        taxPercent: 0,
                    },
                ],
            });

        expect(res.statusCode).toBe(201);
        billId = res.body.data._id;
        expect(res.body.data.grandTotal).toBe(500);
    });

    it('Step 7: Patient makes payment', async () => {
        const res = await request(app)
            .post('/api/payments')
            .set('Authorization', `Bearer ${billingToken}`)
            .send({
                bill: billId,
                amount: 500,
                paymentMode: 'cash',
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.status).toBe('completed');
    });

    it('Step 8: Bill is marked as paid', async () => {
        const res = await request(app)
            .get(`/api/billing/${billId}`)
            .set('Authorization', `Bearer ${billingToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.paymentStatus).toBe('paid');
        expect(res.body.data.balanceAmount).toBe(0);
    });
});

describe('E2E: Emergency Flow', () => {
    let nurseToken;
    let emergencyId;

    beforeAll(async () => {
        await User.create({
            email: 'nurse@hospital.com',
            password: 'Password123',
            username: 'nurse1',
            role: 'nurse',
            isActive: true,
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nurse@hospital.com', password: 'Password123' });
        nurseToken = res.body.token;
    });

    it('Step 1: Emergency patient arrives', async () => {
        const res = await request(app)
            .post('/api/emergency')
            .set('Authorization', `Bearer ${nurseToken}`)
            .send({
                patient: {
                    firstName: 'Emergency',
                    lastName: 'Patient',
                    phone: '9876543002',
                    gender: 'female',
                },
                chiefComplaint: 'Severe chest pain',
                triageLevel: 'critical',
                arrivalMode: 'ambulance',
                vitalSigns: {
                    bloodPressure: { systolic: 160, diastolic: 100 },
                    heartRate: 120,
                    temperature: 98.6,
                    respiratoryRate: 22,
                    oxygenSaturation: 94,
                },
            });

        expect(res.statusCode).toBe(201);
        emergencyId = res.body.data._id;
        expect(res.body.data.triageLevel).toBe('critical');
    });

    it('Step 2: Update vitals during treatment', async () => {
        const res = await request(app)
            .put(`/api/emergency/${emergencyId}/vitals`)
            .set('Authorization', `Bearer ${nurseToken}`)
            .send({
                bloodPressure: { systolic: 140, diastolic: 90 },
                heartRate: 95,
                oxygenSaturation: 97,
            });

        expect(res.statusCode).toBe(200);
    });
});
