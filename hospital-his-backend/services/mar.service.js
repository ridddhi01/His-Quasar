const mongoose = require('mongoose');
const MedicationAdministration = require('../models/MedicationAdministration');
const PharmacyDispense = require('../models/PharmacyDispense');
const Admission = require('../models/Admission');
const Medicine = require('../models/Medicine');
const { createAuditLog } = require('./audit.service');
const drugInteractionService = require('./drugInteraction.service');
const drugRecallService = require('./drugRecall.service');

/**
 * MAR Service (Medication Administration Record)
 * 
 * Manages the nursing medication administration workflow:
 * 1. Schedule creation from dispense records
 * 2. Pre-administration safety checks
 * 3. Recording administration with batch traceability
 * 4. Hold/refuse handling
 * 
 * CRITICAL: Maintains complete traceability for:
 * - Legal compliance
 * - Medication error investigation
 * - Drug recall backtracking
 */

class MARService {

    /**
     * Create MAR schedule from a dispense record.
     * Called automatically after IPD dispense.
     * 
     * @param {ObjectId} dispenseId - PharmacyDispense ID
     * @param {ObjectId} admissionId - Admission ID
     * @returns {Array} - Created MedicationAdministration records
     */
    async createMARSchedule(dispenseId, admissionId) {
        const dispense = await PharmacyDispense.findById(dispenseId)
            .populate('patient')
            .populate('prescription');

        if (!dispense) {
            throw new Error('Dispense record not found');
        }

        const admission = await Admission.findById(admissionId);
        if (!admission) {
            throw new Error('Admission not found');
        }

        const createdSchedules = [];
        const now = new Date();

        for (const item of dispense.items) {
            // Get medicine details for frequency parsing
            const medicine = await Medicine.findById(item.medicine);
            if (!medicine) continue;

            // Parse frequency to determine schedule times
            // This is a simplified version - production would have more sophisticated parsing
            const schedulesTimes = this._parseFrequencyToTimes(
                dispense.prescription?.medicines?.find(
                    m => m.medicine.toString() === item.medicine.toString()
                )?.frequency || 'OD'
            );

            // Get duration in days
            const durationDays = this._parseDuration(
                dispense.prescription?.medicines?.find(
                    m => m.medicine.toString() === item.medicine.toString()
                )?.duration || '5 days'
            );

            // Create schedule entries for each dose
            for (let day = 0; day < durationDays; day++) {
                for (const time of schedulesTimes) {
                    const scheduledTime = new Date(now);
                    scheduledTime.setDate(scheduledTime.getDate() + day);
                    scheduledTime.setHours(time.hour, time.minute, 0, 0);

                    // Don't create past schedules
                    if (scheduledTime < now) continue;

                    const mar = new MedicationAdministration({
                        patient: dispense.patient._id,
                        admission: admissionId,
                        dispenseItem: {
                            dispenseRef: dispense._id,
                            itemIndex: dispense.items.indexOf(item),
                        },
                        medicine: item.medicine,
                        medicineName: medicine.name,
                        batch: {
                            batchNumber: item.batchNumber,
                            inventoryRef: item.inventoryBatch,
                            expiryDate: item.expiryDate,
                        },
                        scheduledTime,
                        dose: dispense.prescription?.medicines?.find(
                            m => m.medicine.toString() === item.medicine.toString()
                        )?.dosage || medicine.strength,
                        route: this._mapFormToRoute(medicine.form),
                        status: 'scheduled',
                    });

                    await mar.save();
                    createdSchedules.push(mar);
                }
            }
        }

        // Mark dispense as MAR scheduled
        dispense.marScheduleCreated = true;
        await dispense.save();

        return createdSchedules;
    }

    /**
     * Get MAR schedule for an admission.
     * 
     * @param {ObjectId} admissionId 
     * @param {Object} options - { date, status }
     */
    async getMARSchedule(admissionId, options = {}) {
        return MedicationAdministration.getScheduleForAdmission(admissionId, options);
    }

    /**
     * Perform pre-administration safety check.
     * Called before nurse administers medication.
     * 
     * @param {ObjectId} marId - MedicationAdministration ID
     * @returns {Object} - { safe: boolean, warnings: [], blockers: [] }
     */
    async preAdminSafetyCheck(marId) {
        const mar = await MedicationAdministration.findById(marId)
            .populate('patient', 'allergies')
            .populate('admission');

        if (!mar) {
            throw new Error('MAR record not found');
        }

        const result = {
            safe: true,
            warnings: [],
            blockers: [],
        };

        // 1. Check if batch is recalled
        const recallCheck = await drugRecallService.isBatchRecalled(
            mar.medicine,
            mar.batch.batchNumber
        );

        if (recallCheck) {
            result.safe = false;
            result.blockers.push({
                type: 'recall',
                message: `This batch has been recalled: ${recallCheck.reason}`,
                recallNumber: recallCheck.recallNumber,
            });
        }

        // 2. Check expiry
        if (mar.batch.expiryDate && mar.batch.expiryDate < new Date()) {
            result.safe = false;
            result.blockers.push({
                type: 'expired',
                message: `This batch expired on ${mar.batch.expiryDate.toLocaleDateString()}`,
            });
        }

        // 3. Check drug interactions with current medications
        // Get all active medications for this admission
        const activeMeds = await MedicationAdministration.find({
            admission: mar.admission._id,
            status: 'scheduled',
            scheduledTime: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
        }).select('medicine');

        const activeMedIds = [...new Set(activeMeds.map(m => m.medicine))];

        if (activeMedIds.length > 1) {
            const interactionCheck = await drugInteractionService.checkInteractions(
                activeMedIds,
                mar.patient._id
            );

            if (interactionCheck.hasMajor) {
                result.warnings.push({
                    type: 'interaction',
                    severity: 'major',
                    message: 'Major drug interaction detected with current medications',
                    interactions: interactionCheck.interactions.filter(i => i.severity === 'major'),
                });
            }

            if (interactionCheck.allergyConflicts.length > 0) {
                result.safe = false;
                result.blockers.push({
                    type: 'allergy',
                    message: 'Patient has allergy to this medication',
                    details: interactionCheck.allergyConflicts,
                });
            }
        }

        // Update MAR with safety check results
        mar.safetyChecks = {
            interactionChecked: true,
            allergyChecked: true,
            recallChecked: true,
            checkedAt: new Date(),
        };
        await mar.save();

        return result;
    }

    /**
     * Record medication administration.
     * 
     * @param {ObjectId} marId - MedicationAdministration ID
     * @param {Object} adminData - { notes, vitalsAtAdmin, site }
     * @param {ObjectId} nurseId - User administering
     * @param {ObjectId} witnessId - Witness (for controlled substances)
     */
    async recordAdministration(marId, adminData, nurseId, witnessId = null) {
        const mar = await MedicationAdministration.findById(marId);

        if (!mar) {
            throw new Error('MAR record not found');
        }

        if (mar.status === 'given') {
            throw new Error('Medication already administered');
        }

        // Check if safety checks were done
        if (!mar.safetyChecks?.interactionChecked) {
            throw new Error('Pre-administration safety check not completed');
        }

        mar.status = 'given';
        mar.administeredTime = new Date();
        mar.administeredBy = nurseId;
        mar.witnessedBy = witnessId;
        mar.notes = adminData.notes;
        mar.site = adminData.site;
        mar.vitalsAtAdmin = adminData.vitalsAtAdmin;

        await mar.save();

        // Audit log
        await createAuditLog({
            user: nurseId,
            action: 'update',
            entity: 'MedicationAdministration',
            entityId: marId,
            description: `Medication administered: ${mar.medicineName}`,
            metadata: {
                batchNumber: mar.batch.batchNumber,
                dose: mar.dose,
                route: mar.route,
                scheduledTime: mar.scheduledTime,
                actualTime: mar.administeredTime,
            },
        });

        return mar;
    }

    /**
     * Hold a medication (not given, with reason).
     * 
     * @param {ObjectId} marId 
     * @param {String} holdReason - 'npo', 'patient_not_available', 'vital_signs', 'lab_values', 'doctor_order', 'other'
     * @param {String} holdDetails 
     * @param {ObjectId} nurseId 
     */
    async holdMedication(marId, holdReason, holdDetails, nurseId) {
        const mar = await MedicationAdministration.findById(marId);

        if (!mar) {
            throw new Error('MAR record not found');
        }

        mar.status = 'held';
        mar.holdReason = holdReason;
        mar.holdDetails = holdDetails;

        await mar.save();

        await createAuditLog({
            user: nurseId,
            action: 'update',
            entity: 'MedicationAdministration',
            entityId: marId,
            description: `Medication held: ${mar.medicineName} - ${holdReason}`,
            metadata: { holdReason, holdDetails },
        });

        return mar;
    }

    /**
     * Record patient refusal.
     */
    async recordRefusal(marId, refusalReason, nurseId) {
        const mar = await MedicationAdministration.findById(marId);

        if (!mar) {
            throw new Error('MAR record not found');
        }

        mar.status = 'refused';
        mar.refusalReason = refusalReason;

        await mar.save();

        await createAuditLog({
            user: nurseId,
            action: 'update',
            entity: 'MedicationAdministration',
            entityId: marId,
            description: `Patient refused medication: ${mar.medicineName}`,
            metadata: { refusalReason },
        });

        return mar;
    }

    /**
     * Get overdue medications for an admission.
     */
    async getOverdueMedications(admissionId) {
        return MedicationAdministration.getOverdueMedications(admissionId);
    }

    /**
     * Parse frequency string to schedule times.
     * @private
     */
    _parseFrequencyToTimes(frequency) {
        const freqUpper = frequency.toUpperCase();

        // Common frequency mappings
        const schedules = {
            'OD': [{ hour: 9, minute: 0 }], // Once daily
            'BD': [{ hour: 9, minute: 0 }, { hour: 21, minute: 0 }], // Twice daily
            'TDS': [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }], // Thrice daily
            'QID': [{ hour: 8, minute: 0 }, { hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }], // Four times
            'Q6H': [{ hour: 6, minute: 0 }, { hour: 12, minute: 0 }, { hour: 18, minute: 0 }, { hour: 0, minute: 0 }],
            'Q8H': [{ hour: 8, minute: 0 }, { hour: 16, minute: 0 }, { hour: 0, minute: 0 }],
            'Q12H': [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }],
            'STAT': [{ hour: new Date().getHours(), minute: new Date().getMinutes() }], // Immediately
            'HS': [{ hour: 22, minute: 0 }], // At bedtime
        };

        return schedules[freqUpper] || schedules['OD'];
    }

    /**
     * Parse duration string to days.
     * @private
     */
    _parseDuration(duration) {
        const match = duration.match(/(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return 5; // Default 5 days
    }

    /**
     * Map medicine form to administration route.
     * @private
     */
    _mapFormToRoute(form) {
        const formToRoute = {
            'tablet': 'oral',
            'capsule': 'oral',
            'syrup': 'oral',
            'suspension': 'oral',
            'injection': 'iv',
            'cream': 'topical',
            'ointment': 'topical',
            'drops': 'ophthalmic',
            'inhaler': 'inhalation',
            'powder': 'oral',
        };
        return formToRoute[form] || 'other';
    }
}

module.exports = new MARService();
