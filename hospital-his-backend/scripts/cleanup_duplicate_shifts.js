require('dotenv').config();
const mongoose = require('mongoose');
const NursingShift = require('../models/NursingShift');
const config = require('../config/config');

const cleanupDuplicateShifts = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('🧹 Cleaning up duplicate shifts...');

        // Find all shifts with duplicate shiftNumbers
        const duplicates = await NursingShift.aggregate([
            {
                $group: {
                    _id: '$shiftNumber',
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
                const result = await NursingShift.deleteMany({ _id: { $in: toDelete } });
                deletedCount += result.deletedCount;
                console.log(`✓ Deleted ${result.deletedCount} duplicate(s) for shiftNumber: ${dup._id}`);
            }
        }

        console.log(`✅ Cleanup complete! Deleted ${deletedCount} duplicate shifts.`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

cleanupDuplicateShifts();
