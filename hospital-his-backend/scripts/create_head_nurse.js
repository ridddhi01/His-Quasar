require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const config = require('../config/config');
const { USER_ROLES } = require('../config/constants');

const createHeadNurse = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Find Nursing Department (assuming it exists or Generic)
        let nursingDept = await Department.findOne({ name: 'Nursing' });
        if (!nursingDept) {
            const departments = await Department.find({});
            if (departments.length > 0) nursingDept = departments[0]; // Fallback
        }

        const headNurseData = {
            username: 'head.nurse',
            email: 'head.nurse@hospital-his.com',
            password: 'HeadNurse@123',
            role: USER_ROLES.HEAD_NURSE,
            department: nursingDept?._id,
            profile: {
                firstName: 'Maria',
                lastName: 'Fernandez',
                phone: '+91-9876543299',
                qualification: 'M.Sc Nursing',
                specialization: 'Nursing Administration'
            },
            isActive: true,
        };

        // Check if exists
        const exists = await User.findOne({ username: headNurseData.username });
        if (exists) {
            console.log('User head.nurse already exists. Updating role...');
            exists.role = USER_ROLES.HEAD_NURSE;
            await exists.save();
            console.log('Updated.');
        } else {
            await User.create(headNurseData);
            console.log('Created head.nurse user.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

createHeadNurse();
