require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Billing = require('./models/Billing');
// Adjust path if needed. repair_billing.js is in backend root. service is in services/
const { addItemToBill } = require('./services/billing.internal.service');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('DB Connection Error:', err);
        process.exit(1);
    }
};

const repair = async () => {
    await connectDB();

    const appId = '696f58dbae2d70af2294d7db';
    console.log('Searching for app:', appId);

    try {
        const appointment = await Appointment.findById(appId).populate('patient').populate('doctor');

        if (!appointment) {
            console.error('Appointment not found');
            process.exit(1);
        }

        console.log(`Found Appt for: ${appointment.patient.firstName}`);

        // Find a valid user for generatedBy
        const user = await User.findOne({ role: 'admin' }) || await User.findOne();
        console.log('Using User:', user ? user._id : 'NONE');

        if (!user) {
            console.error('No user found to set generatedBy');
            process.exit(1);
        }

        console.log('Calling addItemToBill...');
        const bill = await addItemToBill({
            patientId: appointment.patient._id,
            visitId: appointment._id,
            visitType: 'opd',
            visitModel: 'Appointment',
            itemType: 'consultation',
            itemReference: appointment._id,
            description: `OPD Consultation - Dr. ${appointment.doctor?.profile?.firstName || 'Unknown'}`,
            quantity: 1,
            rate: 500, // Force rate to avoid Tariff issues
            generatedBy: user._id
        });

        if (bill) {
            console.log('SUCCESS: Bill Updated/Created');
            console.log('Bill Number:', bill.billNumber);
            console.log('Items Count:', bill.items.length);
        } else {
            console.error('FAILURE: Service returned null');
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        if (error.errors) {
            console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
        }
    }

    process.exit();
};

repair();
