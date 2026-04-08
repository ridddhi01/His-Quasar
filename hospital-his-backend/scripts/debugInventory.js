require('dotenv').config();
const mongoose = require('mongoose');
const PharmacyInventory = require('../models/PharmacyInventory');
const Medicine = require('../models/Medicine');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const meds = await Medicine.find({ name: /War/i });
        console.log(`Medicines matching /War/i: ${meds.length}`);
        meds.forEach(m => console.log(` - ${m.name} (${m._id})`));

        const inventory = await PharmacyInventory.find({}).populate('medicine');
        console.log(`Total Inventory Items: ${inventory.length}`);
        inventory.forEach(i => {
            const medName = i.medicine ? i.medicine.name : 'UNKNOWN';
            console.log(` - Batch: ${i.batchNumber}, Med: ${medName}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

check();
