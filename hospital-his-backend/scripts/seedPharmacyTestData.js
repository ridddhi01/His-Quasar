/**
 * Pharmacy Test Data Seeder
 * 
 * Run with: node scripts/seedPharmacyTestData.js
 * 
 * Creates test data for pharmacy flow testing:
 * - Patients with allergies
 * - Medicines with inventory batches
 * - Drug interactions
 * - Test prescriptions (pending dispense)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const PharmacyInventory = require('../models/PharmacyInventory');
const DrugInteraction = require('../models/DrugInteraction');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Department = require('../models/Department');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital';

async function seed() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB\n');

        // 1. Create/Find Department
        console.log('📁 Setting up department...');
        let dept = await Department.findOne({ departmentCode: 'GEN' });
        if (!dept) {
            dept = await Department.create({
                name: 'General Medicine',
                departmentCode: 'GEN',
                type: 'clinical',
                description: 'General outpatient care',
                isActive: true
            });
            console.log('   Created department: General Medicine');
        } else {
            console.log('   Found existing: General Medicine');
        }

        // 2. Create/Find Doctor User
        console.log('👨‍⚕️ Setting up doctor...');
        let doctor = await User.findOne({ email: 'doctor@test.com' });
        if (!doctor) {
            doctor = await User.create({
                username: 'doctor_test',
                email: 'doctor@test.com',
                password: 'password123',
                role: 'doctor',
                department: dept._id,
                profile: {
                    firstName: 'John',
                    lastName: 'Smith',
                    phone: '9876543210',
                    specialization: 'General Physician'
                },
                isActive: true
            });
            console.log('   Created doctor: Dr. John Smith (doctor@test.com / password123)');
        } else {
            console.log('   Found existing: doctor@test.com');
        }

        // 3. Create/Find Pharmacist User
        console.log('💊 Setting up pharmacist...');
        let pharmacist = await User.findOne({ email: 'pharmacist@test.com' });
        if (!pharmacist) {
            pharmacist = await User.create({
                username: 'pharmacist_test',
                email: 'pharmacist@test.com',
                password: 'password123',
                role: 'pharmacist',
                profile: {
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    phone: '9876543211'
                },
                isActive: true
            });
            console.log('   Created pharmacist: Sarah Johnson (pharmacist@test.com / password123)');
        } else {
            console.log('   Found existing: pharmacist@test.com');
        }

        // 4. Create Medicines
        console.log('💊 Setting up medicines...');
        const medicinesData = [
            { name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic', form: 'tablet', strength: '500mg', mrp: 10, sellingPrice: 10, medicineCode: 'PCM500' },
            { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', form: 'capsule', strength: '500mg', mrp: 25, sellingPrice: 25, medicineCode: 'AMX500' },
            { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID', form: 'tablet', strength: '400mg', mrp: 15, sellingPrice: 15, medicineCode: 'IBU400' },
            { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'PPI', form: 'capsule', strength: '20mg', mrp: 20, sellingPrice: 20, medicineCode: 'OMP20' },
            { name: 'Warfarin 5mg', genericName: 'Warfarin', category: 'Anticoagulant', form: 'tablet', strength: '5mg', mrp: 30, sellingPrice: 30, medicineCode: 'WAR5', contraindications: 'Active bleeding, Pregnancy' },
            { name: 'Aspirin 75mg', genericName: 'Aspirin', category: 'Antiplatelet', form: 'tablet', strength: '75mg', mrp: 8, sellingPrice: 8, medicineCode: 'ASP75' },
        ];

        const medicines = {};
        for (const med of medicinesData) {
            let medicine = await Medicine.findOne({ medicineCode: med.medicineCode });
            if (!medicine) {
                medicine = await Medicine.create(med);
                console.log(`   Created: ${med.name}`);
            }
            medicines[med.medicineCode] = medicine;
        }

        // 5. Create Inventory Batches
        console.log('📦 Setting up inventory batches...');
        const batchesData = [
            { medicineCode: 'PCM500', batchNumber: 'PCM-2026-001', quantity: 500, expiryDate: new Date('2027-06-30'), purchaseRate: 5, sellingRate: 10 },
            { medicineCode: 'PCM500', batchNumber: 'PCM-2026-002', quantity: 200, expiryDate: new Date('2026-03-15'), purchaseRate: 5, sellingRate: 10 }, // Expiring soon
            { medicineCode: 'AMX500', batchNumber: 'AMX-2026-001', quantity: 300, expiryDate: new Date('2027-12-31'), purchaseRate: 12, sellingRate: 25 },
            { medicineCode: 'IBU400', batchNumber: 'IBU-2026-001', quantity: 400, expiryDate: new Date('2027-09-30'), purchaseRate: 8, sellingRate: 15 },
            { medicineCode: 'OMP20', batchNumber: 'OMP-2026-001', quantity: 250, expiryDate: new Date('2027-08-31'), purchaseRate: 10, sellingRate: 20 },
            { medicineCode: 'WAR5', batchNumber: 'WAR-2026-001', quantity: 100, expiryDate: new Date('2027-05-31'), purchaseRate: 15, sellingRate: 30 },
            { medicineCode: 'ASP75', batchNumber: 'ASP-2026-001', quantity: 600, expiryDate: new Date('2027-11-30'), purchaseRate: 4, sellingRate: 8 },
        ];

        for (const batch of batchesData) {
            const medicine = medicines[batch.medicineCode];
            const existing = await PharmacyInventory.findOne({ batchNumber: batch.batchNumber });
            if (!existing) {
                await PharmacyInventory.create({
                    medicine: medicine._id,
                    batchNumber: batch.batchNumber,
                    quantity: batch.quantity,
                    expiryDate: batch.expiryDate,
                    purchaseRate: batch.purchaseRate,
                    sellingRate: batch.sellingRate,
                    supplier: 'Test Pharma Ltd',
                    invoiceNumber: `INV-${Date.now()}`,
                    grnNumber: `GRN-${Date.now()}`,
                    grnDate: new Date(),
                    status: 'available'
                });
                console.log(`   Created batch: ${batch.batchNumber}`);
            }
        }

        // 6. Create Drug Interactions
        console.log('⚠️ Setting up drug interactions...');
        const warfarin = medicines['WAR5'];
        const aspirin = medicines['ASP75'];
        const ibuprofen = medicines['IBU400'];

        const interactionsData = [
            {
                drug1: warfarin._id,
                drug2: aspirin._id,
                severity: 'major',
                description: 'Increased risk of bleeding when used together',
                clinicalEffect: 'Enhanced anticoagulant effect leading to potential hemorrhage',
                recommendation: 'Avoid combination unless specifically indicated',
                isActive: true
            },
            {
                drug1: warfarin._id,
                drug2: ibuprofen._id,
                severity: 'major',
                description: 'NSAIDs increase risk of GI bleeding with anticoagulants',
                clinicalEffect: 'Increased bleeding risk, potential GI hemorrhage',
                recommendation: 'Use acetaminophen for pain instead',
                isActive: true
            }
        ];

        for (const interaction of interactionsData) {
            const existing = await DrugInteraction.findOne({
                $or: [
                    { drug1: interaction.drug1, drug2: interaction.drug2 },
                    { drug1: interaction.drug2, drug2: interaction.drug1 }
                ]
            });
            if (!existing) {
                await DrugInteraction.create(interaction);
                console.log(`   Created interaction: Warfarin ↔ ${interaction.drug2.equals(aspirin._id) ? 'Aspirin' : 'Ibuprofen'}`);
            }
        }

        // 7. Create Test Patients
        console.log('👤 Setting up patients...');
        const patientsData = [
            {
                patientId: 'P2026001',
                firstName: 'Raj',
                lastName: 'Kumar',
                dateOfBirth: new Date('1985-05-15'),
                gender: 'Male',
                phone: '9876500001',
                email: 'raj.kumar@test.com',
                address: { street: '123 Main St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
                bloodGroup: 'B+',
                allergies: [] // No allergies
            },
            {
                patientId: 'P2026002',
                firstName: 'Priya',
                lastName: 'Sharma',
                dateOfBirth: new Date('1990-08-22'),
                gender: 'Female',
                phone: '9876500002',
                email: 'priya.sharma@test.com',
                address: { street: '456 Park Ave', city: 'Delhi', state: 'Delhi', pincode: '110001' },
                bloodGroup: 'A+',
                allergies: ['Penicillin', 'Amoxicillin'] // Has antibiotic allergy!
            },
            {
                patientId: 'P2026003',
                firstName: 'Amit',
                lastName: 'Patel',
                dateOfBirth: new Date('1975-12-10'),
                gender: 'Male',
                phone: '9876500003',
                email: 'amit.patel@test.com',
                address: { street: '789 Lake Rd', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
                bloodGroup: 'O+',
                allergies: ['Aspirin'] // Aspirin allergy for testing
            }
        ];

        const patients = {};
        for (const pat of patientsData) {
            let patient = await Patient.findOne({ patientId: pat.patientId });
            if (!patient) {
                patient = await Patient.create(pat);
                console.log(`   Created patient: ${pat.firstName} ${pat.lastName} (${pat.patientId})`);
                if (pat.allergies.length > 0) {
                    console.log(`      ⚠️ Allergies: ${pat.allergies.join(', ')}`);
                }
            }
            patients[pat.patientId] = patient;
        }

        // 8. Create Appointments
        console.log('📅 Setting up appointments...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const appointmentsData = [
            { patient: patients['P2026001'], tokenNumber: 101 },
            { patient: patients['P2026002'], tokenNumber: 102 },
            { patient: patients['P2026003'], tokenNumber: 103 },
        ];

        const appointments = [];
        for (const apt of appointmentsData) {
            let existing = await Appointment.findOne({
                patient: apt.patient._id,
                status: 'completed',
                scheduledDate: { $gte: today }
            });
            if (!existing) {
                existing = await Appointment.create({
                    patient: apt.patient._id,
                    doctor: doctor._id,
                    department: dept._id,
                    scheduledDate: new Date(),
                    scheduledTime: '10:00',
                    tokenNumber: apt.tokenNumber,
                    status: 'completed',
                    chiefComplaint: 'General checkup and medication refill',
                    createdBy: doctor._id
                });
                console.log(`   Created appointment: Token #${apt.tokenNumber} for ${apt.patient.firstName}`);
            }
            appointments.push(existing);
        }

        // 9. Create Prescriptions (Pending Dispense)
        console.log('📋 Setting up prescriptions...');

        // Prescription 1: Normal case (no issues)
        const rx1 = await Prescription.findOne({ patient: patients['P2026001']._id, isDispensed: false });
        if (!rx1) {
            await Prescription.create({
                prescriptionNumber: `RX${Date.now()}001`,
                patient: patients['P2026001']._id,
                doctor: doctor._id,
                visit: appointments[0]._id,
                visitModel: 'Appointment',
                medicines: [
                    { medicine: medicines['PCM500']._id, dosage: '500mg', frequency: 'thrice daily', duration: '5 days', quantity: 15, instructions: 'After food' },
                    { medicine: medicines['OMP20']._id, dosage: '20mg', frequency: 'once daily', duration: '14 days', quantity: 14, instructions: 'Before breakfast' }
                ],
                isDispensed: false
            });
            console.log('   ✅ Created Rx #1: Raj Kumar - Paracetamol + Omeprazole (No issues)');
        }

        // Prescription 2: Has allergy conflict (Amoxicillin for Penicillin-allergic patient)
        const rx2 = await Prescription.findOne({ patient: patients['P2026002']._id, isDispensed: false });
        if (!rx2) {
            await Prescription.create({
                prescriptionNumber: `RX${Date.now()}002`,
                patient: patients['P2026002']._id,
                doctor: doctor._id,
                visit: appointments[1]._id,
                visitModel: 'Appointment',
                medicines: [
                    { medicine: medicines['AMX500']._id, dosage: '500mg', frequency: 'thrice daily', duration: '7 days', quantity: 21, instructions: 'After food' },
                    { medicine: medicines['PCM500']._id, dosage: '500mg', frequency: 'as needed', duration: '5 days', quantity: 10, instructions: 'For fever' }
                ],
                isDispensed: false
            });
            console.log('   ⚠️ Created Rx #2: Priya Sharma - Amoxicillin (ALLERGY TO PENICILLIN!)');
        }

        // Prescription 3: Has drug interaction (Warfarin + Aspirin)
        const rx3 = await Prescription.findOne({ patient: patients['P2026003']._id, isDispensed: false });
        if (!rx3) {
            await Prescription.create({
                prescriptionNumber: `RX${Date.now()}003`,
                patient: patients['P2026003']._id,
                doctor: doctor._id,
                visit: appointments[2]._id,
                visitModel: 'Appointment',
                medicines: [
                    { medicine: medicines['WAR5']._id, dosage: '5mg', frequency: 'once daily', duration: '30 days', quantity: 30, instructions: 'Evening dose' },
                    { medicine: medicines['ASP75']._id, dosage: '75mg', frequency: 'once daily', duration: '30 days', quantity: 30, instructions: 'Morning dose' }
                ],
                isDispensed: false
            });
            console.log('   ⚠️ Created Rx #3: Amit Patel - Warfarin + Aspirin (MAJOR INTERACTION!)');
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ SEEDING COMPLETE!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n📌 Test Accounts:');
        console.log('   Doctor:     doctor@test.com / password123');
        console.log('   Pharmacist: pharmacist@test.com / password123');
        console.log('\n📌 Test Scenarios:');
        console.log('   Rx #1: Normal dispense (no safety issues)');
        console.log('   Rx #2: Allergy conflict (Penicillin allergy → Amoxicillin)');
        console.log('   Rx #3: Drug interaction (Warfarin + Aspirin = bleeding risk)');
        console.log('\n📌 Go to: http://localhost:5173/dashboard/pharmacy');
        console.log('═══════════════════════════════════════════════════════\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
}

seed();
