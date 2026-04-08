/**
 * Script to update Lab Tests with Critical Values
 * Run: node scripts/update_critical_values.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const LabTestMaster = require('../models/LabTestMaster');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_his_db';

const updateCriticalValues = async () => {
    console.log('🔌 Connecting to MongoDB...');
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('   ✓ Connected!');

        // Update 1: Complete Blood Count (CBC) - Hemoglobin & Platelets
        const cbc = await LabTestMaster.findOne({ testName: { $regex: 'Complete Blood Count', $options: 'i' } });
        if (cbc) {
            let updated = false;
            cbc.parameters.forEach(p => {
                if (p.name.includes('Hemoglobin')) {
                    p.criticalLow = 7.0;
                    p.criticalHigh = 20.0;
                    console.log(`   Updated Hemoglobin critical values: < 7.0 or > 20.0`);
                    updated = true;
                }
                if (p.name.includes('Platelet')) {
                    p.criticalLow = 50000;
                    p.criticalHigh = 1000000;
                    console.log(`   Updated Platelet critical values: < 50,000 or > 1,000,000`);
                    updated = true;
                }
            });
            if (updated) await cbc.save();
        } else {
            console.log('   ⚠️ CBC Test not found.');
        }

        // Update 2: Blood Glucose (Fasting)
        const glucose = await LabTestMaster.findOne({ testName: { $regex: 'Glucose', $options: 'i' } });
        if (glucose) {
            let updated = false;
            glucose.parameters.forEach(p => {
                if (p.name.includes('Glucose')) {
                    p.criticalLow = 50;
                    p.criticalHigh = 400;
                    console.log(`   Updated Glucose critical values: < 50 or > 400`);
                    updated = true;
                }
            });
            if (updated) await glucose.save();
        } else {
            console.log('   ⚠️ Glucose Test not found.');
        }

        // Update 3: Electrolytes - Potassium (High risk)
        const electrolytes = await LabTestMaster.findOne({ testName: { $regex: 'Electrolyte', $options: 'i' } });
        if (electrolytes) {
            let updated = false;
            electrolytes.parameters.forEach(p => {
                if (p.name.includes('Potassium')) {
                    p.criticalLow = 2.8;
                    p.criticalHigh = 6.0;
                    console.log(`   Updated Potassium critical values: < 2.8 or > 6.0`);
                    updated = true;
                }
                if (p.name.includes('Sodium')) {
                    p.criticalLow = 120;
                    p.criticalHigh = 160;
                    console.log(`   Updated Sodium critical values: < 120 or > 160`);
                    updated = true;
                }
            });
            if (updated) await electrolytes.save();
        }

        console.log('✅ Critical values updated successfully.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

updateCriticalValues();
