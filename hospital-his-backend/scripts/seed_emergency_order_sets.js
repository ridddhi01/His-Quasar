
/**
 * Seed script for Emergency Order Sets (Clinical Bundles) - REVISED
 * Usage: node scripts/seed_emergency_order_sets.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/database');
const Medicine = require('../models/Medicine');
const LabTestMaster = require('../models/LabTestMaster');
const RadiologyMaster = require('../models/RadiologyMaster');
const OrderSet = require('../models/OrderSet');
const User = require('../models/User');

// Load env vars
dotenv.config();

// Connect to DB
connectDB();

const seedOrderSets = async () => {
    try {
        console.log('🌱 Seeding REVISED Emergency Order Sets...');

        // Get admin user for createdBy field
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('⚠️ No admin user found. Using placeholder ID.');
            adminUser = { _id: new mongoose.Types.ObjectId() };
        }

        // --- Helper to get real IDs or create placeholders ---

        const getMedId = async (name, details = {}) => {
            const regex = new RegExp(name, 'i');
            let found = await Medicine.findOne({ name: regex });

            if (found) return found._id;

            console.log(`⚠️ Medicine not found: ${name}, creating new entry...`);

            // Generate Code
            const count = await Medicine.countDocuments();
            const code = `MED${String(count + 1).padStart(5, '0')}`;

            const newMed = await Medicine.create({
                medicineCode: code,
                name: details.name || name,
                category: details.category || 'General',
                form: details.form || 'tablet',
                strength: details.strength || 'N/A',
                unit: 'mg',
                mrp: 10,
                sellingPrice: 10,
                ...details
            });

            return newMed._id;
        };

        const getLabId = async (name) => {
            const regex = new RegExp(name, 'i');
            let found = await LabTestMaster.findOne({ testName: regex });
            if (found) return found._id;

            // Create if missing (simplified)
            console.log(`⚠️ Lab Test not found: ${name}, creating...`);
            const newLab = await LabTestMaster.create({
                testCode: `LAB${Date.now().toString().slice(-6)}`,
                testName: name,
                category: 'Hematology', // Default
                // department: ... not required
                price: 500, // Fixed: price instead of cost
                // tat: 2,
                sampleType: 'blood' // Fixed: required field
            });
            return newLab._id;
        };

        const getRadId = async (name) => {
            const regex = new RegExp(name, 'i');
            let found = await RadiologyMaster.findOne({ testName: regex });
            if (found) return found._id;

            console.log(`⚠️ Radiology Test not found: ${name}, creating...`);
            const newRad = await RadiologyMaster.create({
                testCode: `RAD${Date.now().toString().slice(-6)}`,
                testName: name,
                // category: 'X-Ray', // Removed: not in schema
                modality: 'xray', // Fixed: lowercase enum
                price: 1000 // Fixed: price instead of cost
            });
            return newRad._id;
        };

        // --- BUNDLE DEFINITIONS ---
        // Reduced to Trauma (4 levels), Cardiac, Stroke as requested

        // Create items and get IDs dynamically
        const med_Aspirin = await getMedId('Aspirin', { form: 'tablet', strength: '300mg', category: 'Analgesic' });
        const med_Clopidogrel = await getMedId('Clopidogrel', { form: 'tablet', strength: '300mg', category: 'Antiplatelet' });
        const med_Atorvastatin = await getMedId('Atorvastatin', { form: 'tablet', strength: '80mg', category: 'Statin' });
        const med_Tranexamic = await getMedId('Tranexamic Acid', { form: 'injection', strength: '500mg/5ml', category: 'Antifibrinolytic' });
        const med_Tetanus = await getMedId('Tetanus Toxoid', { form: 'injection', strength: '0.5ml', category: 'Vaccine' });
        const med_Paracetamol_Inj = await getMedId('Inj. Paracetamol', { name: 'Paracetamol Injection', form: 'injection', strength: '1g', category: 'Analgesic' });
        const med_Paracetamol_Tab = await getMedId('Tab. Paracetamol', { name: 'Paracetamol Tablet', form: 'tablet', strength: '500mg', category: 'Analgesic' });
        const med_Diclofenac = await getMedId('Diclofenac', { form: 'injection', strength: '75mg', category: 'NSAID' });

        const lab_Trop = await getLabId('Troponin I');
        const lab_CKMB = await getLabId('CK-MB');
        const lab_CBC = await getLabId('Complete Blood Count');
        const lab_Glucose = await getLabId('RBS');
        const lab_Coag = await getLabId('Coagulation Profile');
        const lab_ABG = await getLabId('ABG');
        const lab_Group = await getLabId('Blood Grouping');

        const rad_CXR = await getRadId('Chest X-Ray');
        const rad_CT = await getRadId('CT Brain Plain');
        const rad_CT_Trauma = await getRadId('CT Trauma Series');
        const rad_XRay_Mobile = await getRadId('Portable Chest/Pelvis X-Ray');
        const rad_XRay_Part = await getRadId('X-Ray Affected Part');

        // --- OBSTETRIC MEDS & LABS ---
        const med_Labetalol = await getMedId('Inj. Labetalol', { form: 'injection', strength: '20mg/4ml', category: 'Antihypertensive' });
        const med_Magnesium = await getMedId('Inj. Magnesium Sulfate', { form: 'injection', strength: '50% w/v', category: 'Anticonvulsant' });
        const med_Oxytocin = await getMedId('Inj. Oxytocin', { form: 'injection', strength: '10 IU', category: 'Uterotonic' });

        const lab_UrineDip = await getLabId('Urine Dipstick');
        const lab_LFT = await getLabId('Liver Function Test');

        const rad_USG_Obs = await getRadId('Obstetric Ultrasound');

        const orderSets = [

            // --- CARDIAC ---
            {
                name: 'Acute Coronary Syndrome (ACS) Bundle',
                orderSetCode: 'EM-ACS-001',
                category: 'emergency',
                subCategory: 'cardiac',
                description: 'Standard protocol for suspected MI / ACS. Includes ECG, Troponin, Aspirin.',
                isActive: true,
                investigations: [
                    { test: lab_Trop, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'Troponin I' },
                    { test: lab_CKMB, testType: 'LabTestMaster', priority: 'stat', isRequired: false, testName: 'CK-MB' },
                    { test: lab_CBC, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'Complete Blood Count' },
                    { test: rad_CXR, testType: 'RadiologyMaster', priority: 'stat', isRequired: true, testName: 'Digital X-Ray Chest' },
                ],
                medications: [
                    { medicine: med_Aspirin, medicineName: 'Aspirin', dosage: '300mg', route: 'oral', frequency: 'stat', duration: '1 dose', isRequired: true },
                    { medicine: med_Clopidogrel, medicineName: 'Clopidogrel', dosage: '300mg', route: 'oral', frequency: 'stat', duration: '1 dose', isRequired: true },
                    { medicine: med_Atorvastatin, medicineName: 'Atorvastatin', dosage: '80mg', route: 'oral', frequency: 'stat', duration: '1 dose', isRequired: true },
                ],
                procedures: [
                    { procedureName: '12-Lead ECG', priority: 'stat', isRequired: true },
                    { procedureName: 'IV Cannulation', priority: 'urgent', isRequired: true },
                ]
            },

            // --- STROKE ---
            {
                name: 'Acute Stroke Protocol',
                orderSetCode: 'EM-STR-001',
                category: 'emergency',
                subCategory: 'stroke',
                description: 'Code Stroke protocol for acute neurological deficit < 4.5 hours.',
                isActive: true,
                investigations: [
                    { test: rad_CT, testType: 'RadiologyMaster', priority: 'stat', isRequired: true, testName: 'CT Brain Plain' },
                    { test: lab_Glucose, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'RBS' },
                    { test: lab_Coag, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'Coagulation Profile' },
                ],
                medications: [],
                procedures: [
                    { procedureName: 'NIHSS Assessment', priority: 'stat', isRequired: true },
                    { procedureName: '2 Large Bore IV Lines', priority: 'stat', isRequired: true },
                ]
            },

            // --- TRAUMA LEVEL 1 ---
            {
                name: 'Trauma Level 1 (Severe)',
                orderSetCode: 'EM-TRAUMA-L1',
                category: 'emergency',
                subCategory: 'trauma',
                description: 'Full trauma team activation. Unstable vitals, GCS < 8, major injuries.',
                isActive: true,
                investigations: [
                    { test: rad_CT_Trauma, testType: 'RadiologyMaster', priority: 'stat', isRequired: true, testName: 'CT Trauma Series' },
                    { test: rad_XRay_Mobile, testType: 'RadiologyMaster', priority: 'stat', isRequired: true, testName: 'Portable Chest/Pelvis X-Ray' },
                    { test: lab_ABG, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'ABG' },
                    { test: lab_CBC, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'CBC' },
                    { test: lab_Group, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'Blood Grouping' },
                ],
                medications: [
                    { medicine: med_Tranexamic, medicineName: 'Tranexamic Acid', dosage: '1g', route: 'iv', frequency: 'stat', duration: '1 dose', isRequired: true },
                    { medicine: med_Tetanus, medicineName: 'Tetanus Toxoid', dosage: '0.5ml', route: 'im', frequency: 'stat', duration: '1 dose', isRequired: true },
                ],
                procedures: [
                    { procedureName: 'Trauma Team Activation', priority: 'stat', isRequired: true },
                    { procedureName: 'Fast Scan (eFAST)', priority: 'stat', isRequired: true },
                ]
            },

            // --- OBSTETRIC ---
            {
                name: 'Obstetric Emergency Bundle',
                orderSetCode: 'EM-OBS-001',
                category: 'emergency',
                subCategory: 'obstetric',
                description: 'Protocol for Pre-eclampsia, Eclampsia, or Obstetric Hemorrhage.',
                isActive: true,
                investigations: [
                    { test: lab_CBC, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'CBC' },
                    { test: lab_UrineDip, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'Urine Dipstick' },
                    { test: lab_LFT, testType: 'LabTestMaster', priority: 'stat', isRequired: true, testName: 'Liver Function Test' },
                    { test: rad_USG_Obs, testType: 'RadiologyMaster', priority: 'urgent', isRequired: true, testName: 'Obstetric Ultrasound' },
                ],
                medications: [
                    { medicine: med_Labetalol, medicineName: 'Inj. Labetalol', dosage: '20mg', route: 'iv', frequency: 'stat', duration: '1 dose', isRequired: false },
                    { medicine: med_Magnesium, medicineName: 'Inj. Magnesium Sulfate', dosage: '4g', route: 'iv', frequency: 'stat', duration: 'Loading Dose', isRequired: false },
                    { medicine: med_Oxytocin, medicineName: 'Inj. Oxytocin', dosage: '10 IU', route: 'im', frequency: 'stat', duration: '1 dose', isRequired: false },
                ],
                procedures: [
                    { procedureName: 'Fetal Heart Rate Monitoring', priority: 'stat', isRequired: true },
                    { procedureName: 'IV Access (Large Bore)', priority: 'stat', isRequired: true },
                ]
            }
        ];

        // Delete existing emergency bundles
        await OrderSet.deleteMany({ category: 'emergency' });

        // Add createdBy to all bundles
        const bundlesToInsert = orderSets.map(bundle => ({
            ...bundle,
            createdBy: adminUser._id
        }));

        // Insert new bundles
        await OrderSet.insertMany(bundlesToInsert);

        console.log(`✅ Successfully seeded ${orderSets.length} Revised Emergency Order Sets.`);
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding order sets:', JSON.stringify(error, null, 2));
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`- ${key}: ${error.errors[key].message}`);
            });
        }
        process.exit(1);
    }
};

seedOrderSets();
