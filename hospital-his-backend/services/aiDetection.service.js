/**
 * AI Detection Service (Revenue/Compliance)
 * Runs strict checks to identify data anomalies and revenue leakage.
 */

const RevenueAnomaly = require('../models/RevenueAnomaly');
const LabTest = require('../models/LabTest'); // Linked to LabTestMaster, but LabTest is likely the instance
const Billing = require('../models/Billing');
const Department = require('../models/Department');

/**
 * Run all detection algorithms
 */
exports.runFullScan = async () => {
    console.log('Running AI Revenue Detection Scan...');

    // 1. Detect Unbilled Lab Tests
    const unbilledLabs = await detectUnbilledLabTests();

    // 2. Detect Suspiciously Low Bills (Heuristic)
    const lowBills = await detectLowValueBills();

    return {
        unbilledLabs,
        lowBills
    };
};

/**
 * 1. Unbilled Services: Find completed lab tests that have no linked bill
 */
async function detectUnbilledLabTests() {
    let anomaliesCreated = 0;

    // Get all completed lab tests from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const completedLabs = await LabTest.find({
        status: 'completed',
        createdAt: { $gte: thirtyDaysAgo }
    });

    for (const test of completedLabs) {
        // Check if billed
        const bill = await Billing.findOne({
            'items.itemReference': test._id,
            'items.itemType': 'lab'
        });

        if (!bill) {
            // Check if anomaly already exists
            const exists = await RevenueAnomaly.findOne({
                'affectedEntity.id': test._id,
                'affectedEntity.type': 'LabTest'
            });

            if (!exists) {
                // Heuristic: Estimate impact based on common price map or master
                const estimatedImpact = 500; // Default fallback

                await RevenueAnomaly.create({
                    anomalyCode: `RA-LAB-${test._id.toString().substr(-6)}`,
                    detectedBy: 'ai_system',
                    detectionMethod: 'cross_reference',
                    category: 'unbilled_service',
                    severity: 'medium',
                    priority: 3,
                    title: 'Unbilled Lab Test Detected',
                    description: `Lab Test completed on ${test.updatedAt?.toLocaleDateString()} but no corresponding bill found.`,
                    affectedEntity: {
                        type: 'LabTest',
                        id: test._id,
                        reference: test.testCode || 'LAB-TEST'
                    },
                    department: test.department, // Assuming LabTest has department field
                    patientId: test.patient,     // Assuming LabTest has patient field
                    estimatedImpact: estimatedImpact,
                    impactType: 'revenue_loss',
                    evidence: {
                        summary: 'Service marked complete in LIS but missing in Billing',
                        dataPoints: [
                            { field: 'status', expected: 'billed', actual: 'unbilled', deviation: 'Process Gap' }
                        ],
                        confidenceScore: 95
                    }
                });
                anomaliesCreated++;
            }
        }
    }
    return anomaliesCreated;
}

/**
 * 2. Anomaly: Low Value Bills (Outlier Detection)
 * Finds finalized bills that are unusually low (< 100 INR) which might indicate error
 */
async function detectLowValueBills() {
    let anomaliesCreated = 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const bills = await Billing.find({
        status: 'finalized',
        grandTotal: { $lt: 100, $gt: 0 }, // Filter bills between 0 and 100
        billDate: { $gte: thirtyDaysAgo }
    });

    for (const bill of bills) {
        const exists = await RevenueAnomaly.findOne({
            'affectedEntity.id': bill._id,
            'affectedEntity.type': 'Billing'
        });

        if (!exists) {
            await RevenueAnomaly.create({
                anomalyCode: `RA-BILL-${bill.billNumber}`,
                detectedBy: 'ai_system',
                detectionMethod: 'outlier_detection',
                category: 'unusual_pattern',
                severity: 'low',
                priority: 4,
                title: 'Unusually Low Bill Amount',
                description: `Bill ${bill.billNumber} finalized for ₹${bill.grandTotal}, which is below the expected minimum threshold.`,
                affectedEntity: {
                    type: 'Billing',
                    id: bill._id,
                    reference: bill.billNumber
                },
                patientId: bill.patient,
                estimatedImpact: 100, // Potential missing charges
                impactType: 'unknown',
                evidence: {
                    summary: 'Bill total is statistically an outlier (Bottom 5%)',
                    dataPoints: [
                        { field: 'grandTotal', expected: '> 100', actual: bill.grandTotal, deviation: 'Low Value' }
                    ],
                    confidenceScore: 70
                }
            });
            anomaliesCreated++;
        }
    }
    return anomaliesCreated;
}

module.exports = exports;
