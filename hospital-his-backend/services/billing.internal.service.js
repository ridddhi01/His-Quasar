const Billing = require('../models/Billing');
const Tariff = require('../models/Tariff');

/**
 * Add item to patient's bill (Creates new bill if no pending bill exists)
 */
exports.addItemToBill = async ({
    patientId,
    visitId,
    visitType = 'opd',
    visitModel = 'Appointment',
    itemType,
    itemReference,
    description,
    quantity = 1,
    rate,
    discount = 0,
    generatedBy
}) => {
    console.log(`[Billing Service] Process item: ${itemType} for patient ${patientId}`);
    try {
        // 1. Validate inputs
        if (!patientId || !visitId) {
            console.error('Missing patientId or visitId for billing');
            return null;
        }

        // 2. Find Pending Bill for this Visit
        // We link bills to a specific Visit (Appointment/Admission)
        let bill = await Billing.findOne({
            patient: patientId,
            visit: visitId,
            status: 'draft' // Only add to draft bills
        });

        // 3. Create new bill if not found
        if (!bill) {
            bill = new Billing({
                patient: patientId,
                visit: visitId,
                visitType,
                visitModel,
                generatedBy, // User ID who triggered the action
                items: []
            });
        }

        // 4. Check if rate is provided, if not try to fetch from Tariff
        let finalRate = rate;
        if (finalRate === undefined || finalRate === null) {
            if (itemType === 'consultation') {
                // Fetch default consultation fee
                const tariff = await Tariff.findOne({ serviceType: 'consultation', isActive: true });
                finalRate = tariff ? tariff.basePrice : 500; // Default fallback
            } else if (itemType === 'lab') {
                // Rate should ideally be passed from LabTestMaster, but fallback check
                // In our flow, controller passes rate, so this might be redundant but safe
                finalRate = 0;
            } else {
                finalRate = 0;
            }
        }

        const amount = quantity * finalRate;
        const tax = 0; // Can add tax logic later
        const netAmount = amount - discount + tax;

        // 5. Add Item to Bill
        bill.items.push({
            itemType,
            itemReference, // ID of the LabTest, Medicine, etc.
            description,
            quantity,
            rate: finalRate,
            amount,
            discount,
            tax,
            netAmount,
            isBilled: true,
            billedAt: new Date(),
            isSystemGenerated: true
        });

        // 6. Save (Triggers pre-save hook to recalculate totals)
        await bill.save();

        console.log(`[Billing] Added ${description} to bill ${bill.billNumber}`);
        return bill;

    } catch (error) {
        console.error('[Billing Service Error]:', error.message);
        // We don't throw here to avoid blocking the main clinical workflow
        // But in production, you might want to alert finance
        return null;
    }
};
