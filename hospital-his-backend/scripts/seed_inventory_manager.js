/**
 * Seed Inventory Manager User
 * Creates a test user with inventory_manager role
 * 
 * Run: node scripts/seed_inventory_manager.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedInventoryManager = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const userData = {
            username: 'invmanager',
            email: 'Invmanager@hospital-his.com',
            password: 'Inv@123',
            role: 'inventory_manager',
            profile: {
                firstName: 'Inventory',
                lastName: 'Manager',
                phone: '+91-9876543210',
                employeeId: 'INV-001',
                dateOfJoining: new Date(),
            },
            isActive: true,
        };

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: userData.email.toLowerCase() },
                { username: userData.username }
            ]
        });

        if (existingUser) {
            console.log('Inventory Manager user already exists!');
            console.log('Email:', existingUser.email);
            console.log('Username:', existingUser.username);
            console.log('Role:', existingUser.role);
        } else {
            // Create new user
            const user = await User.create(userData);
            console.log('✅ Inventory Manager user created successfully!');
            console.log('Email:', user.email);
            console.log('Username:', user.username);
            console.log('Password: Inv@123');
            console.log('Role:', user.role);
        }

        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding inventory manager:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedInventoryManager();
