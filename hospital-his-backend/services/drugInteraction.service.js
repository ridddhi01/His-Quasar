const DrugInteraction = require('../models/DrugInteraction');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const { createAuditLog } = require('./audit.service');
const notificationService = require('./notification.service');

/**
 * Drug Interaction Service
 * 
 * Core engine for checking drug-drug interactions and patient allergies.
 * Called at three critical points:
 * 1. During prescription creation (by doctor)
 * 2. Before pharmacy dispense (by pharmacist)
 * 3. Before medication administration (by nurse) - MAR stage
 * 
 * CLINICAL SAFETY: Major interactions should block workflow and require override.
 */

class DrugInteractionService {

    /**
     * Check all interactions and allergies for a list of medicines.
     * This is the main entry point for safety checking.
     * 
     * @param {Array} medicineIds - Array of Medicine ObjectIds
     * @param {ObjectId} patientId - Patient ObjectId (for allergy check)
     * @returns {Object} - { interactions: [], allergyConflicts: [], hasMajor: boolean }
     */
    async checkInteractions(medicineIds, patientId) {
        const result = {
            interactions: [],
            allergyConflicts: [],
            hasMajor: false,
            hasModerate: false,
            hasMinor: false,
            requiresOverride: false,
        };

        if (!medicineIds || medicineIds.length === 0) {
            return result;
        }

        // 1. Check drug-drug interactions
        if (medicineIds.length >= 2) {
            const interactions = await DrugInteraction.findInteractionsForMedicines(medicineIds);

            for (const interaction of interactions) {
                result.interactions.push({
                    interactionId: interaction._id,
                    drug1: interaction.drug1,
                    drug2: interaction.drug2,
                    severity: interaction.severity,
                    description: interaction.description,
                    clinicalEffect: interaction.clinicalEffect,
                    recommendation: interaction.recommendation,
                });

                if (interaction.severity === 'major') result.hasMajor = true;
                if (interaction.severity === 'moderate') result.hasModerate = true;
                if (interaction.severity === 'minor') result.hasMinor = true;
            }
        }

        // 2. Check patient allergies
        if (patientId) {
            const patient = await Patient.findById(patientId).select('allergies firstName lastName');

            if (patient && patient.allergies && patient.allergies.length > 0) {
                // Get medicine details for allergy comparison
                const medicines = await Medicine.find({ _id: { $in: medicineIds } })
                    .select('name genericName category');

                for (const medicine of medicines) {
                    for (const allergy of patient.allergies) {
                        // Case-insensitive matching of allergy against medicine name, generic name, category
                        const allergyLower = allergy.toLowerCase();
                        const matchesName = medicine.name?.toLowerCase().includes(allergyLower);
                        const matchesGeneric = medicine.genericName?.toLowerCase().includes(allergyLower);
                        const matchesCategory = medicine.category?.toLowerCase().includes(allergyLower);

                        if (matchesName || matchesGeneric || matchesCategory) {
                            result.allergyConflicts.push({
                                medicine: medicine._id,
                                medicineName: medicine.name,
                                genericName: medicine.genericName,
                                allergy: allergy,
                                matchType: matchesName ? 'name' : (matchesGeneric ? 'generic' : 'category'),
                            });
                        }
                    }
                }
            }
        }

        // Determine if override is required
        // Major interactions or any allergy conflict requires override
        result.requiresOverride = result.hasMajor || result.allergyConflicts.length > 0;

        return result;
    }

    /**
     * Validate and update safety status on a prescription.
     * Called after prescription creation or when explicitly running safety check.
     * 
     * @param {ObjectId} prescriptionId - Prescription ID
     * @param {ObjectId} userId - User performing the check
     * @returns {Object} - Updated prescription with safety status
     */
    async validatePrescriptionSafety(prescriptionId, userId) {
        const prescription = await Prescription.findById(prescriptionId)
            .populate('patient', 'allergies')
            .populate('medicines.medicine', 'name genericName category');

        if (!prescription) {
            throw new Error('Prescription not found');
        }

        const medicineIds = prescription.medicines.map(m => m.medicine._id);
        const safetyResult = await this.checkInteractions(medicineIds, prescription.patient._id);

        // Update medicine-level interaction flags
        for (let i = 0; i < prescription.medicines.length; i++) {
            const medItem = prescription.medicines[i];
            medItem.interactionChecked = true;
            medItem.allergyChecked = true;
            medItem.interactions = [];
            medItem.allergyWarnings = [];

            // Find interactions involving this medicine
            for (const interaction of safetyResult.interactions) {
                const drug1Id = interaction.drug1._id.toString();
                const drug2Id = interaction.drug2._id.toString();
                const thisId = medItem.medicine._id.toString();

                if (drug1Id === thisId || drug2Id === thisId) {
                    const otherDrug = drug1Id === thisId ? interaction.drug2 : interaction.drug1;
                    medItem.interactions.push({
                        withMedicine: otherDrug._id,
                        withMedicineName: otherDrug.name,
                        severity: interaction.severity,
                        description: interaction.description,
                    });
                }
            }

            // Find allergy conflicts for this medicine
            for (const allergyConflict of safetyResult.allergyConflicts) {
                if (allergyConflict.medicine.toString() === medItem.medicine._id.toString()) {
                    medItem.allergyWarnings.push(
                        `Patient allergic to ${allergyConflict.allergy} (matches ${allergyConflict.matchType})`
                    );
                }
            }
        }

        // Update prescription-level safety status
        prescription.safetyStatus = {
            allChecksComplete: true,
            hasInteractions: safetyResult.interactions.length > 0,
            hasMajorInteractions: safetyResult.hasMajor,
            hasAllergyWarnings: safetyResult.allergyConflicts.length > 0,
            checkedAt: new Date(),
            checkedBy: userId,
            overrideRequired: safetyResult.requiresOverride,
            overrideComplete: false,
        };

        await prescription.save();

        // Log the safety check
        await createAuditLog({
            user: userId,
            action: 'update',
            entity: 'Prescription',
            entityId: prescriptionId,
            description: `Safety check completed: ${safetyResult.interactions.length} interactions, ${safetyResult.allergyConflicts.length} allergy conflicts`,
            metadata: {
                safetyResult,
                hasMajor: safetyResult.hasMajor,
                requiresOverride: safetyResult.requiresOverride,
            },
        });

        return {
            prescription,
            safetyResult,
        };
    }

    /**
     * Record a safety override for a prescription.
     * Called when a doctor acknowledges and overrides a major interaction warning.
     * 
     * @param {ObjectId} prescriptionId - Prescription ID
     * @param {Number} medicineIndex - Index in medicine array (or null for all)
     * @param {String} overrideReason - Clinical justification for override
     * @param {ObjectId} userId - User performing override (must be doctor)
     */
    async recordOverride(prescriptionId, medicineIndex, overrideReason, userId) {
        const prescription = await Prescription.findById(prescriptionId);

        if (!prescription) {
            throw new Error('Prescription not found');
        }

        if (!overrideReason || overrideReason.trim().length < 10) {
            throw new Error('Override reason must be at least 10 characters');
        }

        const now = new Date();

        // If medicineIndex is provided, override specific medicine
        if (medicineIndex !== null && medicineIndex !== undefined) {
            if (!prescription.medicines[medicineIndex]) {
                throw new Error('Medicine index not found');
            }

            // Mark all interactions for this medicine as overridden
            for (const interaction of prescription.medicines[medicineIndex].interactions) {
                interaction.overrideBy = userId;
                interaction.overrideReason = overrideReason;
                interaction.overrideAt = now;
            }
        } else {
            // Override all interactions in prescription
            for (const medItem of prescription.medicines) {
                for (const interaction of medItem.interactions) {
                    if (!interaction.overrideBy) {
                        interaction.overrideBy = userId;
                        interaction.overrideReason = overrideReason;
                        interaction.overrideAt = now;
                    }
                }
            }
        }

        // Check if all overrides are complete
        let allOverridden = true;
        for (const medItem of prescription.medicines) {
            for (const interaction of medItem.interactions) {
                if (interaction.severity === 'major' && !interaction.overrideBy) {
                    allOverridden = false;
                    break;
                }
            }
        }

        prescription.safetyStatus.overrideComplete = allOverridden;
        await prescription.save();

        // CRITICAL: Audit log for override
        await createAuditLog({
            user: userId,
            action: 'update',
            entity: 'Prescription',
            entityId: prescriptionId,
            description: 'Drug interaction override recorded',
            metadata: {
                overrideReason,
                medicineIndex,
                overrideComplete: allOverridden,
            },
        });

        return prescription;
    }

    /**
     * Quick check for dispense stage.
     * Returns true if prescription is safe to dispense (no unoverridden major interactions).
     * 
     * @param {ObjectId} prescriptionId - Prescription ID
     * @returns {Object} - { canDispense: boolean, reason: string }
     */
    async canDispense(prescriptionId) {
        const prescription = await Prescription.findById(prescriptionId);

        if (!prescription) {
            return { canDispense: false, reason: 'Prescription not found' };
        }

        // Check if safety checks were done
        if (!prescription.safetyStatus?.allChecksComplete) {
            return { canDispense: false, reason: 'Safety checks not completed' };
        }

        // Check if override was required but not completed
        if (prescription.safetyStatus.overrideRequired && !prescription.safetyStatus.overrideComplete) {
            return { canDispense: false, reason: 'Major interaction override required but not completed' };
        }

        return { canDispense: true, reason: null };
    }

    /**
     * Send alerts for detected interactions.
     * 
     * @param {ObjectId} prescriptionId 
     * @param {Object} safetyResult 
     * @param {Array} recipientRoles - e.g., ['doctor', 'pharmacist', 'nurse']
     */
    async sendSafetyAlerts(prescriptionId, safetyResult, recipientRoles = []) {
        const prescription = await Prescription.findById(prescriptionId)
            .populate('doctor', '_id profile')
            .populate('patient', 'firstName lastName patientId');

        if (!prescription) return;

        const patientName = `${prescription.patient.firstName} ${prescription.patient.lastName}`;

        // Build alert message
        let alertTitle = 'Drug Interaction Alert';
        let alertMessage = `Prescription ${prescription.prescriptionNumber} for ${patientName}:\n`;

        if (safetyResult.hasMajor) {
            alertTitle = '[CRITICAL] Major Drug Interaction';
        }

        for (const interaction of safetyResult.interactions) {
            alertMessage += `• ${interaction.drug1.name} + ${interaction.drug2.name}: ${interaction.severity.toUpperCase()} - ${interaction.description}\n`;
        }

        for (const allergy of safetyResult.allergyConflicts) {
            alertMessage += `• ALLERGY: ${allergy.medicineName} conflicts with patient allergy to ${allergy.allergy}\n`;
        }

        // Send to doctor (always)
        if (prescription.doctor) {
            await notificationService.createNotification(
                prescription.doctor._id,
                safetyResult.hasMajor ? 'critical' : 'warning',
                alertTitle,
                alertMessage,
                { prescriptionId: prescriptionId }
            );
        }

        // TODO: Send to pharmacists and nurses based on recipientRoles and workflow stage
    }

    /**
     * Add a new interaction to the master database.
     * 
     * @param {Object} interactionData 
     * @param {ObjectId} userId 
     */
    async addInteraction(interactionData, userId) {
        const interaction = await DrugInteraction.create({
            ...interactionData,
            createdBy: userId,
        });

        await createAuditLog({
            user: userId,
            action: 'create',
            entity: 'DrugInteraction',
            entityId: interaction._id,
            description: `Added interaction between drugs`,
            metadata: interactionData,
        });

        return interaction;
    }
}

module.exports = new DrugInteractionService();
