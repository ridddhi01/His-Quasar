require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/config');

const checkNurses = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const nurses = await User.find({ role: 'nurse' });
        console.log(`\n--- NURSES (${nurses.length}) ---`);
        for (const n of nurses) {
            console.log(`User: ${n.username}, Role: ${n.role}, Active: ${n.isActive}`);
        }

        const headNurses = await User.find({ role: 'head_nurse' });
        console.log(`\n--- HEAD NURSES (${headNurses.length}) ---`);
        for (const n of headNurses) {
            console.log(`User: ${n.username}, Role: ${n.role}, Active: ${n.isActive}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

checkNurses();
