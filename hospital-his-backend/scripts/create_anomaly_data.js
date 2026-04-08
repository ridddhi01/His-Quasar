require('dotenv').config();
const mongoose = require('mongoose');
const LabTest = require('../models/LabTest');
const LabTestMaster = require('../models/LabTestMaster');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Department = require('../models/Department');

const config = require('../config/config');

const run = async () => {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('🔌 Connected to DB');

        // 1. Find Patient
        let patient = await Patient.findOne();
        if (!patient) {
            console.log('No patient found, creating dummy patient...');
            patient = await Patient.create({
                firstName: 'Test',
                lastName: 'Patient',
                dateOfBirth: new Date('1990-01-01'),
                gender: 'male',
                contactNumber: '9999999999',
                address: { street: '123 Test St', city: 'Test City', state: 'TS', zipCode: '123456' },
                mrn: 'MRN-TEST-001'
            });
        }

        // 2. Find Doctor
        let doctor = await User.findOne({ role: 'doctor' });
        if (!doctor) {
            const admin = await User.findOne({ role: 'admin' });
            doctor = admin; // Fallback
        }

        // 3. Find Lab Test Master
        const labMaster = await LabTestMaster.findOne();
        if (!labMaster) throw new Error('No Lab Test Master data found. Run seed first.');

        // 4. Create Dummy Visit (Appointment)
        // 4. Find or Create Dummy Visit (Appointment)
        let appointment = await Appointment.findOne({ patient: patient._id });

        if (!appointment) {
            const dept = await Department.findOne();
            try {
                appointment = await Appointment.create({
                    patient: patient._id,
                    doctor: doctor._id,
                    department: doctor.department || dept._id,
                    scheduledDate: new Date(),
                    status: 'completed',
                    type: 'follow-up',
                    createdBy: doctor._id
                });
            } catch (e) {
                // If fails, grab any appointment
                console.log('Using existing appointment fallback...');
                appointment = await Appointment.findOne();
            }
        }

        // 5. Create UNBILLED Lab Test
        const unbilledLab = await LabTest.create({
            patient: patient._id,
            visit: appointment._id,
            visitModel: 'Appointment',
            orderedBy: doctor._id,
            test: labMaster._id,
            status: 'completed',
            isBilled: false, // Explicitly unbilled
            results: [{ parameter: 'Hemoglobin', value: '12', unit: 'g/dL' }],
            performedBy: doctor._id,
            completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        });

        console.log(`✅ Created UNBILLED Lab Test ID: ${unbilledLab._id}`);
        console.log(`   Patient: ${patient.firstName} ${patient.lastName}`);
        console.log(`   Test: ${labMaster.testName}`);
        console.log('');
        console.log('👉 Now go to Admin Dasboard > Revenue Anomalies and click "Run AI Scan".');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.errors) console.error(err.errors);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected');
    }
};

run();
