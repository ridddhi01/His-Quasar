const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const Patient = require('../../models/Patient');
const User = require('../../models/User');

let mongoServer;
let authToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user and get token
    await User.create({
        email: 'testdoctor@hospital.com',
        password: 'Password123',
        username: 'testdoctor',
        role: 'doctor',
        isActive: true,
    });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'testdoctor@hospital.com',
            password: 'Password123',
        });

    authToken = loginRes.body.token;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Patient.deleteMany({});
});

describe('Patient API', () => {
    describe('POST /api/patients', () => {
        it('should create a new patient', async () => {
            const patientData = {
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-05-15',
                gender: 'male',
                phone: '9876543210',
                email: 'john@example.com',
            };

            const res = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(patientData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.patientId).toBeDefined();
            expect(res.body.data.firstName).toBe('John');
        });

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/patients')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ firstName: 'John' });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/patients', () => {
        beforeEach(async () => {
            await Patient.create([
                {
                    patientId: 'PAT00000001',
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: new Date('1990-05-15'),
                    gender: 'male',
                    phone: '9876543210',
                },
                {
                    patientId: 'PAT00000002',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    dateOfBirth: new Date('1985-03-20'),
                    gender: 'female',
                    phone: '9876543211',
                },
            ]);
        });

        it('should get all patients', async () => {
            const res = await request(app)
                .get('/api/patients')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveLength(2);
        });

        it('should search patients by name', async () => {
            const res = await request(app)
                .get('/api/patients/search?query=John')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/patients/:id', () => {
        let patientId;

        beforeEach(async () => {
            const patient = await Patient.create({
                patientId: 'PAT00000001',
                firstName: 'Test',
                lastName: 'Patient',
                dateOfBirth: new Date('1990-01-01'),
                gender: 'male',
                phone: '9876543210',
            });
            patientId = patient._id;
        });

        it('should get patient by ID', async () => {
            const res = await request(app)
                .get(`/api/patients/${patientId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.firstName).toBe('Test');
        });

        it('should return 404 for non-existent patient', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/patients/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PUT /api/patients/:id', () => {
        let patientId;

        beforeEach(async () => {
            const patient = await Patient.create({
                patientId: 'PAT00000001',
                firstName: 'Original',
                lastName: 'Name',
                dateOfBirth: new Date('1990-01-01'),
                gender: 'male',
                phone: '9876543210',
            });
            patientId = patient._id;
        });

        it('should update patient', async () => {
            const res = await request(app)
                .put(`/api/patients/${patientId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ firstName: 'Updated' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.firstName).toBe('Updated');
        });
    });
});
