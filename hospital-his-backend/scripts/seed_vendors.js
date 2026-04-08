/**
 * Seed Vendors
 * Run: node scripts/seed_vendors.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const VendorMaster = require('../models/VendorMaster');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedVendors = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        let createdByUser = await User.findOne({ role: 'inventory_manager' });
        if (!createdByUser) createdByUser = await User.findOne({ role: 'admin' });
        if (!createdByUser) { console.error('No user found.'); process.exit(1); }

        const vendors = [
            {
                vendorCode: 'VND-001',
                vendorName: 'MedEquip Supplies Pvt Ltd',
                vendorType: 'equipment',
                contactPerson: 'Rajesh Kumar',
                email: 'sales@medequip.com',
                phone: '+91-9876543210',
                address: { street: '123 Industrial Area', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
                gstNumber: '27AABCT1234D1ZV',
                paymentTerms: 'credit-30',
            },
            {
                vendorCode: 'VND-002',
                vendorName: 'Hospital Furniture Co',
                vendorType: 'general',
                contactPerson: 'Priya Sharma',
                email: 'orders@hospitalfurniture.in',
                phone: '+91-9876543211',
                address: { street: '456 Furniture Lane', city: 'Delhi', state: 'Delhi', pincode: '110001' },
                gstNumber: '07AABCF5678E1ZW',
                paymentTerms: 'credit-45',
            },
            {
                vendorCode: 'VND-003',
                vendorName: 'CleanPro Hygiene Solutions',
                vendorType: 'consumables',
                contactPerson: 'Amit Patel',
                email: 'info@cleanpro.com',
                phone: '+91-9876543212',
                address: { street: '789 Clean Street', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
                gstNumber: '24AABCC9012F1ZX',
                paymentTerms: 'credit-15',
            },
            {
                vendorCode: 'VND-004',
                vendorName: 'TechMed IT Solutions',
                vendorType: 'equipment',
                contactPerson: 'Sunita Reddy',
                email: 'support@techmed.co.in',
                phone: '+91-9876543213',
                address: { street: '321 Tech Park', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
                gstNumber: '29AABCT3456G1ZY',
                paymentTerms: 'credit-30',
            },
            {
                vendorCode: 'VND-005',
                vendorName: 'SafetyFirst Equipment',
                vendorType: 'mixed',
                contactPerson: 'Vikram Singh',
                email: 'sales@safetyfirst.in',
                phone: '+91-9876543214',
                address: { street: '654 Safety Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
                gstNumber: '33AABCS7890H1ZZ',
                paymentTerms: 'credit-30',
            },
        ];

        console.log('\nSeeding Vendors...');
        for (const v of vendors) {
            const exists = await VendorMaster.findOne({ vendorCode: v.vendorCode });
            if (!exists) {
                await VendorMaster.create({ ...v, createdBy: createdByUser._id, isActive: true });
                console.log(`  ✅ ${v.vendorName}`);
            } else {
                console.log(`  ⏭️  ${v.vendorName} (exists)`);
            }
        }

        console.log(`\n✅ Total: ${await VendorMaster.countDocuments({ isActive: true })} vendors`);
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

seedVendors();
