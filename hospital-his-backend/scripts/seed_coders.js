/**
 * Seed Script for Coder Users
 * Creates coder and senior_coder accounts for Clinical Coding module
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_his';

const coderUsers = [
    {
        username: 'coder',
        email: 'coder@hospital.com',
        password: 'coder123',
        role: 'coder',
        profile: {
            firstName: 'Medical',
            lastName: 'Coder',
            phone: '9876543210',
        },
        isActive: true
    },
    {
        username: 'seniorcoder',
        email: 'senior.coder@hospital.com',
        password: 'seniorcoder123',
        role: 'senior_coder',
        profile: {
            firstName: 'Senior',
            lastName: 'Coder',
            phone: '9876543211',
        },
        isActive: true
    }
];

async function seedCoders() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        for (const userData of coderUsers) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                console.log(`⏭️  User ${userData.email} already exists, skipping...`);
                continue;
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            // Create user
            const user = await User.create({
                ...userData,
                password: hashedPassword
            });

            console.log(`✅ Created ${userData.role}: ${userData.email}`);
        }

        console.log('\n📋 CODER CREDENTIALS:');
        console.log('───────────────────────────────────────────');
        for (const user of coderUsers) {
            console.log(`Role: ${user.role.toUpperCase()}`);
            console.log(`Email: ${user.email}`);
            console.log(`Password: ${user.password}`);
            console.log('───────────────────────────────────────────');
        }

    } catch (error) {
        console.error('❌ Error seeding coders:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ MongoDB connection closed');
        process.exit(0);
    }
}

seedCoders();
