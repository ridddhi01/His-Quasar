// Script to assign Priya to the Nursing department
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

const DB_URL = process.env.MONGODB_URI || process.env.DB_URL;

async function main() {
  await mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const priya = await User.findOne({ email: 'priya@hospital-his.com' });
  if (!priya) {
    console.error('User priya@hospital-his.com not found');
    process.exit(1);
  }
  const nursingDept = await Department.findOne({ name: /nursing/i });
  if (!nursingDept) {
    console.error('Nursing department not found');
    process.exit(1);
  }
  priya.department = nursingDept._id;
  await priya.save();
  console.log(`Assigned Priya to department: ${nursingDept.name}`);
  await mongoose.connection.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
