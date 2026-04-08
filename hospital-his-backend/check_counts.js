require('dotenv').config();
const mongoose = require('mongoose');

// Define simplified schemas just for counting
const bedSchema = new mongoose.Schema({}, { strict: false });
const wardSchema = new mongoose.Schema({}, { strict: false });

const Bed = mongoose.model('Bed', bedSchema);
const Ward = mongoose.model('Ward', wardSchema);

const check = async () => {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);

        const bedCount = await Bed.countDocuments();
        const wardCount = await Ward.countDocuments();

        console.log('--------------------------------');
        console.log(`Query Result:`);
        console.log(`Beds Found: ${bedCount}`);
        console.log(`Wards Found: ${wardCount}`);
        console.log('--------------------------------');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

check();
