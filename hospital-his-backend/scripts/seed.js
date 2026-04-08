/**
 * Database Seed Script
 * Populates MongoDB with initial master data for Hospital Information System
 *
 * Run: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import Models
const User = require('../models/User');
const Department = require('../models/Department');
const Ward = require('../models/Ward');
const Bed = require('../models/Bed');
const Medicine = require('../models/Medicine');
const LabTestMaster = require('../models/LabTestMaster');
const RadiologyMaster = require('../models/RadiologyMaster');
const TariffCategory = require('../models/TariffCategory');
const InsuranceProvider = require('../models/InsuranceProvider');

// Import Constants
const { USER_ROLES, BED_STATUS, BED_TYPES } = require('../config/constants');

// Configuration
const config = require('../config/config');

// ============================================
// SEED DATA
// ============================================

// Departments Data
const departmentsData = [
    {
        departmentCode: 'DEPT-GEN',
        name: 'General Medicine',
        type: 'clinical',
        location: { building: 'Main', floor: 'Ground', wing: 'A' },
        contactNumber: '1001',
        operatingHours: { start: '08:00', end: '20:00' },
        isEmergencyAvailable: true,
        consultationFee: 500,
        followupFee: 300,
        description: 'General Medicine and Internal Medicine department',
    },
    {
        departmentCode: 'DEPT-CARD',
        name: 'Cardiology',
        type: 'clinical',
        location: { building: 'Main', floor: '2nd', wing: 'B' },
        contactNumber: '1002',
        operatingHours: { start: '09:00', end: '18:00' },
        isEmergencyAvailable: true,
        consultationFee: 1000,
        followupFee: 500,
        description: 'Heart and cardiovascular system specialists',
    },
    {
        departmentCode: 'DEPT-ORTH',
        name: 'Orthopedics',
        type: 'clinical',
        location: { building: 'Main', floor: '1st', wing: 'C' },
        contactNumber: '1003',
        operatingHours: { start: '09:00', end: '17:00' },
        isEmergencyAvailable: true,
        consultationFee: 800,
        followupFee: 400,
        description: 'Bone, joint, and musculoskeletal disorders',
    },
    {
        departmentCode: 'DEPT-PEDS',
        name: 'Pediatrics',
        type: 'clinical',
        location: { building: 'Main', floor: '1st', wing: 'A' },
        contactNumber: '1004',
        operatingHours: { start: '08:00', end: '20:00' },
        isEmergencyAvailable: true,
        consultationFee: 600,
        followupFee: 300,
        description: 'Child healthcare and pediatric services',
    },
    {
        departmentCode: 'DEPT-GYNO',
        name: 'Obstetrics & Gynecology',
        type: 'clinical',
        location: { building: 'Main', floor: '3rd', wing: 'A' },
        contactNumber: '1005',
        operatingHours: { start: '09:00', end: '18:00' },
        isEmergencyAvailable: true,
        consultationFee: 700,
        followupFee: 350,
        description: 'Women\'s health and maternity care',
    },
    {
        departmentCode: 'DEPT-NEUR',
        name: 'Neurology',
        type: 'clinical',
        location: { building: 'Main', floor: '2nd', wing: 'A' },
        contactNumber: '1006',
        operatingHours: { start: '09:00', end: '17:00' },
        isEmergencyAvailable: false,
        consultationFee: 1200,
        followupFee: 600,
        description: 'Brain and nervous system disorders',
    },
    {
        departmentCode: 'DEPT-DERM',
        name: 'Dermatology',
        type: 'clinical',
        location: { building: 'Main', floor: 'Ground', wing: 'B' },
        contactNumber: '1007',
        operatingHours: { start: '09:00', end: '16:00' },
        isEmergencyAvailable: false,
        consultationFee: 600,
        followupFee: 300,
        description: 'Skin, hair, and nail disorders',
    },
    {
        departmentCode: 'DEPT-ENT',
        name: 'ENT (Ear, Nose, Throat)',
        type: 'clinical',
        location: { building: 'Main', floor: '1st', wing: 'B' },
        contactNumber: '1008',
        operatingHours: { start: '09:00', end: '17:00' },
        isEmergencyAvailable: false,
        consultationFee: 600,
        followupFee: 300,
        description: 'Ear, Nose, and Throat specialist',
    },
    {
        departmentCode: 'DEPT-EMRG',
        name: 'Emergency',
        type: 'clinical',
        location: { building: 'Main', floor: 'Ground', wing: 'Emergency' },
        contactNumber: '1111',
        operatingHours: { start: '00:00', end: '23:59' },
        isEmergencyAvailable: true,
        consultationFee: 1000,
        followupFee: 500,
        description: '24x7 Emergency and Trauma care',
    },
    {
        departmentCode: 'DEPT-LAB',
        name: 'Laboratory',
        type: 'diagnostic',
        location: { building: 'Diagnostic', floor: 'Ground', wing: 'A' },
        contactNumber: '2001',
        operatingHours: { start: '07:00', end: '22:00' },
        isEmergencyAvailable: true,
        description: 'Clinical Laboratory and Pathology services',
    },
    {
        departmentCode: 'DEPT-RAD',
        name: 'Radiology',
        type: 'diagnostic',
        location: { building: 'Diagnostic', floor: 'Ground', wing: 'B' },
        contactNumber: '2002',
        operatingHours: { start: '08:00', end: '20:00' },
        isEmergencyAvailable: true,
        description: 'X-Ray, CT, MRI, and Ultrasound services',
    },
    {
        departmentCode: 'DEPT-PHAR',
        name: 'Pharmacy',
        type: 'support',
        location: { building: 'Main', floor: 'Ground', wing: 'C' },
        contactNumber: '3001',
        operatingHours: { start: '07:00', end: '22:00' },
        isEmergencyAvailable: true,
        description: 'In-house pharmacy and dispensary',
    },
    {
        departmentCode: 'DEPT-ADMN',
        name: 'Administration',
        type: 'administrative',
        location: { building: 'Admin', floor: '1st', wing: 'A' },
        contactNumber: '4001',
        operatingHours: { start: '09:00', end: '18:00' },
        isEmergencyAvailable: false,
        description: 'Hospital administration and management',
    },
];

// Tariff Categories Data
const tariffCategoriesData = [
    { categoryCode: 'TC-OPD', name: 'OPD Services', description: 'Outpatient department services', sortOrder: 1 },
    { categoryCode: 'TC-IPD', name: 'IPD Services', description: 'Inpatient department services', sortOrder: 2 },
    { categoryCode: 'TC-LAB', name: 'Laboratory', description: 'Pathology and lab tests', sortOrder: 3 },
    { categoryCode: 'TC-RAD', name: 'Radiology', description: 'Imaging and radiology services', sortOrder: 4 },
    { categoryCode: 'TC-SURG', name: 'Surgery', description: 'Operation theater and surgical procedures', sortOrder: 5 },
    { categoryCode: 'TC-PHAR', name: 'Pharmacy', description: 'Medicines and drugs', sortOrder: 6 },
    { categoryCode: 'TC-CONS', name: 'Consultation', description: 'Doctor consultation fees', sortOrder: 7 },
    { categoryCode: 'TC-PROC', name: 'Procedures', description: 'Medical procedures', sortOrder: 8 },
    { categoryCode: 'TC-EMRG', name: 'Emergency', description: 'Emergency related charges', sortOrder: 9 },
    { categoryCode: 'TC-MISC', name: 'Miscellaneous', description: 'Other services', sortOrder: 10 },
];

// Insurance Providers Data
const insuranceProvidersData = [
    {
        providerCode: 'INS-STAR',
        name: 'Star Health Insurance',
        type: 'private',
        contactPerson: 'Insurance Desk',
        phone: '+91-1800-425-2255',
        email: 'claims@starhealth.in',
        website: 'https://www.starhealth.in',
        settlementPeriod: 30,
        discountPercent: 5,
        panelRate: 100,
    },
    {
        providerCode: 'INS-HDFC',
        name: 'HDFC ERGO Health Insurance',
        type: 'private',
        contactPerson: 'Claims Department',
        phone: '+91-1800-2666',
        email: 'care@hdfcergo.com',
        website: 'https://www.hdfcergo.com',
        settlementPeriod: 30,
        discountPercent: 0,
        panelRate: 100,
    },
    {
        providerCode: 'INS-ICICI',
        name: 'ICICI Lombard Health Insurance',
        type: 'private',
        contactPerson: 'TPA Services',
        phone: '+91-1800-2666-247',
        email: 'customersupport@aborad.com',
        website: 'https://www.icicilombard.com',
        settlementPeriod: 30,
        discountPercent: 0,
        panelRate: 100,
    },
    {
        providerCode: 'INS-NIVA',
        name: 'Niva Bupa Health Insurance',
        type: 'private',
        contactPerson: 'Provider Relations',
        phone: '+91-1800-200-1123',
        email: 'help@nivabupa.com',
        website: 'https://www.nivabupa.com',
        settlementPeriod: 30,
        discountPercent: 3,
        panelRate: 100,
    },
    {
        providerCode: 'INS-MEDAS',
        name: 'Medi Assist TPA',
        type: 'tpa',
        contactPerson: 'Network Hospital',
        phone: '+91-1800-425-4494',
        email: 'info@mediassisttpa.com',
        website: 'https://www.mediassist.com',
        settlementPeriod: 45,
        discountPercent: 10,
        panelRate: 90,
    },
    {
        providerCode: 'INS-VIDAL',
        name: 'Vidal Health TPA',
        type: 'tpa',
        contactPerson: 'Hospital Relations',
        phone: '+91-1800-266-0676',
        email: 'info@vidalhealth.com',
        website: 'https://www.vidalhealth.com',
        settlementPeriod: 45,
        discountPercent: 10,
        panelRate: 90,
    },
    {
        providerCode: 'INS-CGHS',
        name: 'CGHS (Central Government Health Scheme)',
        type: 'government',
        contactPerson: 'CGHS Office',
        phone: '011-23061661',
        email: 'dgcghs-mohfw@nic.in',
        settlementPeriod: 60,
        discountPercent: 20,
        panelRate: 80,
    },
    {
        providerCode: 'INS-ECHS',
        name: 'ECHS (Ex-Servicemen Contributory Health)',
        type: 'government',
        contactPerson: 'ECHS Cell',
        phone: '011-25694224',
        email: 'echs@nic.in',
        settlementPeriod: 60,
        discountPercent: 15,
        panelRate: 85,
    },
];

// Lab Tests Master Data
const labTestsData = [
    {
        testCode: 'LAB-CBC',
        testName: 'Complete Blood Count (CBC)',
        category: 'Hematology',
        sampleType: 'blood',
        sampleVolume: '3ml',
        turnaroundTime: '4 hours',
        price: 350,
        parameters: [
            { name: 'Hemoglobin', unit: 'g/dL', normalRange: '12-17' },
            { name: 'WBC Count', unit: 'cells/mcL', normalRange: '4500-11000' },
            { name: 'Platelet Count', unit: 'cells/mcL', normalRange: '150000-400000' },
            { name: 'RBC Count', unit: 'million/mcL', normalRange: '4.5-5.5' },
        ],
        instructions: 'Fasting not required',
    },
    {
        testCode: 'LAB-LFT',
        testName: 'Liver Function Test (LFT)',
        category: 'Biochemistry',
        sampleType: 'blood',
        sampleVolume: '5ml',
        turnaroundTime: '6 hours',
        price: 800,
        parameters: [
            { name: 'SGPT (ALT)', unit: 'U/L', normalRange: '7-56' },
            { name: 'SGOT (AST)', unit: 'U/L', normalRange: '10-40' },
            { name: 'Bilirubin Total', unit: 'mg/dL', normalRange: '0.1-1.2' },
            { name: 'Alkaline Phosphatase', unit: 'U/L', normalRange: '44-147' },
            { name: 'Total Protein', unit: 'g/dL', normalRange: '6-8.3' },
        ],
        instructions: 'Fasting for 10-12 hours recommended',
    },
    {
        testCode: 'LAB-KFT',
        testName: 'Kidney Function Test (KFT)',
        category: 'Biochemistry',
        sampleType: 'blood',
        sampleVolume: '5ml',
        turnaroundTime: '6 hours',
        price: 700,
        parameters: [
            { name: 'Creatinine', unit: 'mg/dL', normalRange: '0.7-1.3' },
            { name: 'Blood Urea Nitrogen', unit: 'mg/dL', normalRange: '7-20' },
            { name: 'Uric Acid', unit: 'mg/dL', normalRange: '3.5-7.2' },
        ],
        instructions: 'Fasting recommended',
    },
    {
        testCode: 'LAB-FBS',
        testName: 'Fasting Blood Sugar',
        category: 'Biochemistry',
        sampleType: 'blood',
        sampleVolume: '3ml',
        turnaroundTime: '2 hours',
        price: 100,
        parameters: [
            { name: 'Glucose Fasting', unit: 'mg/dL', normalRange: '70-100' },
        ],
        instructions: 'Fasting for 8-10 hours required',
    },
    {
        testCode: 'LAB-PPBS',
        testName: 'Post Prandial Blood Sugar',
        category: 'Biochemistry',
        sampleType: 'blood',
        sampleVolume: '3ml',
        turnaroundTime: '2 hours',
        price: 100,
        parameters: [
            { name: 'Glucose PP', unit: 'mg/dL', normalRange: '<140' },
        ],
        instructions: '2 hours after meal',
    },
    {
        testCode: 'LAB-HBA1C',
        testName: 'HbA1c (Glycated Hemoglobin)',
        category: 'Diabetes',
        sampleType: 'blood',
        sampleVolume: '3ml',
        turnaroundTime: '4 hours',
        price: 500,
        parameters: [
            { name: 'HbA1c', unit: '%', normalRange: '<5.7' },
        ],
        instructions: 'Fasting not required',
    },
    {
        testCode: 'LAB-LIPID',
        testName: 'Lipid Profile',
        category: 'Biochemistry',
        sampleType: 'blood',
        sampleVolume: '5ml',
        turnaroundTime: '6 hours',
        price: 600,
        parameters: [
            { name: 'Total Cholesterol', unit: 'mg/dL', normalRange: '<200' },
            { name: 'HDL Cholesterol', unit: 'mg/dL', normalRange: '>40' },
            { name: 'LDL Cholesterol', unit: 'mg/dL', normalRange: '<100' },
            { name: 'Triglycerides', unit: 'mg/dL', normalRange: '<150' },
        ],
        instructions: 'Fasting for 12-14 hours required',
    },
    {
        testCode: 'LAB-TFT',
        testName: 'Thyroid Function Test',
        category: 'Endocrinology',
        sampleType: 'blood',
        sampleVolume: '5ml',
        turnaroundTime: '6 hours',
        price: 700,
        parameters: [
            { name: 'T3', unit: 'ng/dL', normalRange: '80-200' },
            { name: 'T4', unit: 'mcg/dL', normalRange: '5-12' },
            { name: 'TSH', unit: 'mIU/L', normalRange: '0.4-4.0' },
        ],
        instructions: 'Fasting not required',
    },
    {
        testCode: 'LAB-URINE',
        testName: 'Urine Routine Examination',
        category: 'Urology',
        sampleType: 'urine',
        sampleVolume: '30ml',
        turnaroundTime: '2 hours',
        price: 150,
        parameters: [
            { name: 'Color', unit: '-', normalRange: 'Pale Yellow' },
            { name: 'pH', unit: '-', normalRange: '4.5-8.0' },
            { name: 'Specific Gravity', unit: '-', normalRange: '1.005-1.030' },
            { name: 'Protein', unit: '-', normalRange: 'Negative' },
            { name: 'Glucose', unit: '-', normalRange: 'Negative' },
        ],
        instructions: 'Mid-stream morning sample preferred',
    },
    {
        testCode: 'LAB-ESR',
        testName: 'Erythrocyte Sedimentation Rate',
        category: 'Hematology',
        sampleType: 'blood',
        sampleVolume: '3ml',
        turnaroundTime: '2 hours',
        price: 100,
        parameters: [
            { name: 'ESR', unit: 'mm/hr', normalRange: '0-20' },
        ],
        instructions: 'Fasting not required',
    },
];

// Radiology Tests Master Data
const radiologyTestsData = [
    {
        testCode: 'RAD-XRAY-CHEST',
        testName: 'Chest X-Ray (PA View)',
        modality: 'xray',
        bodyPart: 'Chest',
        description: 'Posteroanterior view of chest',
        duration: 10,
        price: 400,
        preparation: 'Remove metallic objects',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-XRAY-ABD',
        testName: 'Abdomen X-Ray',
        modality: 'xray',
        bodyPart: 'Abdomen',
        description: 'Plain X-ray of abdomen',
        duration: 10,
        price: 500,
        preparation: 'Remove metallic objects',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-USG-ABD',
        testName: 'Ultrasound Abdomen',
        modality: 'ultrasound',
        bodyPart: 'Abdomen',
        description: 'Complete abdominal ultrasound',
        duration: 30,
        price: 1200,
        preparation: 'Fasting for 6-8 hours, full bladder',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-USG-PELV',
        testName: 'Ultrasound Pelvis',
        modality: 'ultrasound',
        bodyPart: 'Pelvis',
        description: 'Pelvic ultrasound examination',
        duration: 20,
        price: 1000,
        preparation: 'Full bladder required',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-ECG',
        testName: 'Electrocardiogram (ECG)',
        modality: 'other',
        bodyPart: 'Heart',
        description: '12-lead ECG recording',
        duration: 15,
        price: 300,
        preparation: 'No preparation required',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-ECHO',
        testName: '2D Echocardiography',
        modality: 'ultrasound',
        bodyPart: 'Heart',
        description: '2D echo with Doppler',
        duration: 30,
        price: 2500,
        preparation: 'No preparation required',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-CT-HEAD',
        testName: 'CT Scan Head',
        modality: 'ct',
        bodyPart: 'Head',
        description: 'Non-contrast CT of head/brain',
        duration: 20,
        price: 3500,
        preparation: 'No preparation required',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-CT-ABD',
        testName: 'CT Scan Abdomen',
        modality: 'ct',
        bodyPart: 'Abdomen',
        description: 'CT scan of abdomen with/without contrast',
        duration: 30,
        price: 5000,
        preparation: 'Fasting for 4-6 hours if contrast required',
        contrastRequired: true,
    },
    {
        testCode: 'RAD-MRI-BRAIN',
        testName: 'MRI Brain',
        modality: 'mri',
        bodyPart: 'Brain',
        description: 'MRI of brain without contrast',
        duration: 45,
        price: 8000,
        preparation: 'Remove all metallic objects',
        contrastRequired: false,
    },
    {
        testCode: 'RAD-MRI-SPINE',
        testName: 'MRI Spine (Lumbar)',
        modality: 'mri',
        bodyPart: 'Spine',
        description: 'MRI of lumbar spine',
        duration: 45,
        price: 8000,
        preparation: 'Remove all metallic objects',
        contrastRequired: false,
    },
];

// Medicines Master Data
const medicinesData = [
    {
        medicineCode: 'MED-PARA500',
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        brand: 'Crocin',
        manufacturer: 'GSK',
        category: 'Analgesic/Antipyretic',
        form: 'tablet',
        strength: '500mg',
        unit: 'mg',
        packSize: 10,
        mrp: 25,
        sellingPrice: 22,
        reorderLevel: 100,
        schedule: 'OTC',
        storageConditions: 'Store below 25°C',
    },
    {
        medicineCode: 'MED-AMOX500',
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        brand: 'Mox',
        manufacturer: 'Ranbaxy',
        category: 'Antibiotic',
        form: 'capsule',
        strength: '500mg',
        unit: 'mg',
        packSize: 10,
        mrp: 120,
        sellingPrice: 110,
        reorderLevel: 50,
        schedule: 'H',
        storageConditions: 'Store below 25°C in dry place',
    },
    {
        medicineCode: 'MED-OMEP20',
        name: 'Omeprazole 20mg',
        genericName: 'Omeprazole',
        brand: 'Omez',
        manufacturer: 'Dr Reddy\'s',
        category: 'Antacid/PPI',
        form: 'capsule',
        strength: '20mg',
        unit: 'mg',
        packSize: 15,
        mrp: 85,
        sellingPrice: 75,
        reorderLevel: 50,
        schedule: 'H',
        storageConditions: 'Store in cool dry place',
    },
    {
        medicineCode: 'MED-METRO400',
        name: 'Metronidazole 400mg',
        genericName: 'Metronidazole',
        brand: 'Flagyl',
        manufacturer: 'Abbott',
        category: 'Antibiotic',
        form: 'tablet',
        strength: '400mg',
        unit: 'mg',
        packSize: 10,
        mrp: 45,
        sellingPrice: 40,
        reorderLevel: 50,
        schedule: 'H',
        storageConditions: 'Store below 30°C',
    },
    {
        medicineCode: 'MED-CETRIZ10',
        name: 'Cetirizine 10mg',
        genericName: 'Cetirizine',
        brand: 'Cetzine',
        manufacturer: 'Alkem',
        category: 'Antihistamine',
        form: 'tablet',
        strength: '10mg',
        unit: 'mg',
        packSize: 10,
        mrp: 35,
        sellingPrice: 30,
        reorderLevel: 50,
        schedule: 'OTC',
        storageConditions: 'Store in dry place',
    },
    {
        medicineCode: 'MED-AZITH500',
        name: 'Azithromycin 500mg',
        genericName: 'Azithromycin',
        brand: 'Azee',
        manufacturer: 'Cipla',
        category: 'Antibiotic',
        form: 'tablet',
        strength: '500mg',
        unit: 'mg',
        packSize: 3,
        mrp: 120,
        sellingPrice: 105,
        reorderLevel: 30,
        schedule: 'H',
        storageConditions: 'Store below 25°C',
    },
    {
        medicineCode: 'MED-MONT10',
        name: 'Montelukast 10mg',
        genericName: 'Montelukast',
        brand: 'Montair',
        manufacturer: 'Cipla',
        category: 'Anti-asthmatic',
        form: 'tablet',
        strength: '10mg',
        unit: 'mg',
        packSize: 10,
        mrp: 180,
        sellingPrice: 160,
        reorderLevel: 30,
        schedule: 'H',
        storageConditions: 'Store in dry place',
    },
    {
        medicineCode: 'MED-ATROV10',
        name: 'Atorvastatin 10mg',
        genericName: 'Atorvastatin',
        brand: 'Atorva',
        manufacturer: 'Zydus',
        category: 'Lipid Lowering',
        form: 'tablet',
        strength: '10mg',
        unit: 'mg',
        packSize: 10,
        mrp: 95,
        sellingPrice: 85,
        reorderLevel: 30,
        schedule: 'H',
        storageConditions: 'Store below 25°C',
    },
    {
        medicineCode: 'MED-METF500',
        name: 'Metformin 500mg',
        genericName: 'Metformin',
        brand: 'Glycomet',
        manufacturer: 'USV',
        category: 'Antidiabetic',
        form: 'tablet',
        strength: '500mg',
        unit: 'mg',
        packSize: 20,
        mrp: 45,
        sellingPrice: 40,
        reorderLevel: 50,
        schedule: 'H',
        storageConditions: 'Store below 25°C',
    },
    {
        medicineCode: 'MED-AMLO5',
        name: 'Amlodipine 5mg',
        genericName: 'Amlodipine',
        brand: 'Stamlo',
        manufacturer: 'Dr Reddy\'s',
        category: 'Antihypertensive',
        form: 'tablet',
        strength: '5mg',
        unit: 'mg',
        packSize: 14,
        mrp: 65,
        sellingPrice: 55,
        reorderLevel: 50,
        schedule: 'H',
        storageConditions: 'Store below 30°C',
    },
    {
        medicineCode: 'MED-NSS09',
        name: 'Normal Saline 0.9%',
        genericName: 'Sodium Chloride',
        brand: 'NS',
        manufacturer: 'B.Braun',
        category: 'IV Fluid',
        form: 'injection',
        strength: '0.9%',
        unit: 'ml',
        packSize: 500,
        mrp: 45,
        sellingPrice: 40,
        reorderLevel: 100,
        schedule: 'H',
        storageConditions: 'Store below 25°C',
    },
    {
        medicineCode: 'MED-RL',
        name: 'Ringer Lactate',
        genericName: 'Ringer Lactate',
        brand: 'RL',
        manufacturer: 'B.Braun',
        category: 'IV Fluid',
        form: 'injection',
        strength: '-',
        unit: 'ml',
        packSize: 500,
        mrp: 55,
        sellingPrice: 50,
        reorderLevel: 100,
        schedule: 'H',
        storageConditions: 'Store below 25°C',
    },
];

// ============================================
// SEEDING FUNCTIONS
// ============================================

const seedDepartments = async () => {
    console.log('📁 Seeding Departments...');
    await Department.deleteMany({});
    const departments = await Department.insertMany(departmentsData);
    console.log(`   ✓ Created ${departments.length} departments`);
    return departments;
};

const seedTariffCategories = async () => {
    console.log('📁 Seeding Tariff Categories...');
    await TariffCategory.deleteMany({});
    const categories = await TariffCategory.insertMany(tariffCategoriesData);
    console.log(`   ✓ Created ${categories.length} tariff categories`);
    return categories;
};

const seedInsuranceProviders = async () => {
    console.log('📁 Seeding Insurance Providers...');
    await InsuranceProvider.deleteMany({});
    const providers = await InsuranceProvider.insertMany(insuranceProvidersData);
    console.log(`   ✓ Created ${providers.length} insurance providers`);
    return providers;
};

const seedLabTests = async (labDepartmentId) => {
    console.log('📁 Seeding Lab Tests...');
    await LabTestMaster.deleteMany({});
    const labTestsWithDept = labTestsData.map((test) => ({
        ...test,
        department: labDepartmentId,
    }));
    const labTests = await LabTestMaster.insertMany(labTestsWithDept);
    console.log(`   ✓ Created ${labTests.length} lab tests`);
    return labTests;
};

const seedRadiologyTests = async (radDepartmentId) => {
    console.log('📁 Seeding Radiology Tests...');
    await RadiologyMaster.deleteMany({});
    const radTestsWithDept = radiologyTestsData.map((test) => ({
        ...test,
        department: radDepartmentId,
    }));
    const radTests = await RadiologyMaster.insertMany(radTestsWithDept);
    console.log(`   ✓ Created ${radTests.length} radiology tests`);
    return radTests;
};

const seedMedicines = async () => {
    console.log('📁 Seeding Medicines...');
    await Medicine.deleteMany({});
    const medicines = await Medicine.insertMany(medicinesData);
    console.log(`   ✓ Created ${medicines.length} medicines`);
    return medicines;
};

const seedWards = async (departments) => {
    console.log('📁 Seeding Wards...');
    await Ward.deleteMany({});

    const genMedDept = departments.find((d) => d.departmentCode === 'DEPT-GEN');
    const cardDept = departments.find((d) => d.departmentCode === 'DEPT-CARD');
    const emergDept = departments.find((d) => d.departmentCode === 'DEPT-EMRG');
    const pedsDept = departments.find((d) => d.departmentCode === 'DEPT-PEDS');
    const gynoDept = departments.find((d) => d.departmentCode === 'DEPT-GYNO');

    const wardsData = [
        { wardCode: 'WRD-GEN-M', name: 'General Ward - Male', type: 'general', department: genMedDept?._id, floor: '1st', building: 'Main', totalBeds: 20, nurseStation: 'NS-1A', contactNumber: '5001' },
        { wardCode: 'WRD-GEN-F', name: 'General Ward - Female', type: 'general', department: genMedDept?._id, floor: '1st', building: 'Main', totalBeds: 20, nurseStation: 'NS-1B', contactNumber: '5002' },
        { wardCode: 'WRD-SEMI-M', name: 'Semi-Private Ward - Male', type: 'semi-private', department: genMedDept?._id, floor: '2nd', building: 'Main', totalBeds: 10, nurseStation: 'NS-2A', contactNumber: '5003' },
        { wardCode: 'WRD-SEMI-F', name: 'Semi-Private Ward - Female', type: 'semi-private', department: genMedDept?._id, floor: '2nd', building: 'Main', totalBeds: 10, nurseStation: 'NS-2B', contactNumber: '5004' },
        { wardCode: 'WRD-PVT', name: 'Private Rooms', type: 'private', department: genMedDept?._id, floor: '3rd', building: 'Main', totalBeds: 15, nurseStation: 'NS-3A', contactNumber: '5005' },
        { wardCode: 'WRD-ICU', name: 'Intensive Care Unit', type: 'icu', department: genMedDept?._id, floor: '2nd', building: 'Critical Care', totalBeds: 10, nurseStation: 'NS-ICU', contactNumber: '5006' },
        { wardCode: 'WRD-CCU', name: 'Cardiac Care Unit', type: 'ccu', department: cardDept?._id, floor: '2nd', building: 'Critical Care', totalBeds: 8, nurseStation: 'NS-CCU', contactNumber: '5007' },
        { wardCode: 'WRD-EMRG', name: 'Emergency Ward', type: 'emergency', department: emergDept?._id, floor: 'Ground', building: 'Emergency', totalBeds: 12, nurseStation: 'NS-EMRG', contactNumber: '5008' },
        { wardCode: 'WRD-PEDS', name: 'Pediatric Ward', type: 'pediatric', department: pedsDept?._id, floor: '1st', building: 'Main', totalBeds: 15, nurseStation: 'NS-PEDS', contactNumber: '5009' },
        { wardCode: 'WRD-NICU', name: 'Neonatal ICU', type: 'nicu', department: pedsDept?._id, floor: '1st', building: 'Critical Care', totalBeds: 6, nurseStation: 'NS-NICU', contactNumber: '5010' },
        { wardCode: 'WRD-MAT', name: 'Maternity Ward', type: 'maternity', department: gynoDept?._id, floor: '3rd', building: 'Main', totalBeds: 20, nurseStation: 'NS-MAT', contactNumber: '5011' },
    ];

    const wards = await Ward.insertMany(wardsData);
    console.log(`   ✓ Created ${wards.length} wards`);
    return wards;
};

const seedBeds = async (wards) => {
    console.log('📁 Seeding Beds...');
    await Bed.deleteMany({});

    const bedsData = [];

    for (const ward of wards) {
        let bedType;
        let tariff;

        // Determine bed type and tariff based on ward type
        switch (ward.type) {
            case 'general':
                bedType = BED_TYPES.GENERAL;
                tariff = 800;
                break;
            case 'semi-private':
                bedType = BED_TYPES.SEMI_PRIVATE;
                tariff = 1500;
                break;
            case 'private':
                bedType = BED_TYPES.PRIVATE;
                tariff = 3000;
                break;
            case 'icu':
            case 'ccu':
                bedType = BED_TYPES.ICU;
                tariff = 5000;
                break;
            case 'nicu':
                bedType = BED_TYPES.NICU;
                tariff = 6000;
                break;
            default:
                bedType = BED_TYPES.GENERAL;
                tariff = 1000;
        }

        // Create beds for each ward
        for (let i = 1; i <= ward.totalBeds; i++) {
            bedsData.push({
                bedNumber: `${ward.wardCode}-${String(i).padStart(2, '0')}`,
                ward: ward._id,
                bedType,
                status: BED_STATUS.AVAILABLE,
                tariff,
                features: ward.type === 'private' ? ['AC', 'Attached Bathroom', 'TV', 'WiFi'] : ward.type.includes('icu') || ward.type === 'ccu' ? ['Ventilator Support', 'Central Monitoring', 'Oxygen Supply'] : ['Common Bathroom', 'Fan'],
                lastCleanedAt: new Date(),
            });
        }
    }

    const beds = await Bed.insertMany(bedsData);
    console.log(`   ✓ Created ${beds.length} beds`);
    return beds;
};

const seedAdminUser = async (adminDepartment) => {
    console.log('📁 Seeding Admin User...');
    await User.deleteMany({});

    const adminUser = await User.create({
        username: 'admin',
        email: 'admin@hospital-his.com',
        password: 'Admin@123',
        role: USER_ROLES.ADMIN,
        department: adminDepartment?._id,
        profile: {
            firstName: 'System',
            lastName: 'Administrator',
            phone: '+91-9999999999',
        },
        isActive: true,
    });

    // Create sample doctor user
    const doctorDept = await Department.findOne({ departmentCode: 'DEPT-GEN' });
    const doctorUser = await User.create({
        username: 'dr.sharma',
        email: 'dr.sharma@hospital-his.com',
        password: 'Doctor@123',
        role: USER_ROLES.DOCTOR,
        department: doctorDept?._id,
        profile: {
            firstName: 'Rajesh',
            lastName: 'Sharma',
            phone: '+91-9876543210',
            qualification: 'MBBS, MD (General Medicine)',
            specialization: 'General Medicine',
            registrationNumber: 'MCI-12345',
        },
        isActive: true,
    });

    // Create sample nurse user
    const nurseUser = await User.create({
        username: 'nurse.priya',
        email: 'priya@hospital-his.com',
        password: 'Nurse@123',
        role: USER_ROLES.NURSE,
        department: doctorDept?._id,
        profile: {
            firstName: 'Priya',
            lastName: 'Singh',
            phone: '+91-9876543211',
            qualification: 'BSc Nursing',
        },
        isActive: true,
    });

    // Create receptionist user
    const receptionistUser = await User.create({
        username: 'reception.amit',
        email: 'amit@hospital-his.com',
        password: 'Reception@123',
        role: USER_ROLES.RECEPTIONIST,
        department: adminDepartment?._id,
        profile: {
            firstName: 'Amit',
            lastName: 'Kumar',
            phone: '+91-9876543212',
        },
        isActive: true,
    });

    // Create pharmacist user
    const pharmacyDept = await Department.findOne({ departmentCode: 'DEPT-PHAR' });
    const pharmacistUser = await User.create({
        username: 'pharma.ravi',
        email: 'ravi@hospital-his.com',
        password: 'Pharma@123',
        role: USER_ROLES.PHARMACIST,
        department: pharmacyDept?._id,
        profile: {
            firstName: 'Ravi',
            lastName: 'Patel',
            phone: '+91-9876543213',
            qualification: 'B.Pharm',
        },
        isActive: true,
    });

    // Create lab technician user
    const labDept = await Department.findOne({ departmentCode: 'DEPT-LAB' });
    const labTechUser = await User.create({
        username: 'lab.suresh',
        email: 'suresh@hospital-his.com',
        password: 'LabTech@123',
        role: USER_ROLES.LAB_TECH,
        department: labDept?._id,
        profile: {
            firstName: 'Suresh',
            lastName: 'Reddy',
            phone: '+91-9876543214',
            qualification: 'DMLT',
        },
        isActive: true,
    });

    // Create billing user
    const billingUser = await User.create({
        username: 'billing.neha',
        email: 'neha@hospital-his.com',
        password: 'Billing@123',
        role: USER_ROLES.BILLING,
        department: adminDepartment?._id,
        profile: {
            firstName: 'Neha',
            lastName: 'Gupta',
            phone: '+91-9876543215',
        },
        isActive: true,
    });

    console.log(`   ✓ Created 7 users (admin, doctor, nurse, receptionist, pharmacist, lab tech, billing)`);
    console.log('');
    console.log('   📋 Login Credentials:');
    console.log('   ┌──────────────────┬───────────────────────────┬──────────────┐');
    console.log('   │ Role             │ Username                  │ Password     │');
    console.log('   ├──────────────────┼───────────────────────────┼──────────────┤');
    console.log('   │ Admin            │ admin                     │ Admin@123    │');
    console.log('   │ Doctor           │ dr.sharma                 │ Doctor@123   │');
    console.log('   │ Nurse            │ nurse.priya               │ Nurse@123    │');
    console.log('   │ Receptionist     │ reception.amit            │ Reception@123│');
    console.log('   │ Pharmacist       │ pharma.ravi               │ Pharma@123   │');
    console.log('   │ Lab Technician   │ lab.suresh                │ LabTech@123  │');
    console.log('   │ Billing          │ billing.neha              │ Billing@123  │');
    console.log('   └──────────────────┴───────────────────────────┴──────────────┘');

    return [adminUser, doctorUser, nurseUser, receptionistUser, pharmacistUser, labTechUser, billingUser];
};

// ============================================
// MAIN SEED FUNCTION
// ============================================

const seedDatabase = async () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          HOSPITAL INFORMATION SYSTEM - DATABASE SEEDER         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`   ✓ Connected to: ${mongoose.connection.host}`);
        console.log('');

        // Seed all collections
        const departments = await seedDepartments();
        await seedTariffCategories();
        await seedInsuranceProviders();

        // Get specific departments for foreign key references
        const labDept = departments.find((d) => d.departmentCode === 'DEPT-LAB');
        const radDept = departments.find((d) => d.departmentCode === 'DEPT-RAD');
        const adminDept = departments.find((d) => d.departmentCode === 'DEPT-ADMN');

        await seedLabTests(labDept?._id);
        await seedRadiologyTests(radDept?._id);
        await seedMedicines();

        const wards = await seedWards(departments);
        await seedBeds(wards);
        await seedAdminUser(adminDept);

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Database seeding completed successfully!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('📊 Summary:');
        console.log('   • Departments: 13');
        console.log('   • Tariff Categories: 10');
        console.log('   • Insurance Providers: 8');
        console.log('   • Lab Tests: 10');
        console.log('   • Radiology Tests: 10');
        console.log('   • Medicines: 12');
        console.log('   • Wards: 11');
        console.log('   • Beds: 146');
        console.log('   • Users: 7');
        console.log('');
        console.log('🚀 You can now start the backend server with: npm run dev');
        console.log('');
    } catch (error) {
        console.error('');
        console.error('❌ Error seeding database:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
        process.exit(0);
    }
};

// Run the seed function
seedDatabase();
