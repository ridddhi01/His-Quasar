/**
 * Migration Script: Assign Users to Departments
 * 
 * This script:
 * 1. Associates all staff members with their respective departments
 * 2. Sets department heads based on employee designation/role
 * 3. Ensures consistency between User.department and Staff.department
 * 
 * Run with: node scripts/assignUsersToDepartments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Staff = require('../models/Staff');
const { USER_ROLES } = require('../config/constants');

const DB_URL = process.env.MONGODB_URI || process.env.DB_URL;

// Mapping of designations that should be department heads
const DEPARTMENT_HEAD_DESIGNATIONS = [
    'head',
    'head of department',
    'hod',
    'director',
    'chief',
    'superintendent',
    'senior consultant',
];

// Mapping of roles to typical department assignments
// This helps auto-assign roles when Staff record doesn't have explicit department
const ROLE_DEPARTMENT_MAPPING = {
    [USER_ROLES.DOCTOR]: 'OPD', // General doctors go to OPD
    [USER_ROLES.NURSE]: 'Nursing', // Nurses go to Nursing department
    [USER_ROLES.HEAD_NURSE]: 'Nursing',
    [USER_ROLES.LAB_TECH]: 'Laboratory', // Lab tech to Lab
    [USER_ROLES.RADIOLOGIST]: 'Radiology',
    [USER_ROLES.PHARMACIST]: 'Pharmacy',
    [USER_ROLES.RECEPTIONIST]: 'Administration', // Receptionists to Admin
    [USER_ROLES.BILLING]: 'Finance', // Billing to Finance
    [USER_ROLES.INSURANCE]: 'Finance',
    [USER_ROLES.INVENTORY_MANAGER]: 'Inventory',
    [USER_ROLES.CODER]: 'Medical Coding',
    [USER_ROLES.SENIOR_CODER]: 'Medical Coding',
};

/**
 * Connect to database
 */
async function connectDB() {
    try {
        await mongoose.connect(DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Check if a designation indicates a department head
 */
function isHeadDesignation(designation) {
    if (!designation) return false;
    const lowerDesignation = designation.toLowerCase();
    return DEPARTMENT_HEAD_DESIGNATIONS.some(head => lowerDesignation.includes(head));
}

/**
 * Find or create a default department for a role
 */
async function findDepartmentByRole(role) {
    const deptName = ROLE_DEPARTMENT_MAPPING[role];
    if (!deptName) return null;

    let dept = await Department.findOne({ 
        $or: [
            { name: new RegExp(deptName, 'i') },
            { departmentCode: new RegExp(deptName, 'i') }
        ]
    });

    return dept;
}

/**
 * Assign users to departments based on Staff records
 */
async function assignUsersToDepartments() {
    try {
        console.log('\n🔄 Starting User-to-Department Assignment...\n');

        // Step 1: Process all Staff records
        console.log('Step 1: Processing Staff records...');
        const staffRecords = await Staff.find()
            .populate('user')
            .populate('department')
            .populate('reportingTo');

        let staffProcessed = 0;
        let staffUpdated = 0;

        for (const staff of staffRecords) {
            if (!staff.user) continue;

            let departmentId = staff.department?._id;

            // If staff doesn't have a department assigned, try to find one based on role
            if (!departmentId && staff.user.role) {
                const roleDept = await findDepartmentByRole(staff.user.role);
                if (roleDept) {
                    departmentId = roleDept._id;
                }
            }

            // Update User's department field if Staff has a department
            if (departmentId && (!staff.user.department || staff.user.department.toString() !== departmentId.toString())) {
                await User.findByIdAndUpdate(
                    staff.user._id,
                    { department: departmentId },
                    { new: true }
                );
                staffUpdated++;
            }

            staffProcessed++;
        }

        console.log(`✓ Processed ${staffProcessed} Staff records, updated ${staffUpdated} users\n`);

        // Step 2: Assign department heads based on designation
        console.log('Step 2: Assigning Department Heads...');
        let headsAssigned = 0;

        const staffWithHeadDesignation = await Staff.find({
            designation: new RegExp(DEPARTMENT_HEAD_DESIGNATIONS.join('|'), 'i')
        }).populate('user').populate('department');

        for (const staff of staffWithHeadDesignation) {
            if (!staff.user || !staff.department) continue;

            const dept = await Department.findById(staff.department._id);
            if (!dept) continue;

            // Only update if head not already set or needs updating
            if (!dept.head || dept.head.toString() !== staff.user._id.toString()) {
                await Department.findByIdAndUpdate(
                    dept._id,
                    { head: staff.user._id },
                    { new: true }
                );
                headsAssigned++;
                console.log(`  • ${dept.name}: ${staff.user.profile.firstName} ${staff.user.profile.lastName}`);
            }
        }

        console.log(`\n✓ Department heads assigned: ${headsAssigned}\n`);

        // Step 3: Assign users without department based on their role
        console.log('Step 3: Assigning unassigned users by role...');
        const unassignedUsers = await User.find({ 
            department: { $exists: false },
            role: { $ne: USER_ROLES.ADMIN }
        });

        let roleBasedAssigned = 0;

        for (const user of unassignedUsers) {
            const dept = await findDepartmentByRole(user.role);
            if (dept) {
                await User.findByIdAndUpdate(
                    user._id,
                    { department: dept._id },
                    { new: true }
                );
                roleBasedAssigned++;
                console.log(`  • ${user.profile.firstName} ${user.profile.lastName} (${user.role}) → ${dept.name}`);
            }
        }

        console.log(`\n✓ Role-based assignments: ${roleBasedAssigned}\n`);

        // Step 4: Summary report
        console.log('Step 4: Generating Summary Report...');
        const departments = await Department.find({ isActive: true })
            .populate('head', 'profile.firstName profile.lastName');

        let totalStaffAssigned = 0;

        console.log('\n📊 Department Summary:');
        console.log('─'.repeat(60));

        for (const dept of departments) {
            const staffInDept = await User.countDocuments({ 
                department: dept._id,
                isActive: true
            });
            totalStaffAssigned += staffInDept;

            const headName = dept.head 
                ? `${dept.head.profile.firstName} ${dept.head.profile.lastName}`
                : 'Not Assigned';

            console.log(`${dept.name.padEnd(30)} | Head: ${headName.padEnd(20)} | Staff: ${staffInDept}`);
        }

        console.log('─'.repeat(60));

        const adminUsers = await User.countDocuments({ role: USER_ROLES.ADMIN });
        const unassignedCount = await User.countDocuments({ 
            department: { $exists: false },
            isActive: true
        });

        console.log(`\n✓ Total Staff Assigned: ${totalStaffAssigned}`);
        console.log(`✓ Admin Users (no dept): ${adminUsers}`);
        console.log(`⚠ Unassigned Users: ${unassignedCount}\n`);

    } catch (error) {
        console.error('✗ Error during assignment:', error.message);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    await connectDB();

    try {
        await assignUsersToDepartments();
        console.log('✅ User-to-Department assignment completed successfully!\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    }
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
