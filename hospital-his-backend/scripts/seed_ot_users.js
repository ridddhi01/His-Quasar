/**
 * OT Module Seed Script
 * Adds additional users required for Operation Theatre workflow
 *
 * Run: node scripts/seed_ot_users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const { USER_ROLES } = require('../config/constants');
const config = require('../config/config');

const seedOTUsers = async () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          OT MODULE - USER SEEDER                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri);
        console.log(`   ✓ Connected to: ${mongoose.connection.host}`);
        console.log('');

        // Get departments
        const orthoDept = await Department.findOne({ departmentCode: 'DEPT-ORTH' });
        const genDept = await Department.findOne({ departmentCode: 'DEPT-GEN' });
        const adminDept = await Department.findOne({ departmentCode: 'DEPT-ADMN' });

        const usersToCreate = [
            // Lead Surgeon (Orthopedics)
            {
                username: 'dr.mehta.surgeon',
                email: 'dr.mehta@hospital-his.com',
                password: 'Surgeon@123',
                role: USER_ROLES.DOCTOR,
                department: orthoDept?._id || genDept?._id,
                profile: {
                    firstName: 'Vikram',
                    lastName: 'Mehta',
                    phone: '+91-9876543220',
                    qualification: 'MBBS, MS (Ortho), MCh (Joint Replacement)',
                    specialization: 'Joint Replacement Surgery',
                    registrationNumber: 'MCI-56789',
                },
                isActive: true,
            },
            // Anesthetist
            {
                username: 'dr.kapoor.anesthesia',
                email: 'dr.kapoor@hospital-his.com',
                password: 'Anesthesia@123',
                role: USER_ROLES.DOCTOR,
                department: genDept?._id,
                profile: {
                    firstName: 'Anjali',
                    lastName: 'Kapoor',
                    phone: '+91-9876543221',
                    qualification: 'MBBS, MD (Anaesthesiology)',
                    specialization: 'Anaesthesiology',
                    registrationNumber: 'MCI-67890',
                },
                isActive: true,
            },
            // OT Coordinator (Admin role)
            {
                username: 'ot.coordinator',
                email: 'ot.coordinator@hospital-his.com',
                password: 'OTCoord@123',
                role: USER_ROLES.ADMIN,
                department: adminDept?._id,
                profile: {
                    firstName: 'Ramesh',
                    lastName: 'Verma',
                    phone: '+91-9876543222',
                    qualification: 'MBA Healthcare',
                },
                isActive: true,
            },
            // OT Nurse / Scrub Nurse
            {
                username: 'nurse.ot.sheela',
                email: 'sheela.ot@hospital-his.com',
                password: 'OTNurse@123',
                role: USER_ROLES.NURSE,
                department: orthoDept?._id || genDept?._id,
                profile: {
                    firstName: 'Sheela',
                    lastName: 'Devi',
                    phone: '+91-9876543223',
                    qualification: 'BSc Nursing, OT Technician Certificate',
                },
                isActive: true,
            },
            // Infection Control Officer
            {
                username: 'infection.control',
                email: 'infection.control@hospital-his.com',
                password: 'Infection@123',
                role: USER_ROLES.COMPLIANCE,
                department: adminDept?._id,
                profile: {
                    firstName: 'Meera',
                    lastName: 'Iyer',
                    phone: '+91-9876543224',
                    qualification: 'MBBS, MD (Microbiology)',
                },
                isActive: true,
            },
            // Assistant Surgeon
            {
                username: 'dr.roy.assistant',
                email: 'dr.roy@hospital-his.com',
                password: 'AssistSurg@123',
                role: USER_ROLES.DOCTOR,
                department: orthoDept?._id || genDept?._id,
                profile: {
                    firstName: 'Arjun',
                    lastName: 'Roy',
                    phone: '+91-9876543225',
                    qualification: 'MBBS, MS (Ortho)',
                    specialization: 'Orthopedics',
                    registrationNumber: 'MCI-78901',
                },
                isActive: true,
            },
        ];

        console.log('📁 Creating OT Users...');

        for (const userData of usersToCreate) {
            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [{ email: userData.email }, { username: userData.username }],
            });

            if (existingUser) {
                console.log(`   ⏭ Skipped ${userData.username} (already exists)`);
            } else {
                await User.create(userData);
                console.log(`   ✓ Created ${userData.username}`);
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ OT Users seeding completed!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('📋 OT Module Login Credentials:');
        console.log('┌────────────────────────┬─────────────────────────┬────────────────┐');
        console.log('│ Role                   │ Username                │ Password       │');
        console.log('├────────────────────────┼─────────────────────────┼────────────────┤');
        console.log('│ Lead Surgeon           │ dr.mehta.surgeon        │ Surgeon@123    │');
        console.log('│ Anesthetist            │ dr.kapoor.anesthesia    │ Anesthesia@123 │');
        console.log('│ OT Coordinator         │ ot.coordinator          │ OTCoord@123    │');
        console.log('│ OT Nurse               │ nurse.ot.sheela         │ OTNurse@123    │');
        console.log('│ Infection Control      │ infection.control       │ Infection@123  │');
        console.log('│ Assistant Surgeon      │ dr.roy.assistant        │ AssistSurg@123 │');
        console.log('└────────────────────────┴─────────────────────────┴────────────────┘');
        console.log('');
        console.log('📋 Existing Users (from main seed):');
        console.log('┌────────────────────────┬─────────────────────────┬────────────────┐');
        console.log('│ Role                   │ Username                │ Password       │');
        console.log('├────────────────────────┼─────────────────────────┼────────────────┤');
        console.log('│ Admin                  │ admin                   │ Admin@123      │');
        console.log('│ Doctor                 │ dr.sharma               │ Doctor@123     │');
        console.log('│ Nurse                  │ nurse.priya             │ Nurse@123      │');
        console.log('│ Receptionist           │ reception.amit          │ Reception@123  │');
        console.log('│ Pharmacist             │ pharma.ravi             │ Pharma@123     │');
        console.log('│ Lab Technician         │ lab.suresh              │ LabTech@123    │');
        console.log('│ Billing                │ billing.neha            │ Billing@123    │');
        console.log('└────────────────────────┴─────────────────────────┴────────────────┘');
        console.log('');
    } catch (error) {
        console.error('');
        console.error('❌ Error seeding OT users:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
        process.exit(0);
    }
};

// Run the seed function
seedOTUsers();
