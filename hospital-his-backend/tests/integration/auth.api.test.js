const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const User = require('../../models/User');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
});

describe('Auth API', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                email: 'test@hospital.com',
                password: 'Password123',
                username: 'testuser',
                role: 'receptionist',
                profile: {
                    firstName: 'Test',
                    lastName: 'User',
                },
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(userData.email);
        });

        it('should not register user with existing email', async () => {
            await User.create({
                email: 'existing@hospital.com',
                password: 'Password123',
                username: 'existing',
                role: 'receptionist',
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'existing@hospital.com',
                    password: 'Password123',
                    username: 'newuser',
                    role: 'receptionist',
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await User.create({
                email: 'login@hospital.com',
                password: 'Password123',
                username: 'loginuser',
                role: 'doctor',
                isActive: true,
            });
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@hospital.com',
                    password: 'Password123',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
        });

        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@hospital.com',
                    password: 'WrongPassword',
                });

            expect(res.statusCode).toBe(401);
        });

        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@hospital.com',
                    password: 'Password123',
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        let token;

        beforeEach(async () => {
            const user = await User.create({
                email: 'me@hospital.com',
                password: 'Password123',
                username: 'meuser',
                role: 'nurse',
                isActive: true,
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'me@hospital.com',
                    password: 'Password123',
                });

            token = res.body.token;
        });

        it('should return current user with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.email).toBe('me@hospital.com');
        });

        it('should reject request without token', async () => {
            const res = await request(app).get('/api/auth/me');

            expect(res.statusCode).toBe(401);
        });
    });
});
