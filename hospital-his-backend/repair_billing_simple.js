require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Billing = require('./models/Billing');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('DB Error:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    try {
        const appId = '696f58dbae2d70af2294d7db';
        const appt = await Appointment.findById(appId);
        if (!appt) { console.log('Appt not found'); return; }

        const user = await User.findOne({ role: 'admin' }) || await User.findOne();

        // Check if bill exists
        const existing = await Billing.findOne({ visit: appt._id });
        if (existing) {
            console.log('Bill already exists:', existing.billNumber);
            return;
        }

        console.log('Creating Bill...');
        const bill = await Billing.create({
            billNumber: 'BILL-R-' + Date.now(), // Fallback if pre-save hook fails? No, pre-save overwrites usually? 
            // actually pre-save checks isNew.
            patient: appt.patient,
            visit: appt._id,
            visitModel: 'Appointment',
            visitType: 'opd',
            generatedBy: user._id,
            items: [{
                itemType: 'consultation',
                description: 'OPD Consultation Fee',
                quantity: 1,
                rate: 500,
                amount: 500,
                netAmount: 500,
                isSystemGenerated: true,
                isBilled: true,
                billedAt: new Date()
            }],
            status: 'draft',
            subtotal: 500,
            grandTotal: 500, // pre-save will recalc
            paymentStatus: 'pending'
        });
        console.log('Created Bill:', bill.billNumber);
    } catch (e) {
        console.error(e);
    }
    process.exit();
};

run();
