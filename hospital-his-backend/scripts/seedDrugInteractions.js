// /**
//  * Drug Interaction Seed Data
//  * 
//  * Run with: node scripts/seedDrugInteractions.js
//  * 
//  * Seeds common drug-drug interactions for testing and production use.
//  */

// require('dotenv').config();
// const mongoose = require('mongoose');
// const DrugInteraction = require('../models/DrugInteraction');
// const Medicine = require('../models/Medicine');
// const config = require('../config/config');

// // Common drug interactions dataset
// const interactionData = [
//     // Anticoagulant interactions (Major)
//     {
//         drugNames: ['Warfarin', 'Aspirin'],
//         severity: 'major',
//         description: 'Increased risk of bleeding when used together',
//         clinicalEffect: 'Enhanced anticoagulant effect leading to potential hemorrhage',
//         mechanism: 'Aspirin inhibits platelet aggregation and may displace warfarin from protein binding',
//         recommendation: 'Avoid combination unless specifically indicated. If used, monitor INR closely',
//         managementOptions: ['Use alternative analgesic', 'Reduce warfarin dose', 'Monitor INR weekly'],
//         evidenceLevel: 'high',
//     },
//     {
//         drugNames: ['Warfarin', 'Ibuprofen'],
//         severity: 'major',
//         description: 'NSAIDs increase risk of GI bleeding and interfere with anticoagulation',
//         clinicalEffect: 'Increased bleeding risk, potential GI hemorrhage',
//         mechanism: 'NSAIDs inhibit COX-1 protective prostaglandins and platelet function',
//         recommendation: 'Avoid combination. Use acetaminophen for pain if needed',
//         managementOptions: ['Use paracetamol instead', 'Add PPI if NSAID required', 'Monitor closely'],
//         evidenceLevel: 'high',
//     },

//     // Cardiac drug interactions
//     {
//         drugNames: ['Digoxin', 'Amiodarone'],
//         severity: 'major',
//         description: 'Amiodarone increases digoxin levels significantly',
//         clinicalEffect: 'Digoxin toxicity (nausea, visual disturbances, arrhythmias)',
//         mechanism: 'Amiodarone inhibits P-glycoprotein, reducing digoxin clearance',
//         recommendation: 'Reduce digoxin dose by 50% when starting amiodarone',
//         managementOptions: ['Halve digoxin dose', 'Monitor digoxin levels', 'Watch for toxicity signs'],
//         evidenceLevel: 'high',
//     },
//     {
//         drugNames: ['Atenolol', 'Verapamil'],
//         severity: 'major',
//         description: 'Additive negative inotropic and chronotropic effects',
//         clinicalEffect: 'Severe bradycardia, heart block, cardiac failure',
//         mechanism: 'Both drugs depress cardiac conduction and contractility',
//         recommendation: 'Avoid combination. If essential, use with extreme caution',
//         managementOptions: ['Monitor HR/BP closely', 'Use alternative antihypertensive', 'ECG monitoring'],
//         evidenceLevel: 'high',
//     },

//     // Antibiotic interactions
//     {
//         drugNames: ['Ciprofloxacin', 'Theophylline'],
//         severity: 'major',
//         description: 'Ciprofloxacin inhibits theophylline metabolism',
//         clinicalEffect: 'Theophylline toxicity (seizures, arrhythmias)',
//         mechanism: 'CYP1A2 inhibition by ciprofloxacin',
//         recommendation: 'Reduce theophylline dose by 30-50% or use alternative antibiotic',
//         managementOptions: ['Monitor theophylline levels', 'Use different fluoroquinolone', 'Watch for toxicity'],
//         evidenceLevel: 'high',
//     },
//     {
//         drugNames: ['Metronidazole', 'Alcohol'],
//         severity: 'major',
//         description: 'Disulfiram-like reaction with alcohol',
//         clinicalEffect: 'Severe nausea, vomiting, flushing, tachycardia',
//         mechanism: 'Metronidazole inhibits aldehyde dehydrogenase',
//         recommendation: 'Avoid alcohol during treatment and 48 hours after',
//         managementOptions: ['Patient counseling', 'Avoid alcohol-containing products'],
//         evidenceLevel: 'high',
//     },

//     // Moderate interactions
//     {
//         drugNames: ['Omeprazole', 'Clopidogrel'],
//         severity: 'moderate',
//         description: 'PPIs may reduce clopidogrel antiplatelet effect',
//         clinicalEffect: 'Reduced cardiovascular protection',
//         mechanism: 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation',
//         recommendation: 'Consider pantoprazole as alternative PPI',
//         managementOptions: ['Use pantoprazole', 'Separate dosing times', 'Monitor for CV events'],
//         evidenceLevel: 'moderate',
//     },
//     {
//         drugNames: ['Metformin', 'Alcohol'],
//         severity: 'moderate',
//         description: 'Increased risk of lactic acidosis',
//         clinicalEffect: 'Lactic acidosis, hypoglycemia',
//         mechanism: 'Alcohol potentiates lactate production and hypoglycemic effect',
//         recommendation: 'Limit alcohol consumption, avoid binge drinking',
//         managementOptions: ['Patient education', 'Monitor blood glucose'],
//         evidenceLevel: 'moderate',
//     },
//     {
//         drugNames: ['Amlodipine', 'Simvastatin'],
//         severity: 'moderate',
//         description: 'Amlodipine increases simvastatin exposure',
//         clinicalEffect: 'Increased risk of myopathy and rhabdomyolysis',
//         mechanism: 'CYP3A4 inhibition increases statin levels',
//         recommendation: 'Limit simvastatin to 20mg daily with amlodipine',
//         managementOptions: ['Use max 20mg simvastatin', 'Consider atorvastatin', 'Monitor for muscle pain'],
//         evidenceLevel: 'moderate',
//     },
//     {
//         drugNames: ['Levothyroxine', 'Calcium Carbonate'],
//         severity: 'moderate',
//         description: 'Calcium reduces levothyroxine absorption',
//         clinicalEffect: 'Reduced thyroid hormone effect, hypothyroidism symptoms',
//         mechanism: 'Calcium chelates levothyroxine in GI tract',
//         recommendation: 'Separate doses by at least 4 hours',
//         managementOptions: ['Take levothyroxine on empty stomach', 'Separate by 4+ hours', 'Monitor TSH'],
//         evidenceLevel: 'high',
//     },

//     // Minor interactions
//     {
//         drugNames: ['Paracetamol', 'Caffeine'],
//         severity: 'minor',
//         description: 'Caffeine may enhance paracetamol absorption',
//         clinicalEffect: 'Slightly faster pain relief onset',
//         mechanism: 'Caffeine increases gastric motility',
//         recommendation: 'No action needed, combination is beneficial',
//         managementOptions: [],
//         evidenceLevel: 'moderate',
//     },
//     {
//         drugNames: ['Metoprolol', 'Food'],
//         severity: 'minor',
//         description: 'Food increases metoprolol absorption',
//         clinicalEffect: 'Slightly higher peak levels',
//         mechanism: 'Enhanced GI absorption with food',
//         recommendation: 'Take consistently with or without food',
//         managementOptions: ['Consistent administration'],
//         evidenceLevel: 'low',
//     },
// ];

// async function seedInteractions() {
//     try {
//         await mongoose.connect(config.mongodbUri);
//         console.log('Connected to MongoDB');

//         // Get all medicines
//         const medicines = await Medicine.find({});
//         console.log(`Found ${medicines.length} medicines in database`);

//         const medicineMap = {};
//         for (const med of medicines) {
//             // Index by name and generic name (lowercase for matching)
//             medicineMap[med.name.toLowerCase()] = med._id;
//             if (med.genericName) {
//                 medicineMap[med.genericName.toLowerCase()] = med._id;
//             }
//         }

//         let created = 0;
//         let skipped = 0;

//         for (const data of interactionData) {
//             const drug1Name = data.drugNames[0].toLowerCase();
//             const drug2Name = data.drugNames[1].toLowerCase();

//             const drug1Id = medicineMap[drug1Name];
//             const drug2Id = medicineMap[drug2Name];

//             if (!drug1Id || !drug2Id) {
//                 console.log(`Skipped: ${data.drugNames[0]} - ${data.drugNames[1]} (medicine not found)`);
//                 skipped++;
//                 continue;
//             }

//             // Check if interaction already exists
//             const existing = await DrugInteraction.checkPairInteraction(drug1Id, drug2Id);
//             if (existing) {
//                 console.log(`Exists: ${data.drugNames[0]} - ${data.drugNames[1]}`);
//                 skipped++;
//                 continue;
//             }

//             // Create interaction
//             await DrugInteraction.create({
//                 drug1: drug1Id,
//                 drug2: drug2Id,
//                 severity: data.severity,
//                 description: data.description,
//                 clinicalEffect: data.clinicalEffect,
//                 mechanism: data.mechanism,
//                 recommendation: data.recommendation,
//                 managementOptions: data.managementOptions,
//                 evidenceLevel: data.evidenceLevel,
//                 isActive: true,
//             });

//             console.log(`Created: ${data.drugNames[0]} - ${data.drugNames[1]} (${data.severity})`);
//             created++;
//         }

//         console.log('\n--- Seeding Complete ---');
//         console.log(`Created: ${created}`);
//         console.log(`Skipped: ${skipped}`);

//         await mongoose.disconnect();
//         console.log('Disconnected from MongoDB');
//         process.exit(0);

//     } catch (error) {
//         console.error('Error seeding interactions:', error);
//         process.exit(1);
//     }
// }

// seedInteractions();


/**
 * Drug Interaction Seed Data (SAFE AUTO + MANUAL)
 *
 * Run with: node scripts/seedDrugInteractions.js
 *
 * - Creates missing medicines automatically (safe)
 * - Seeds drug-drug interactions
 * - Skips existing data
 * - NEVER deletes DB data
 */

// scripts/seedDrugInteractions.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Import your models
const Medicine = require('../models/Medicine');
const DrugInteraction = require('../models/DrugInteraction');

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Sample medicines (must have unique medicineCode)
const medicines = [
  { name: 'Paracetamol', medicineCode: 'MED001' },
  { name: 'Amoxicillin', medicineCode: 'MED002' },
  { name: 'Ibuprofen', medicineCode: 'MED003' },
  { name: 'Metformin', medicineCode: 'MED004' },
];

// Sample drug interactions
const interactions = [
  {
    medicineCode1: 'MED001',
    medicineCode2: 'MED002',
    interaction: 'May increase risk of side effects',
  },
  {
    medicineCode1: 'MED003',
    medicineCode2: 'MED004',
    interaction: 'No significant interaction',
  },
];

async function seedMedicines() {
  for (const med of medicines) {
    if (!med.medicineCode) {
      console.warn(`Skipping medicine "${med.name}" because medicineCode is missing`);
      continue;
    }

    await Medicine.findOneAndUpdate(
      { medicineCode: med.medicineCode }, // search by unique field
      { $set: med },                       // update all fields
      { upsert: true, new: true }          // insert if not found
    );
  }
  console.log('Medicines seeded successfully');
}

async function seedInteractions() {
  for (const inter of interactions) {
    // Make sure both medicines exist
    const med1 = await Medicine.findOne({ medicineCode: inter.medicineCode1 });
    const med2 = await Medicine.findOne({ medicineCode: inter.medicineCode2 });

    if (!med1 || !med2) {
      console.warn(`Skipping interaction between ${inter.medicineCode1} and ${inter.medicineCode2}: one of the medicines does not exist`);
      continue;
    }

    // Upsert interaction
    await DrugInteraction.findOneAndUpdate(
      { medicineCode1: inter.medicineCode1, medicineCode2: inter.medicineCode2 },
      { $set: inter },
      { upsert: true, new: true }
    );
  }
  console.log('Drug interactions seeded successfully');
}

async function seedAll() {
  try {
    await seedMedicines();
    await seedInteractions();
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeding
seedAll();


