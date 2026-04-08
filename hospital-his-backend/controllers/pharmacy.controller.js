const mongoose = require('mongoose');
const PharmacyInventory = require('../models/PharmacyInventory');
const PharmacyDispense = require('../models/PharmacyDispense');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const DrugRecall = require('../models/DrugRecall');
const DrugInteraction = require('../models/DrugInteraction');
const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { INVENTORY_STATUS, APPOINTMENT_STATUS } = require('../config/constants');

// Services
const drugInteractionService = require('../services/drugInteraction.service');
const drugRecallService = require('../services/drugRecall.service');
const pharmacySafetyService = require('../services/pharmacy.safety.service');
const marService = require('../services/mar.service');
const { addItemToBill } = require('../services/billing.internal.service');
const { createAuditLog } = require('../services/audit.service');

// ============================================================
// INVENTORY MANAGEMENT
// ============================================================

/**
 * @desc    Get all pharmacy inventory items (Batches)
 * @route   GET /api/pharmacy/inventory
 */
exports.getInventory = asyncHandler(async (req, res, next) => {
    const { search, status, medicine, recalled } = req.query;
    let query = {};

    if (search) {
        const matchingMedicines = await Medicine.find({
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { genericName: { $regex: search, $options: 'i' } },
                { medicineCode: { $regex: search, $options: 'i' } }
            ]
        }).select('_id');
        query.medicine = { $in: matchingMedicines.map(m => m._id) };
    }

    if (medicine) {
        query.medicine = medicine;
    }

    if (status) {
        query.status = status;
    }

    if (recalled === 'true') {
        query.isRecalled = true;
    } else if (recalled === 'false') {
        query.isRecalled = { $ne: true };
    }

    const inventory = await PharmacyInventory.find(query)
        .populate('medicine', 'name genericName category form strength unit medicineCode')
        .sort({ expiryDate: 1 });

    res.status(200).json({
        success: true,
        count: inventory.length,
        data: inventory,
    });
});

/**
 * @desc    Add stock (Create Medicine if new, then add Inventory Batch)
 * @route   POST /api/pharmacy/inventory
 */
exports.addMedicine = asyncHandler(async (req, res, next) => {
    const {
        name, genericName, category, form, strength, unit, mrp, manufacturer, medicineCode,
        batchNumber, expiryDate, quantity, purchaseRate, sellingRate, supplier, invoiceNumber,
        grnNumber, grnDate
    } = req.body;

    let medicine;
    if (medicineCode) {
        medicine = await Medicine.findOne({ medicineCode });
    } else {
        medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    }

    if (!medicine) {
        const formValue = (category || 'tablet').toLowerCase();
        medicine = await Medicine.create({
            name,
            genericName,
            category: category || 'General',
            form: formValue,
            strength,
            unit,
            mrp: mrp || sellingRate,
            manufacturer,
            medicineCode: medicineCode || `MED-${Date.now()}`,
            sellingPrice: sellingRate
        });
    }

    const inventoryItem = await PharmacyInventory.create({
        medicine: medicine._id,
        batchNumber,
        expiryDate,
        quantity,
        purchaseRate,
        sellingRate,
        supplier,
        invoiceNumber,
        grnNumber,
        grnDate,
        status: INVENTORY_STATUS.AVAILABLE
    });

    res.status(201).json({
        success: true,
        data: inventoryItem,
        medicine: medicine
    });
});

/**
 * @desc    Get batches in FEFO order for a medicine
 * @route   GET /api/pharmacy/batches/fefo/:medicineId
 */
exports.getBatchesFEFO = asyncHandler(async (req, res, next) => {
    const { medicineId } = req.params;
    const { quantity } = req.query;

    const result = await pharmacySafetyService.getBatchesFEFO(
        medicineId,
        parseInt(quantity) || 1
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * @desc    Get batches expiring within N days
 * @route   GET /api/pharmacy/batches/expiring
 */
exports.getExpiringBatches = asyncHandler(async (req, res, next) => {
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const batches = await PharmacyInventory.find({
        expiryDate: { $lte: expiryDate, $gt: new Date() },
        quantity: { $gt: 0 },
        isRecalled: { $ne: true },
    })
        .populate('medicine', 'name genericName')
        .sort({ expiryDate: 1 });

    res.status(200).json({
        success: true,
        count: batches.length,
        data: batches,
    });
});

/**
 * @desc    Get recalled batches
 * @route   GET /api/pharmacy/batches/recalled
 */
exports.getRecalledBatches = asyncHandler(async (req, res, next) => {
    const batches = await PharmacyInventory.find({
        isRecalled: true,
    })
        .populate('medicine', 'name genericName')
        .populate('recallRef', 'recallNumber reason status')
        .sort({ recalledAt: -1 });

    res.status(200).json({
        success: true,
        count: batches.length,
        data: batches,
    });
});

// ============================================================
// SAFETY CHECKS
// ============================================================

/**
 * @desc    Check drug-drug interactions
 * @route   POST /api/pharmacy/check-interactions
 */
exports.checkDrugInteractions = asyncHandler(async (req, res, next) => {
    const { medicineIds, patientId } = req.body;

    if (!medicineIds || !Array.isArray(medicineIds) || medicineIds.length === 0) {
        return next(new ErrorResponse('Medicine IDs array is required', 400));
    }

    const result = await drugInteractionService.checkInteractions(medicineIds, patientId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * @desc    Validate prescription safety
 * @route   POST /api/pharmacy/validate-prescription/:prescriptionId
 */
exports.validatePrescriptionSafety = asyncHandler(async (req, res, next) => {
    const { prescriptionId } = req.params;

    const result = await drugInteractionService.validatePrescriptionSafety(
        prescriptionId,
        req.user.id
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * @desc    Record interaction override
 * @route   POST /api/pharmacy/override-interaction/:prescriptionId
 */
exports.recordInteractionOverride = asyncHandler(async (req, res, next) => {
    const { prescriptionId } = req.params;
    const { medicineIndex, overrideReason } = req.body;

    if (!overrideReason || overrideReason.trim().length < 10) {
        return next(new ErrorResponse('Override reason must be at least 10 characters', 400));
    }

    const prescription = await drugInteractionService.recordOverride(
        prescriptionId,
        medicineIndex,
        overrideReason,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Override recorded successfully',
        data: prescription,
    });
});

/**
 * @desc    Pre-dispense comprehensive check
 * @route   POST /api/pharmacy/pre-dispense-check
 */
exports.preDispenseCheck = asyncHandler(async (req, res, next) => {
    const { prescriptionId, selectedBatches } = req.body;

    const result = await pharmacySafetyService.preDispenseChecks(
        prescriptionId,
        selectedBatches
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

// ============================================================
// DISPENSE
// ============================================================

/**
 * @desc    Get dispense queue (pending prescriptions)
 * @route   GET /api/pharmacy/dispense-queue
 */
exports.getDispenseQueue = asyncHandler(async (req, res, next) => {
    const prescriptions = await Prescription.find({
        isDispensed: false,
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('doctor', 'profile.firstName profile.lastName')
        .populate({
            path: 'medicines.medicine',
            select: 'name genericName strength'
        })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: prescriptions.length,
        data: prescriptions,
    });
});

/**
 * @desc    Dispense medicines with full safety checks
 * @route   POST /api/pharmacy/dispense
 */
exports.dispenseWithSafetyChecks = asyncHandler(async (req, res, next) => {
    const { prescriptionId, items, admissionId, notes } = req.body;
    // items: [{ medicineId, batchId, dispensedQuantity }]

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Get prescription
        const prescription = await Prescription.findById(prescriptionId)
            .populate('patient')
            .session(session);

        if (!prescription) {
            throw new ErrorResponse('Prescription not found', 404);
        }

        if (prescription.isDispensed) {
            throw new ErrorResponse('Prescription already dispensed', 400);
        }

        // 2. Run safety checks
        const selectedBatches = items.map(item => ({
            medicineId: item.medicineId,
            batchId: item.batchId,
            quantity: item.dispensedQuantity,
        }));

        const safetyCheck = await pharmacySafetyService.preDispenseChecks(
            prescriptionId,
            selectedBatches
        );

        if (!safetyCheck.canDispense) {
            throw new ErrorResponse(
                `Cannot dispense: ${safetyCheck.blockers.map(b => b.message).join('; ')}`,
                400
            );
        }

        // 3. Build dispense items and deduct stock
        const dispenseItems = [];
        const billingItems = [];

        for (const item of items) {
            const inventory = await PharmacyInventory.findById(item.batchId).session(session);
            const medicine = await Medicine.findById(item.medicineId).session(session);

            if (inventory.quantity < item.dispensedQuantity) {
                throw new ErrorResponse(`Insufficient stock for ${medicine.name}`, 400);
            }

            // Deduct stock
            inventory.quantity -= item.dispensedQuantity;
            if (inventory.quantity === 0) {
                inventory.status = INVENTORY_STATUS.OUT_OF_STOCK;
            } else if (inventory.quantity < 10) {
                inventory.status = INVENTORY_STATUS.LOW_STOCK;
            }
            await inventory.save({ session });

            // Build dispense item
            const prescribedItem = prescription.medicines.find(
                m => m.medicine.toString() === item.medicineId.toString()
            );

            dispenseItems.push({
                medicine: item.medicineId,
                inventoryBatch: item.batchId,
                batchNumber: inventory.batchNumber,
                expiryDate: inventory.expiryDate,
                supplier: inventory.supplier,
                grnNumber: inventory.grnNumber,
                prescribedQuantity: prescribedItem?.quantity || item.dispensedQuantity,
                dispensedQuantity: item.dispensedQuantity,
                unitPrice: inventory.sellingRate,
                totalPrice: inventory.sellingRate * item.dispensedQuantity,
                recallStatus: 'checked',
                recallCheckedAt: new Date(),
                interactionChecked: true,
            });

            // Billing item
            billingItems.push({
                itemType: 'medicine',
                itemReference: item.medicineId,
                description: `${medicine.name} (${medicine.strength || ''})`,
                quantity: item.dispensedQuantity,
                rate: inventory.sellingRate,
            });
        }

        // 4. Create dispense record
        const dispense = new PharmacyDispense({
            prescription: prescriptionId,
            patient: prescription.patient._id,
            items: dispenseItems,
            totalAmount: dispenseItems.reduce((sum, item) => sum + item.totalPrice, 0),
            discount: 0,
            netAmount: dispenseItems.reduce((sum, item) => sum + item.totalPrice, 0),
            dispensedBy: req.user.id,
            dispensedAt: new Date(),
            status: 'completed',
            notes,
            admission: admissionId,
        });

        await dispense.save({ session });

        // 5. Mark prescription as dispensed
        prescription.isDispensed = true;
        prescription.dispensedBy = req.user.id;
        prescription.dispensedAt = new Date();
        await prescription.save({ session });

        await session.commitTransaction();

        // 6. Post-transaction: Billing and MAR (outside transaction to avoid locks)
        // Add billing items
        const visit = prescription.visit;
        const visitType = prescription.visitModel.toLowerCase();

        for (const item of billingItems) {
            try {
                await addItemToBill({
                    patientId: prescription.patient._id,
                    visitId: visit,
                    visitType,
                    itemType: item.itemType,
                    itemReference: item.itemReference,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    generatedBy: req.user.id,
                });
            } catch (err) {
                console.error('Billing error:', err);
            }
        }

        // Create MAR schedule for IPD
        if (admissionId) {
            try {
                await marService.createMARSchedule(dispense._id, admissionId);
                dispense.marScheduleCreated = true;
                await dispense.save();
            } catch (err) {
                console.error('MAR creation error:', err);
            }
        }

        // Audit log
        await createAuditLog({
            user: req.user.id,
            action: 'create',
            entity: 'PharmacyDispense',
            entityId: dispense._id,
            description: `Dispensed ${dispenseItems.length} items for prescription ${prescription.prescriptionNumber}`,
        });

        res.status(201).json({
            success: true,
            message: 'Medicines dispensed successfully',
            data: dispense,
            warnings: safetyCheck.warnings,
        });

    } catch (error) {
        await session.abortTransaction();
        return next(error);
    } finally {
        session.endSession();
    }
});

/**
 * @desc    Get dispense traceability
 * @route   GET /api/pharmacy/dispense/:id/traceability
 */
exports.getDispenseTraceability = asyncHandler(async (req, res, next) => {
    const dispense = await PharmacyDispense.findById(req.params.id)
        .populate('patient', 'patientId firstName lastName')
        .populate('prescription')
        .populate('dispensedBy', 'profile.firstName profile.lastName')
        .populate('items.medicine', 'name genericName')
        .populate('items.inventoryBatch', 'batchNumber expiryDate supplier grnNumber');

    if (!dispense) {
        return next(new ErrorResponse('Dispense record not found', 404));
    }

    res.status(200).json({
        success: true,
        data: dispense,
    });
});

// ============================================================
// DRUG RECALLS
// ============================================================

/**
 * @desc    Initiate drug recall
 * @route   POST /api/pharmacy/recalls
 */
exports.initiateRecall = asyncHandler(async (req, res, next) => {
    const { medicineId, batches, reason, regulatoryReference, recallClass } = req.body;

    const result = await drugRecallService.initiateRecall(
        medicineId,
        batches,
        reason,
        regulatoryReference,
        recallClass,
        req.user.id
    );

    res.status(201).json({
        success: true,
        message: `Recall initiated. ${result.blockedBatchCount} batches blocked. ${result.affectedPatientCount} patients affected.`,
        data: result.recall,
    });
});

/**
 * @desc    Get recalls
 * @route   GET /api/pharmacy/recalls
 */
exports.getRecalls = asyncHandler(async (req, res, next) => {
    const { status } = req.query;

    let recalls;
    if (status === 'active') {
        recalls = await drugRecallService.getActiveRecalls();
    } else {
        recalls = await DrugRecall.find(status ? { status } : {})
            .populate('medicine', 'name genericName medicineCode')
            .sort({ recallDate: -1 });
    }

    res.status(200).json({
        success: true,
        count: recalls.length,
        data: recalls,
    });
});

/**
 * @desc    Get recall by ID
 * @route   GET /api/pharmacy/recalls/:id
 */
exports.getRecallById = asyncHandler(async (req, res, next) => {
    const recall = await DrugRecall.findById(req.params.id)
        .populate('medicine', 'name genericName medicineCode')
        .populate('initiatedBy', 'profile.firstName profile.lastName')
        .populate('actionsTaken.takenBy', 'profile.firstName profile.lastName');

    if (!recall) {
        return next(new ErrorResponse('Recall not found', 404));
    }

    res.status(200).json({
        success: true,
        data: recall,
    });
});

/**
 * @desc    Get affected patients
 * @route   GET /api/pharmacy/recalls/:id/affected-patients
 */
exports.getAffectedPatients = asyncHandler(async (req, res, next) => {
    const patients = await drugRecallService.getAffectedPatients(req.params.id);

    res.status(200).json({
        success: true,
        count: patients.length,
        data: patients,
    });
});

/**
 * @desc    Send recall notifications
 * @route   POST /api/pharmacy/recalls/:id/notify
 */
exports.notifyAffectedParties = asyncHandler(async (req, res, next) => {
    const result = await drugRecallService.notifyAffectedParties(
        req.params.id,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: `Notifications sent to ${result.notifiedCount.patients} patients`,
        data: result,
    });
});

/**
 * @desc    Resolve recall
 * @route   POST /api/pharmacy/recalls/:id/resolve
 */
exports.resolveRecall = asyncHandler(async (req, res, next) => {
    const { resolutionNotes } = req.body;

    const recall = await drugRecallService.resolveRecall(
        req.params.id,
        resolutionNotes,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Recall resolved',
        data: recall,
    });
});

// ============================================================
// DRUG INTERACTIONS MASTER
// ============================================================

/**
 * @desc    Get drug interactions
 * @route   GET /api/pharmacy/interactions
 */
exports.getDrugInteractions = asyncHandler(async (req, res, next) => {
    const { severity, drug } = req.query;

    let query = { isActive: true };
    if (severity) query.severity = severity;
    if (drug) {
        query.$or = [{ drug1: drug }, { drug2: drug }];
    }

    const interactions = await DrugInteraction.find(query)
        .populate('drug1', 'name genericName')
        .populate('drug2', 'name genericName')
        .sort({ severity: 1, createdAt: -1 });

    res.status(200).json({
        success: true,
        count: interactions.length,
        data: interactions,
    });
});

/**
 * @desc    Add drug interaction
 * @route   POST /api/pharmacy/interactions
 */
exports.addDrugInteraction = asyncHandler(async (req, res, next) => {
    const interaction = await drugInteractionService.addInteraction(
        req.body,
        req.user.id
    );

    res.status(201).json({
        success: true,
        data: interaction,
    });
});

// Legacy export for backward compatibility
exports.dispenseMedicines = exports.dispenseWithSafetyChecks;
