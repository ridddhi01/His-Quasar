/**
 * Fix script to reset coder passwords
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI;

async function fixCoderPasswords() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Delete existing coder users
        await User.deleteMany({
            email: { $in: ['coder@hospital.com', 'senior.coder@hospital.com'] }
        });
        console.log('Deleted existing coder users');

        // Create coder (password will be hashed by pre-save hook)
        await User.create({
            username: 'coder',
            email: 'coder@hospital.com',
            password: 'coder123',  // Will be hashed by model
            role: 'coder',
            profile: {
                firstName: 'Medical',
                lastName: 'Coder',
                phone: '9876543210'
            },
            isActive: true
        });
        console.log('✅ Created coder: coder@hospital.com / coder123');

        // Create senior coder
        await User.create({
            username: 'seniorcoder',
            email: 'senior.coder@hospital.com',
            password: 'seniorcoder123',  // Will be hashed by model
            role: 'senior_coder',
            profile: {
                firstName: 'Senior',
                lastName: 'Coder',
                phone: '9876543211'
            },
            isActive: true
        });
        console.log('✅ Created senior coder: senior.coder@hospital.com / seniorcoder123');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\nDone! Try logging in now.');
        process.exit(0);
    }
}

fixCoderPasswords();
