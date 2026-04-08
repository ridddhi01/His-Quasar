/**
 * Seed Inventory Categories and Locations
 * Creates sample categories and locations for the inventory module
 * 
 * Run: node scripts/seed_inventory_data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const InventoryCategory = require('../models/InventoryCategory');
const Location = require('../models/Location');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedInventoryData = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Get the inventory manager user to use as createdBy
        let createdByUser = await User.findOne({ role: 'inventory_manager' });
        if (!createdByUser) {
            createdByUser = await User.findOne({ role: 'admin' });
        }
        if (!createdByUser) {
            console.error('No admin or inventory_manager user found. Please create a user first.');
            process.exit(1);
        }

        console.log(`Using user: ${createdByUser.email} as createdBy`);

        // ═══════════════════════════════════════════════════════════════════
        // SEED CATEGORIES
        // ═══════════════════════════════════════════════════════════════════

        const categories = [
            { categoryCode: 'MED-EQ', categoryName: 'Medical Equipment', description: 'Medical devices and equipment' },
            { categoryCode: 'FURN', categoryName: 'Furniture', description: 'Hospital furniture' },
            { categoryCode: 'LINEN', categoryName: 'Linen & Bedding', description: 'Bed sheets, pillows, blankets' },
            { categoryCode: 'CLEAN', categoryName: 'Cleaning Supplies', description: 'Cleaning chemicals and supplies' },
            { categoryCode: 'OFFICE', categoryName: 'Office Supplies', description: 'Stationery and office materials' },
            { categoryCode: 'IT-EQ', categoryName: 'IT Equipment', description: 'Computers, printers, networking' },
            { categoryCode: 'MAINT', categoryName: 'Maintenance', description: 'Maintenance and repair supplies' },
            { categoryCode: 'SAFETY', categoryName: 'Safety Equipment', description: 'PPE, fire safety, emergency equipment' },
            { categoryCode: 'ELEC', categoryName: 'Electrical', description: 'Electrical supplies and components' },
            { categoryCode: 'PLUMB', categoryName: 'Plumbing', description: 'Plumbing supplies and fixtures' },
        ];

        console.log('\nSeeding Categories...');
        let categoryCount = 0;
        for (const cat of categories) {
            const exists = await InventoryCategory.findOne({ categoryCode: cat.categoryCode });
            if (!exists) {
                await InventoryCategory.create({
                    ...cat,
                    createdBy: createdByUser._id,
                    isActive: true,
                });
                console.log(`  ✅ Created category: ${cat.categoryName}`);
                categoryCount++;
            } else {
                console.log(`  ⏭️  Category exists: ${cat.categoryName}`);
            }
        }
        console.log(`Categories: ${categoryCount} created`);

        // ═══════════════════════════════════════════════════════════════════
        // SEED LOCATIONS
        // ═══════════════════════════════════════════════════════════════════

        const locations = [
            { locationCode: 'MAIN-WH', locationName: 'Main Warehouse', locationType: 'warehouse', address: 'Ground Floor, Building A' },
            { locationCode: 'CENTRAL-STORE', locationName: 'Central Store', locationType: 'store', address: 'Basement, Building A' },
            { locationCode: 'OPD-STORE', locationName: 'OPD Store', locationType: 'department', address: 'OPD Block' },
            { locationCode: 'IPD-STORE', locationName: 'IPD Store', locationType: 'department', address: 'IPD Block, 2nd Floor' },
            { locationCode: 'ICU-STORE', locationName: 'ICU Store', locationType: 'sub-store', address: 'ICU Wing' },
            { locationCode: 'OT-STORE', locationName: 'Operation Theatre Store', locationType: 'sub-store', address: 'OT Block' },
            { locationCode: 'EMER-STORE', locationName: 'Emergency Store', locationType: 'department', address: 'Emergency Wing' },
            { locationCode: 'LAB-STORE', locationName: 'Laboratory Store', locationType: 'department', address: 'Lab Block' },
            { locationCode: 'RAD-STORE', locationName: 'Radiology Store', locationType: 'department', address: 'Radiology Block' },
            { locationCode: 'ADMIN-STORE', locationName: 'Admin Store', locationType: 'department', address: 'Admin Building' },
        ];

        console.log('\nSeeding Locations...');
        let locationCount = 0;
        for (const loc of locations) {
            const exists = await Location.findOne({ locationCode: loc.locationCode });
            if (!exists) {
                await Location.create({
                    ...loc,
                    createdBy: createdByUser._id,
                    isActive: true,
                });
                console.log(`  ✅ Created location: ${loc.locationName}`);
                locationCount++;
            } else {
                console.log(`  ⏭️  Location exists: ${loc.locationName}`);
            }
        }
        console.log(`Locations: ${locationCount} created`);

        // ═══════════════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════════════

        const totalCategories = await InventoryCategory.countDocuments({ isActive: true });
        const totalLocations = await Location.countDocuments({ isActive: true });

        console.log('\n═══════════════════════════════════════════════════');
        console.log('           SEED COMPLETE');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Total Categories: ${totalCategories}`);
        console.log(`Total Locations: ${totalLocations}`);
        console.log('═══════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding inventory data:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedInventoryData();
