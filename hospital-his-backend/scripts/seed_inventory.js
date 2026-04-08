const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('../models/Inventory');

const populateInventory = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB related to Inventory Seeding');

        const medicines = [
            {
                name: 'Paracetamol',
                genericName: 'Acetaminophen',
                category: 'Tablet',
                stock: 1000,
                unitPrice: 2,
                batchNumber: 'BATCH-001',
                expiryDate: new Date('2025-12-31'),
                manufacturer: 'PharmaCorp',
            },
            {
                name: 'Amoxicillin',
                genericName: 'Amoxicillin Trihydrate',
                category: 'Capsule',
                stock: 500,
                unitPrice: 5,
                batchNumber: 'BATCH-002',
                expiryDate: new Date('2025-06-30'),
                manufacturer: 'MediLife',
            },
            {
                name: 'Ibuprofen',
                genericName: 'Ibuprofen',
                category: 'Tablet',
                stock: 800,
                unitPrice: 3,
                batchNumber: 'BATCH-003',
                expiryDate: new Date('2026-01-15'),
                manufacturer: 'HealthCare Inc',
            },
            {
                name: 'Cetirizine',
                genericName: 'Cetirizine Hydrochloride',
                category: 'Tablet',
                stock: 1200,
                unitPrice: 1,
                batchNumber: 'BATCH-004',
                expiryDate: new Date('2025-09-20'),
                manufacturer: 'AllergyFree',
            },
            {
                name: 'Azithromycin',
                genericName: 'Azithromycin',
                category: 'Tablet',
                stock: 300,
                unitPrice: 10,
                batchNumber: 'BATCH-005',
                expiryDate: new Date('2025-05-10'),
                manufacturer: 'Antibio',
            },
            {
                name: 'Metformin',
                genericName: 'Metformin Hydrochloride',
                category: 'Tablet',
                stock: 600,
                unitPrice: 4,
                batchNumber: 'BATCH-006',
                expiryDate: new Date('2026-03-01'),
                manufacturer: 'DiabCure',
            }
        ];

        // Drop existing indexes to clean up potential conflicts
        try {
            await Inventory.collection.dropIndexes();
            console.log('Index dropped');
        } catch (e) {
            // Ignore if index not found
        }

        // Clear existing inventory
        await Inventory.deleteMany({});
        console.log('🗑️  Cleared existing inventory.');

        // Upsert medicines
        for (const med of medicines) {
            await Inventory.create(med);
        }

        console.log(`✅ Successfully seeded ${medicines.length} medicines into Inventory.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding inventory:', error);
        process.exit(1);
    }
};

populateInventory();
