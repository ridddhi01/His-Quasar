const drugInteractionService = require('./drugInteraction.service');
const drugRecallService = require('./drugRecall.service');
const PharmacyInventory = require('../models/PharmacyInventory');
const { createAuditLog } = require('./audit.service');
const notificationService = require('./notification.service');

/**
 * Pharmacy Safety Service
 * 
 * Unified orchestrator for all pharmacy safety checks.
 * Provides a single entry point for comprehensive pre-dispense validation.
 */

class PharmacySafetyService {

    /**
     * Perform comprehensive pre-dispense safety checks.
     * Called before any medication is dispensed.
     * 
     * @param {ObjectId} prescriptionId 
     * @param {Array} selectedBatches - [{ medicineId, batchId, quantity }]
     * @returns {Object} - { canDispense: boolean, blockers: [], warnings: [] }
     */
    async preDispenseChecks(prescriptionId, selectedBatches) {
        const result = {
            canDispense: true,
            blockers: [],
            warnings: [],
            checksPerformed: [],
        };

        // 1. Check prescription safety status (interactions/allergies)
        const interactionCheck = await drugInteractionService.canDispense(prescriptionId);
        result.checksPerformed.push('interaction_check');

        if (!interactionCheck.canDispense) {
            result.canDispense = false;
            result.blockers.push({
                type: 'interaction',
                message: interactionCheck.reason,
            });
        }

        // 2. Check each selected batch for recall/expiry
        for (const batch of selectedBatches) {
            const inventory = await PharmacyInventory.findById(batch.batchId)
                .populate('medicine', 'name');

            if (!inventory) {
                result.blockers.push({
                    type: 'inventory_not_found',
                    message: `Batch not found in inventory`,
                    batchId: batch.batchId,
                });
                result.canDispense = false;
                continue;
            }

            // Check recall status
            if (inventory.isRecalled) {
                result.blockers.push({
                    type: 'recalled',
                    message: `${inventory.medicine.name} (Batch: ${inventory.batchNumber}) is under recall`,
                    medicineId: batch.medicineId,
                    batchNumber: inventory.batchNumber,
                });
                result.canDispense = false;
            } else {
                // Double-check against recall database
                const recallCheck = await drugRecallService.isBatchRecalled(
                    batch.medicineId,
                    inventory.batchNumber
                );
                if (recallCheck) {
                    result.blockers.push({
                        type: 'recalled',
                        message: `${inventory.medicine.name} (Batch: ${inventory.batchNumber}) is under recall: ${recallCheck.reason}`,
                        recallNumber: recallCheck.recallNumber,
                    });
                    result.canDispense = false;
                }
            }

            // Check expiry
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (inventory.expiryDate <= today) {
                result.blockers.push({
                    type: 'expired',
                    message: `${inventory.medicine.name} (Batch: ${inventory.batchNumber}) expired on ${inventory.expiryDate.toLocaleDateString()}`,
                    medicineId: batch.medicineId,
                    batchNumber: inventory.batchNumber,
                });
                result.canDispense = false;
            } else {
                // Warn if expiring within 30 days
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

                if (inventory.expiryDate <= thirtyDaysFromNow) {
                    result.warnings.push({
                        type: 'expiring_soon',
                        message: `${inventory.medicine.name} (Batch: ${inventory.batchNumber}) expires on ${inventory.expiryDate.toLocaleDateString()}`,
                    });
                }
            }

            // Check stock availability
            if (inventory.quantity < batch.quantity) {
                result.blockers.push({
                    type: 'insufficient_stock',
                    message: `${inventory.medicine.name}: Only ${inventory.quantity} available, ${batch.quantity} requested`,
                    available: inventory.quantity,
                    requested: batch.quantity,
                });
                result.canDispense = false;
            }
        }

        result.checksPerformed.push('recall_check', 'expiry_check', 'stock_check');

        return result;
    }

    /**
     * Generate and route a safety alert.
     * 
     * @param {String} alertType - 'interaction', 'recall', 'expiry', 'allergy'
     * @param {Object} data - Alert-specific data
     * @param {Array} recipientIds - User IDs to notify
     */
    async generateSafetyAlert(alertType, data, recipientIds) {
        const alertConfig = {
            'interaction': {
                title: 'Drug Interaction Alert',
                type: data.severity === 'major' ? 'critical' : 'warning',
            },
            'recall': {
                title: 'Drug Recall Alert',
                type: 'critical',
            },
            'expiry': {
                title: 'Expiry Alert',
                type: 'warning',
            },
            'allergy': {
                title: 'Allergy Alert',
                type: 'critical',
            },
        };

        const config = alertConfig[alertType];
        if (!config) return;

        for (const userId of recipientIds) {
            await notificationService.createNotification(
                userId,
                config.type,
                config.title,
                data.message,
                { alertType, ...data }
            );
        }
    }

    /**
     * Get batches sorted by FEFO (First Expire First Out).
     * 
     * @param {ObjectId} medicineId 
     * @param {Number} quantityNeeded 
     * @returns {Array} - Batches to use, in FEFO order
     */
    async getBatchesFEFO(medicineId, quantityNeeded) {
        const batches = await PharmacyInventory.find({
            medicine: medicineId,
            isRecalled: false,
            status: { $in: ['available', 'low-stock'] },
            quantity: { $gt: 0 },
            expiryDate: { $gt: new Date() },
        }).sort({ expiryDate: 1 }); // FEFO ordering

        const selectedBatches = [];
        let remaining = quantityNeeded;

        for (const batch of batches) {
            if (remaining <= 0) break;

            const toTake = Math.min(remaining, batch.quantity);
            selectedBatches.push({
                batchId: batch._id,
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                quantityToDispense: toTake,
                availableQuantity: batch.quantity,
                supplier: batch.supplier,
                grnNumber: batch.grnNumber,
            });
            remaining -= toTake;
        }

        return {
            batches: selectedBatches,
            totalAvailable: batches.reduce((sum, b) => sum + b.quantity, 0),
            shortfall: remaining > 0 ? remaining : 0,
            canFulfill: remaining <= 0,
        };
    }

    /**
     * Log a safety event for compliance tracking.
     */
    async logSafetyEvent(eventType, data, userId) {
        await createAuditLog({
            user: userId,
            action: 'other',
            entity: 'PharmacySafety',
            entityId: data.entityId,
            description: `Safety event: ${eventType}`,
            metadata: data,
        });
    }
}

module.exports = new PharmacySafetyService();
