require('dotenv').config();
const mongoose = require('mongoose');
const Billing = require('./models/Billing');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const debug = async () => {
    await connectDB();

    console.log('\n--- Checking Patients ---');
    const patients = await Patient.find({ firstName: { $regex: 'yashi', $options: 'i' } });
    console.log(`Found ${patients.length} patients matching 'yashi'`);
    if (patients.length === 0) {
        console.log('Patient Yashi not found. Check spelling?');
    }

    for (const p of patients) {
        console.log(`Patient: ${p.firstName} ${p.lastName} (${p._id})`);

        console.log('--- Appointments ---');
        const apps = await Appointment.find({ patient: p._id });
        console.log(`Found ${apps.length} appointments`);
        apps.forEach(a => console.log(`- Appt ${a._id}: Status=${a.status}`));

        console.log('--- Bills ---');
        const bills = await Billing.find({ patient: p._id });
        console.log(`Found ${bills.length} bills`);
        bills.forEach(b => console.log(`- Bill ${b.billNumber} (${b.status}): Items=${b.items.length}`));
    }

    process.exit();
};

debug();
