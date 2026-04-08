/**
 * Script to add a Radiologist user
 * Run with: node scripts/add_radiologist.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const { USER_ROLES } = require('../config/constants');

// Check for MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_his_db';

const addRadiologist = async () => {
    console.log('🔌 Connecting to MongoDB...');
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('   ✓ Connected!');

        // Check if radiologist already exists
        const existing = await User.findOne({ username: 'radiology.deepa' });
        if (existing) {
            console.log('⚠️  Radiologist user already exists!');
            console.log('   Username: radiology.deepa');
            console.log('   Password: Radiology@123');
            process.exit(0);
        }

        // Get radiology department
        const radiologyDept = await Department.findOne({ departmentCode: 'DEPT-RAD' });
        if (!radiologyDept) {
            console.log('❌ Radiology department not found. Please run seed.js first.');
            console.log('   (Creating without department for now if blocked...)');
            // process.exit(1); 
            // Better to fail if department crucial, but let's try to proceed if we can find ANY department or null
        }

        // Create radiologist user
        const radiologist = await User.create({
            username: 'radiology.deepa',
            email: 'deepa@hospital-his.com',
            password: 'Radiology@123',
            role: USER_ROLES.RADIOLOGIST || 'radiologist',
            department: radiologyDept ? radiologyDept._id : null,
            profile: {
                firstName: 'Deepa',
                lastName: 'Krishnan',
                phone: '+91-9876543216',
                qualification: 'MD Radiology, MBBS',
            },
            isActive: true,
        });

        console.log('');
        console.log('✅ Radiologist user created successfully!');
        console.log('');
        console.log('┌───────────────────────────────────────────┐');
        console.log('│           RADIOLOGIST CREDENTIALS         │');
        console.log('├───────────────────────────────────────────┤');
        console.log('│  Username:  radiology.deepa               │');
        console.log('│  Password:  Radiology@123                 │');
        console.log('│  Role:      radiologist                   │');
        console.log('└───────────────────────────────────────────┘');
        console.log('');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

addRadiologist();
