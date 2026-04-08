require('dotenv').config();
const mongoose = require('mongoose');
const ShiftHandover = require('../models/ShiftHandover');
const config = require('../config/config');

const cleanupDuplicateHandovers = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('🧹 Cleaning up duplicate handovers...');

        // Find all handovers with duplicate handoverNumbers
        const duplicates = await ShiftHandover.aggregate([
            {
                $group: {
                    _id: '$handoverNumber',
                    count: { $sum: 1 },
                    docs: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        let deletedCount = 0;
        for (const dup of duplicates) {
            if (dup.docs.length > 1) {
                // Keep the first one, delete the rest
                const toDelete = dup.docs.slice(1);
                const result = await ShiftHandover.deleteMany({ _id: { $in: toDelete } });
                deletedCount += result.deletedCount;
                console.log(`✓ Deleted ${result.deletedCount} duplicate(s) for handoverNumber: ${dup._id}`);
            }
        }

        console.log(`✅ Cleanup complete! Deleted ${deletedCount} duplicate handovers.`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

cleanupDuplicateHandovers();
