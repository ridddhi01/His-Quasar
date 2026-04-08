/**
 * Seed Script: Assign Department Heads
 * This script assigns existing users as heads of their respective departments
 * 
 * Run: node scripts/seed_department_heads.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const config = require('../config/config');

// Mapping of department codes to the username of their head
const DEPARTMENT_HEAD_MAPPING = [
    { deptCode: 'DEPT-GEN', headUsername: 'dr.sharma' },           // General Medicine → Dr. Sharma
    { deptCode: 'DEPT-LAB', headUsername: 'lab.suresh' },          // Laboratory → Lab Tech Suresh
    { deptCode: 'DEPT-PHAR', headUsername: 'pharma.ravi' },        // Pharmacy → Pharmacist Ravi
    { deptCode: 'DEPT-RAD', headUsername: 'radiology.deepa' },     // Radiology → Radiologist Deepa
    { deptCode: 'DEPT-ADMN', headUsername: 'admin' },              // Administration → Admin
    { deptCode: 'DEPT-CARD', headUsername: 'dr.mehta.surgeon' },   // Cardiology → Dr. Mehta
    { deptCode: 'DEPT-ORTH', headUsername: 'dr.mehta.surgeon' },   // Orthopedics → Dr. Mehta
    { deptCode: 'DEPT-EMRG', headUsername: 'dr.sharma' },          // Emergency → Dr. Sharma
];

const seedDepartmentHeads = async () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          ASSIGN DEPARTMENT HEADS                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri);
        console.log(`   ✓ Connected to: ${mongoose.connection.host}`);
        console.log('');

        console.log('📁 Assigning Department Heads...');

        for (const mapping of DEPARTMENT_HEAD_MAPPING) {
            const dept = await Department.findOne({ departmentCode: mapping.deptCode });
            if (!dept) {
                console.log(`   ⏭ Department ${mapping.deptCode} not found, skipping`);
                continue;
            }

            const headUser = await User.findOne({ username: mapping.headUsername });
            if (!headUser) {
                console.log(`   ⏭ User ${mapping.headUsername} not found, skipping ${mapping.deptCode}`);
                continue;
            }

            // Update department with head
            dept.head = headUser._id;
            await dept.save();

            console.log(`   ✓ ${dept.name} → ${headUser.profile.firstName} ${headUser.profile.lastName} (${mapping.headUsername})`);
        }

        // Also assign Head Nurse to the department she's in (General Medicine by default)
        const headNurse = await User.findOne({ username: 'head.nurse' });
        if (headNurse && headNurse.department) {
            // Head Nurse doesn't become dept head but should be a reviewer
            // We'll handle this via role-based access in the controller
            console.log(`   ℹ Head Nurse (Maria Fernandez) is in department with ID: ${headNurse.department}`);
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Department heads assigned successfully!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('📋 Department Head Assignments:');
        console.log('┌──────────────────────────┬────────────────────────────────────┐');
        console.log('│ Department               │ Head                               │');
        console.log('├──────────────────────────┼────────────────────────────────────┤');

        const allDepts = await Department.find({}).populate('head', 'profile.firstName profile.lastName username');
        for (const dept of allDepts) {
            const headName = dept.head
                ? `${dept.head.profile.firstName} ${dept.head.profile.lastName}`
                : '(No head assigned)';
            console.log(`│ ${dept.name.padEnd(24)} │ ${headName.padEnd(34)} │`);
        }
        console.log('└──────────────────────────┴────────────────────────────────────┘');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Error assigning department heads:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
        process.exit(0);
    }
};

seedDepartmentHeads();
