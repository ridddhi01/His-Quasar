require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const config = require('../config/config');
const { USER_ROLES } = require('../config/constants');

const createNurses = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Find Nursing Department
        let nursingDept = await Department.findOne({ name: 'Nursing' });
        if (!nursingDept) {
            const departments = await Department.find({});
            if (departments.length > 0) nursingDept = departments[0];
        }

        const nursesData = [
            {
                username: 'nurse.rajesh',
                email: 'rajesh@hospital-his.com',
                password: 'Nurse@123',
                role: USER_ROLES.NURSE,
                department: nursingDept?._id,
                profile: {
                    firstName: 'Rajesh',
                    lastName: 'Kumar',
                    phone: '+91-9876543201',
                    qualification: 'B.Sc Nursing',
                    specialization: 'General Nursing'
                },
                isActive: true,
            },
            {
                username: 'nurse.priya',
                email: 'priya@hospital-his.com',
                password: 'Nurse@123',
                role: USER_ROLES.NURSE,
                department: nursingDept?._id,
                profile: {
                    firstName: 'Priya',
                    lastName: 'Singh',
                    phone: '+91-9876543202',
                    qualification: 'B.Sc Nursing',
                    specialization: 'ICU Nursing'
                },
                isActive: true,
            },
            {
                username: 'nurse.amit',
                email: 'amit@hospital-his.com',
                password: 'Nurse@123',
                role: USER_ROLES.NURSE,
                department: nursingDept?._id,
                profile: {
                    firstName: 'Amit',
                    lastName: 'Patel',
                    phone: '+91-9876543203',
                    qualification: 'B.Sc Nursing',
                    specialization: 'Emergency Nursing'
                },
                isActive: true,
            },
            {
                username: 'nurse.sakshi',
                email: 'sakshi@hospital-his.com',
                password: 'Nurse@123',
                role: USER_ROLES.NURSE,
                department: nursingDept?._id,
                profile: {
                    firstName: 'Sakshi',
                    lastName: 'Sharma',
                    phone: '+91-9876543204',
                    qualification: 'B.Sc Nursing',
                    specialization: 'Pediatric Nursing'
                },
                isActive: true,
            }
        ];

        for (const nurseData of nursesData) {
            const exists = await User.findOne({ 
                $or: [
                    { username: nurseData.username },
                    { email: nurseData.email }
                ]
            });
            if (exists) {
                console.log(`✓ User ${nurseData.username} already exists`);
            } else {
                await User.create(nurseData);
                console.log(`✓ Created nurse: ${nurseData.username}`);
            }
        }

        console.log('✅ Nurse creation complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

createNurses();
