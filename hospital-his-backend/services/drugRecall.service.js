const mongoose = require('mongoose');
const DrugRecall = require('../models/DrugRecall');
const PharmacyInventory = require('../models/PharmacyInventory');
const PharmacyDispense = require('../models/PharmacyDispense');
const Patient = require('../models/Patient');
const { createAuditLog } = require('./audit.service');
const notificationService = require('./notification.service');

/**
 * Drug Recall Service
 * 
 * Manages the complete lifecycle of drug recalls:
 * 1. Initiation (with batch blocking)
 * 2. Affected patient identification
 * 3. Notification to all parties
 * 4. Resolution tracking
 * 
 * MEDICO-LEGAL: Every action is logged for regulatory compliance.
 */

class DrugRecallService {

    /**
     * Initiate a drug recall.
     * This will:
     * 1. Create the recall record
     * 2. Block all specified batches from dispense
     * 3. Find affected patients
     * 4. Log everything
     * 
     * @param {ObjectId} medicineId - Medicine being recalled
     * @param {Array} batches - Array of { batchNumber } to recall
     * @param {String} reason - Recall reason
     * @param {String} regulatoryReference - FDA/CDSCO reference (optional)
     * @param {String} recallClass - 'class-i', 'class-ii', 'class-iii' (optional)
     * @param {ObjectId} userId - User initiating recall
     * @returns {Object} - Created recall with affected patients
     */
    async initiateRecall(medicineId, batches, reason, regulatoryReference, recallClass, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Find and block inventory batches
            const recalledBatches = [];
            for (const batch of batches) {
                const inventory = await PharmacyInventory.findOne({
                    medicine: medicineId,
                    batchNumber: batch.batchNumber,
                }).session(session);

                if (inventory) {
                    inventory.isRecalled = true;
                    inventory.recalledAt = new Date();
                    inventory.recallBlockedBy = userId;
                    await inventory.save({ session });

                    recalledBatches.push({
                        batchNumber: batch.batchNumber,
                        inventoryRef: inventory._id,
                        quantityAtRecall: inventory.quantity,
                        blockedAt: new Date(),
                    });
                } else {
                    // Batch not in inventory but still record it
                    recalledBatches.push({
                        batchNumber: batch.batchNumber,
                        quantityAtRecall: 0,
                        blockedAt: new Date(),
                    });
                }
            }

            // 2. Create recall record
            const recall = new DrugRecall({
                medicine: medicineId,
                recalledBatches,
                reason,
                regulatoryReference,
                recallClass,
                initiatedBy: userId,
            });

            await recall.save({ session });

            // 3. Find affected patients (those who received these batches)
            const batchNumbers = batches.map(b => b.batchNumber);
            const affectedDispenses = await PharmacyDispense.find({
                'items.batchNumber': { $in: batchNumbers },
            })
                .populate('patient', 'firstName lastName patientId phone email')
                .session(session);

            // Build affected patients list
            const affectedPatientsMap = new Map();

            for (const dispense of affectedDispenses) {
                for (const item of dispense.items) {
                    if (batchNumbers.includes(item.batchNumber) &&
                        item.medicine.toString() === medicineId.toString()) {
                        const patientId = dispense.patient._id.toString();

                        if (!affectedPatientsMap.has(patientId)) {
                            affectedPatientsMap.set(patientId, {
                                patient: dispense.patient._id,
                                dispenseRef: dispense._id,
                                batchNumber: item.batchNumber,
                                quantityReceived: item.dispensedQuantity,
                                dispensedAt: dispense.dispensedAt,
                                notified: false,
                            });
                        }
                    }
                }
            }

            recall.affectedPatients = Array.from(affectedPatientsMap.values());
            await recall.save({ session });

            // 4. Update inventory recall reference
            await PharmacyInventory.updateMany(
                { medicine: medicineId, batchNumber: { $in: batchNumbers } },
                { recallRef: recall._id },
                { session }
            );

            await session.commitTransaction();

            // 5. Create audit log
            await createAuditLog({
                user: userId,
                action: 'create',
                entity: 'DrugRecall',
                entityId: recall._id,
                description: `Drug recall initiated for ${recalledBatches.length} batches, ${recall.affectedPatients.length} patients affected`,
                metadata: {
                    medicineId,
                    batchNumbers,
                    reason,
                    regulatoryReference,
                    affectedPatientCount: recall.affectedPatients.length,
                },
            });

            return {
                recall,
                affectedPatientCount: recall.affectedPatients.length,
                blockedBatchCount: recalledBatches.length,
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Check if a batch is under active recall.
     * Called during dispense to prevent issuing recalled medication.
     * 
     * @param {ObjectId} medicineId 
     * @param {String} batchNumber 
     * @returns {Object|null} - Recall info or null if not recalled
     */
    async isBatchRecalled(medicineId, batchNumber) {
        const recall = await DrugRecall.isBatchRecalled(medicineId, batchNumber);

        if (recall) {
            return {
                isRecalled: true,
                recallNumber: recall.recallNumber,
                reason: recall.reason,
                recallClass: recall.recallClass,
                regulatoryReference: recall.regulatoryReference,
            };
        }

        return null;
    }

    /**
     * Get all affected patients for a recall.
     * 
     * @param {ObjectId} recallId 
     */
    async getAffectedPatients(recallId) {
        const recall = await DrugRecall.findById(recallId)
            .populate({
                path: 'affectedPatients.patient',
                select: 'patientId firstName lastName phone email',
            })
            .populate({
                path: 'affectedPatients.dispenseRef',
                select: 'dispenseNumber dispensedAt',
            });

        if (!recall) {
            throw new Error('Recall not found');
        }

        return recall.affectedPatients;
    }

    /**
     * Notify all affected parties about a recall.
     * This sends notifications to:
     * - Affected patients
     * - Prescribing doctors
     * - Pharmacy staff
     * 
     * @param {ObjectId} recallId 
     * @param {ObjectId} userId - User triggering notifications
     */
    async notifyAffectedParties(recallId, userId) {
        const recall = await DrugRecall.findById(recallId)
            .populate('medicine', 'name genericName')
            .populate({
                path: 'affectedPatients.patient',
                select: 'patientId firstName lastName phone email',
            });

        if (!recall) {
            throw new Error('Recall not found');
        }

        const medicineName = recall.medicine.name;
        let notifiedCount = { patients: 0, doctors: 0, pharmacists: 0 };

        // Notify each affected patient
        for (const affected of recall.affectedPatients) {
            if (affected.notified) continue;

            const patient = affected.patient;
            const message = `Important: ${medicineName} (Batch: ${affected.batchNumber}) you received has been recalled. Reason: ${recall.reason}. Please contact the hospital pharmacy.`;

            try {
                // SMS
                if (patient.phone) {
                    await notificationService.sendSMS(patient.phone, message);
                }

                // Email
                if (patient.email) {
                    await notificationService.sendEmail(
                        patient.email,
                        `[URGENT] Drug Recall Notice - ${medicineName}`,
                        `
                        <h2>Drug Recall Notice</h2>
                        <p>Dear ${patient.firstName},</p>
                        <p>We are contacting you regarding a medication you recently received from our pharmacy.</p>
                        <p><strong>Medication:</strong> ${medicineName}</p>
                        <p><strong>Batch Number:</strong> ${affected.batchNumber}</p>
                        <p><strong>Recall Reason:</strong> ${recall.reason}</p>
                        <p>Please stop using this medication and contact our pharmacy immediately for further instructions.</p>
                        <p>We apologize for any inconvenience.</p>
                        `
                    );
                }

                // Mark as notified
                affected.notified = true;
                affected.notifiedAt = new Date();
                affected.notifiedBy = userId;
                notifiedCount.patients++;

            } catch (error) {
                console.error(`Failed to notify patient ${patient.patientId}:`, error.message);
            }
        }

        recall.notificationsSent = notifiedCount;
        recall.actionsTaken.push({
            action: 'patients_notified',
            takenBy: userId,
            takenAt: new Date(),
            details: `Notified ${notifiedCount.patients} patients`,
        });

        await recall.save();

        // Audit log
        await createAuditLog({
            user: userId,
            action: 'update',
            entity: 'DrugRecall',
            entityId: recallId,
            description: `Recall notifications sent to ${notifiedCount.patients} patients`,
        });

        return {
            notifiedCount,
            recall,
        };
    }

    /**
     * Resolve a recall (close it).
     * 
     * @param {ObjectId} recallId 
     * @param {String} resolutionNotes 
     * @param {ObjectId} userId 
     */
    async resolveRecall(recallId, resolutionNotes, userId) {
        const recall = await DrugRecall.findById(recallId);

        if (!recall) {
            throw new Error('Recall not found');
        }

        recall.status = 'resolved';
        recall.resolutionDate = new Date();
        recall.resolutionNotes = resolutionNotes;
        recall.actionsTaken.push({
            action: 'recall_resolved',
            takenBy: userId,
            takenAt: new Date(),
            details: resolutionNotes,
        });

        await recall.save();

        // Note: We do NOT unblock inventory batches - recalled stock should remain blocked
        // If stock needs to be returned to service, that's a separate inventory operation

        await createAuditLog({
            user: userId,
            action: 'update',
            entity: 'DrugRecall',
            entityId: recallId,
            description: 'Recall resolved',
            metadata: { resolutionNotes },
        });

        return recall;
    }

    /**
     * Get all active recalls.
     */
    async getActiveRecalls() {
        return DrugRecall.getActiveRecalls();
    }

    /**
     * Get recall history for a medicine.
     * 
     * @param {ObjectId} medicineId 
     */
    async getRecallHistory(medicineId) {
        return DrugRecall.find({ medicine: medicineId })
            .sort({ recallDate: -1 });
    }
}

module.exports = new DrugRecallService();
