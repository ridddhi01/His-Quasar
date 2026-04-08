/**
 * Seed Script for Procedure Codes (CPT)
 * Populates the system with standard medical procedure codes
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ProcedureCode = require('../models/ProcedureCode');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_his';

const procedureCodes = [
    // Evaluation and Management
    {
        code: '99203',
        description: 'Office or other outpatient visit for the evaluation and management of a new patient (low complexity)',
        shortDescription: 'New Patient Office Visit (Low)',
        category: 'E&M',
        codeType: 'cpt',
        baseRate: 500,
        isActive: true
    },
    {
        code: '99204',
        description: 'Office or other outpatient visit for the evaluation and management of a new patient (moderate complexity)',
        shortDescription: 'New Patient Office Visit (Mod)',
        category: 'E&M',
        codeType: 'cpt',
        baseRate: 800,
        isActive: true
    },
    {
        code: '99213',
        description: 'Office or other outpatient visit for the evaluation and management of an established patient (low complexity)',
        shortDescription: 'Est Patient Office Visit (Low)',
        category: 'E&M',
        codeType: 'cpt',
        baseRate: 400,
        isActive: true
    },
    {
        code: '99214',
        description: 'Office or other outpatient visit for the evaluation and management of an established patient (moderate complexity)',
        shortDescription: 'Est Patient Office Visit (Mod)',
        category: 'E&M',
        codeType: 'cpt',
        baseRate: 700,
        isActive: true
    },

    // General Surgery
    {
        code: '10060',
        description: 'Incision and drainage of abscess (e.g., carbuncle, suppurative hidradenitis, cutaneous or subcutaneous abscess, cyst, furuncle, or paronychia)',
        shortDescription: 'I&D Abscess Simple',
        category: 'Surgery',
        codeType: 'cpt',
        baseRate: 1500,
        isActive: true
    },
    {
        code: '12001',
        description: 'Simple repair of superficial wounds of scalp, neck, axillae, external genitalia, trunk and/or extremities (2.5 cm or less)',
        shortDescription: 'Simple Wound Repair 2.5cm',
        category: 'Surgery',
        codeType: 'cpt',
        baseRate: 1200,
        isActive: true
    },

    // Radiology
    {
        code: '71045',
        description: 'Radiologic examination, chest; single view',
        shortDescription: 'Chest X-Ray 1 View',
        category: 'Radiology',
        codeType: 'cpt',
        baseRate: 600,
        isActive: true
    },
    {
        code: '70450',
        description: 'Computed tomography, head or brain; without contrast material',
        shortDescription: 'CT Head w/o Contrast',
        category: 'Radiology',
        codeType: 'cpt',
        baseRate: 3500,
        isActive: true
    },

    // Pathology / Lab
    {
        code: '80053',
        description: 'Comprehensive metabolic panel',
        shortDescription: 'Comprehensive Met Panel',
        category: 'Pathology',
        codeType: 'cpt',
        baseRate: 800,
        isActive: true
    },
    {
        code: '85025',
        description: 'Blood count; complete (CBC), automated (Hgb, Hct, RBC, WBC and platelet count) and automated differential WBC count',
        shortDescription: 'CBC w/ Auto Diff',
        category: 'Pathology',
        codeType: 'cpt',
        baseRate: 450,
        isActive: true
    },

    // Medicine / Immunization
    {
        code: '90471',
        description: 'Immunization administration (includes percutaneous, intradermal, subcutaneous, or intramuscular injections); 1 vaccine (single or combination vaccine/toxoid)',
        shortDescription: 'Immunization Admin 1 Vaccine',
        category: 'Medicine',
        codeType: 'cpt',
        baseRate: 200,
        isActive: true
    },
    {
        code: '93000',
        description: 'Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report',
        shortDescription: 'ECG 12 Lead Complete',
        category: 'Medicine',
        codeType: 'cpt',
        baseRate: 1000,
        isActive: true
    }
];

async function seedProcedureCodes() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if codes exist
        const count = await ProcedureCode.countDocuments();
        if (count > 0) {
            console.log(`ℹ️  Found ${count} existing codes. Clearing...`);
            await ProcedureCode.deleteMany({});
        }

        const created = await ProcedureCode.insertMany(procedureCodes);
        console.log(`✅ ${created.length} Procedure Codes seeded successfully!`);

    } catch (error) {
        console.error('❌ Error seeding procedure codes:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ MongoDB connection closed');
        process.exit(0);
    }
}

seedProcedureCodes();
