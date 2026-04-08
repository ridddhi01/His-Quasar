/**
 * Clinical Coding Service
 * Business logic for clinical coding operations with status-driven workflow
 */

const ClinicalCodingRecord = require('../models/ClinicalCodingRecord');
const ProcedureCode = require('../models/ProcedureCode');
const Billing = require('../models/Billing');
const { CLINICAL_CODING_STATUS } = require('../config/constants');

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid status transitions map
 * Key: current status, Value: array of allowed next statuses
 */
const VALID_TRANSITIONS = {
    [CLINICAL_CODING_STATUS.AWAITING_CODING]: [CLINICAL_CODING_STATUS.IN_PROGRESS],
    [CLINICAL_CODING_STATUS.IN_PROGRESS]: [
        CLINICAL_CODING_STATUS.PENDING_REVIEW,
        CLINICAL_CODING_STATUS.APPROVED, // Allow direct approval for senior coders
    ],
    [CLINICAL_CODING_STATUS.PENDING_REVIEW]: [
        CLINICAL_CODING_STATUS.APPROVED,
        CLINICAL_CODING_STATUS.RETURNED,
    ],
    [CLINICAL_CODING_STATUS.RETURNED]: [CLINICAL_CODING_STATUS.IN_PROGRESS],
    [CLINICAL_CODING_STATUS.APPROVED]: [], // Terminal state
};

/**
 * Validate status transition
 */
exports.validateTransition = (currentStatus, newStatus) => {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
};

/**
 * Get allowed transitions for a status
 */
exports.getAllowedTransitions = (currentStatus) => {
    return VALID_TRANSITIONS[currentStatus] || [];
};

/**
 * Get human-readable error for blocked transition
 */
exports.getTransitionBlockedReason = (currentStatus, attemptedStatus) => {
    const messages = {
        [CLINICAL_CODING_STATUS.AWAITING_CODING]: 'Record must be started (moved to In Progress) before further actions.',
        [CLINICAL_CODING_STATUS.IN_PROGRESS]: 'Record must be submitted for review before approval.',
        [CLINICAL_CODING_STATUS.PENDING_REVIEW]: 'Record is pending review. Only approval or return actions are allowed.',
        [CLINICAL_CODING_STATUS.RETURNED]: 'Record was returned. It must be re-submitted before approval.',
        [CLINICAL_CODING_STATUS.APPROVED]: 'Record is already approved. No further status changes allowed.',
    };

    return messages[currentStatus] || `Cannot transition from ${currentStatus} to ${attemptedStatus}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a coding record for an encounter
 * Called automatically when an encounter is finalized
 */
exports.createCodingForEncounter = async (data) => {
    // Check if record already exists for this encounter
    const existing = await ClinicalCodingRecord.findOne({
        encounter: data.encounter,
        encounterModel: data.encounterModel,
    });

    if (existing) {
        console.log(`[ClinicalCoding] Record already exists for encounter ${data.encounter}`);
        return existing;
    }

    // Create new coding record
    const codingRecord = await ClinicalCodingRecord.create({
        patient: data.patient,
        encounter: data.encounter,
        encounterModel: data.encounterModel,
        encounterType: data.encounterType,
        finalizingDoctor: data.finalizingDoctor,
        status: CLINICAL_CODING_STATUS.AWAITING_CODING,
        createdBy: data.createdBy,
        auditTrail: [{
            action: 'created',
            performedBy: data.createdBy,
            performedAt: new Date(),
            details: { source: 'auto-created on encounter finalization' },
        }],
    });

    console.log(`[ClinicalCoding] Created record ${codingRecord.codingNumber} for encounter ${data.encounter}`);
    return codingRecord;
};

/**
 * Add procedure codes to a coding record
 */
exports.addProcedureCodes = async (recordId, codes, userId) => {
    const record = await ClinicalCodingRecord.findById(recordId);
    if (!record) {
        throw new Error('Coding record not found');
    }

    // Can only add codes when awaiting-coding, in-progress, or returned
    const editableStatuses = [
        CLINICAL_CODING_STATUS.AWAITING_CODING,
        CLINICAL_CODING_STATUS.IN_PROGRESS,
        CLINICAL_CODING_STATUS.RETURNED,
    ];
    if (!editableStatuses.includes(record.status)) {
        throw new Error(`Cannot add codes when status is ${record.status}. Record must be in editable state.`);
    }

    for (const codeData of codes) {
        // Validate procedure code exists
        const procedureCode = await ProcedureCode.findById(codeData.codeId);
        if (!procedureCode) {
            throw new Error(`Procedure code not found: ${codeData.codeId}`);
        }

        record.assignedCodes.push({
            code: codeData.codeId,
            quantity: codeData.quantity || 1,
            modifier: codeData.modifier,
            modifier2: codeData.modifier2,
            diagnosisPointer: codeData.diagnosisPointer,
            units: codeData.units || 1,
            amount: codeData.amount || procedureCode.baseRate || 0,
            notes: codeData.notes,
            addedBy: userId,
            addedAt: new Date(),
        });
    }

    // Auto-transition from awaiting-coding to in-progress when first code added
    if (record.status === CLINICAL_CODING_STATUS.AWAITING_CODING) {
        record.status = CLINICAL_CODING_STATUS.IN_PROGRESS;
        record.addAuditEntry('status_changed', userId, { trigger: 'first_code_added' }, {
            from: CLINICAL_CODING_STATUS.AWAITING_CODING,
            to: CLINICAL_CODING_STATUS.IN_PROGRESS,
        });
    }

    record.codedBy = userId;
    record.codedAt = new Date();

    record.addAuditEntry('codes_added', userId, {
        codesAdded: codes.length,
        codeIds: codes.map(c => c.codeId),
    });

    await record.save();
    return record;
};

/**
 * Remove a procedure code from a coding record
 */
exports.removeProcedureCode = async (recordId, assignedCodeId, userId) => {
    const record = await ClinicalCodingRecord.findById(recordId);
    if (!record) {
        throw new Error('Coding record not found');
    }

    // Can only remove codes when in editable state
    const editableStatuses = [
        CLINICAL_CODING_STATUS.AWAITING_CODING,
        CLINICAL_CODING_STATUS.IN_PROGRESS,
        CLINICAL_CODING_STATUS.RETURNED,
    ];
    if (!editableStatuses.includes(record.status)) {
        throw new Error(`Cannot remove codes when status is ${record.status}.`);
    }

    const codeIndex = record.assignedCodes.findIndex(
        c => c._id.toString() === assignedCodeId
    );

    if (codeIndex === -1) {
        throw new Error('Assigned code not found');
    }

    const removedCode = record.assignedCodes.splice(codeIndex, 1)[0];

    record.addAuditEntry('codes_removed', userId, {
        removedCodeId: removedCode.code,
    });

    await record.save();
    return record;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start coding (move from awaiting-coding to in-progress)
 */
exports.startCoding = async (recordId, userId) => {
    const record = await ClinicalCodingRecord.findById(recordId);
    if (!record) {
        throw new Error('Coding record not found');
    }

    if (record.status !== CLINICAL_CODING_STATUS.AWAITING_CODING) {
        throw new Error(this.getTransitionBlockedReason(record.status, CLINICAL_CODING_STATUS.IN_PROGRESS));
    }

    const previousStatus = record.status;
    record.status = CLINICAL_CODING_STATUS.IN_PROGRESS;
    record.codedBy = userId;

    record.addAuditEntry('started_coding', userId, {}, {
        from: previousStatus,
        to: CLINICAL_CODING_STATUS.IN_PROGRESS,
    });

    await record.save();
    return record;
};

/**
 * Submit coding for review (move from in-progress to pending-review)
 */
exports.submitForReview = async (recordId, userId) => {
    const record = await ClinicalCodingRecord.findById(recordId);
    if (!record) {
        throw new Error('Coding record not found');
    }

    // Can submit from in-progress or returned
    const submittableStatuses = [
        CLINICAL_CODING_STATUS.IN_PROGRESS,
        CLINICAL_CODING_STATUS.RETURNED,
    ];
    if (!submittableStatuses.includes(record.status)) {
        throw new Error(this.getTransitionBlockedReason(record.status, CLINICAL_CODING_STATUS.PENDING_REVIEW));
    }

    // Must have at least one code to submit
    if (!record.assignedCodes || record.assignedCodes.length === 0) {
        throw new Error('Cannot submit for review without assigned procedure codes.');
    }

    const previousStatus = record.status;
    record.status = CLINICAL_CODING_STATUS.PENDING_REVIEW;
    record.submittedBy = userId;
    record.submittedAt = new Date();
    record.currentReturnReason = null; // Clear any previous return reason

    // Mark previous return as resolved if coming from returned status
    if (previousStatus === CLINICAL_CODING_STATUS.RETURNED && record.returnHistory.length > 0) {
        const lastReturn = record.returnHistory[record.returnHistory.length - 1];
        if (!lastReturn.resolvedAt) {
            lastReturn.resolvedAt = new Date();
        }
    }

    record.addAuditEntry('submitted_for_review', userId, {
        codeCount: record.assignedCodes.length,
    }, {
        from: previousStatus,
        to: CLINICAL_CODING_STATUS.PENDING_REVIEW,
    });

    await record.save();
    return record;
};

/**
 * Approve coding (move from pending-review to approved)
 * Only senior coders and admins can approve
 */
exports.approveCoding = async (recordId, userId) => {
    const record = await ClinicalCodingRecord.findById(recordId);
    if (!record) {
        throw new Error('Coding record not found');
    }

    const approvableStatuses = [CLINICAL_CODING_STATUS.PENDING_REVIEW, CLINICAL_CODING_STATUS.IN_PROGRESS];
    if (!approvableStatuses.includes(record.status)) {
        throw new Error(`Cannot approve record in status ${record.status}`);
    }

    // Populate codes to get details for billing
    await record.populate('assignedCodes.code');

    const previousStatus = record.status;
    record.status = CLINICAL_CODING_STATUS.APPROVED;
    record.approvedBy = userId;
    record.approvedAt = new Date();
    record.reviewedBy = userId;
    record.reviewedAt = new Date();

    record.addAuditEntry('approved', userId, {
        previousStatus,
    });

    await record.save();

    // Auto-sync to billing
    try {
        await this.syncToBilling(record._id, userId);
    } catch (err) {
        console.error(`[ClinicalCoding] Auto-sync failed for ${record.codingNumber}:`, err);
        // We don't fail the approval, but logged for manual retry
    }

    return record;
};

/**
 * Sync coding record to billing (Core Logic)
 * Can be called automatically or manually
 */
exports.syncToBilling = async (recordId, userId) => {
    const record = await ClinicalCodingRecord.findById(recordId)
        .populate('assignedCodes.code')
        .populate('patient');

    if (!record) throw new Error('Coding record not found');
    if (record.status !== CLINICAL_CODING_STATUS.APPROVED) {
        throw new Error('Only approved records can be synced to billing.');
    }

    // 1. Find or Create Draft Bill
    let bill = await Billing.findOne({
        visit: record.encounter,
        status: 'draft'
    });

    if (!bill) {
        bill = new Billing({
            patient: record.patient._id,
            visit: record.encounter,
            visitModel: record.encounterModel,
            visitType: record.encounterType || 'opd',
            status: 'draft',
            generatedBy: userId,
            items: []
        });
    }

    // 2. Identify existing procedure items to avoid duplicates if re-syncing
    // We assume items with isSystemGenerated=true and itemType='procedure' are coding items
    const existingSystemIds = bill.items
        .filter(i => i.itemType === 'procedure' && i.isSystemGenerated && i.itemReference)
        .map(i => i.itemReference.toString());

    // 3. Convert codes to bill items
    const newItems = [];

    for (const item of record.assignedCodes) {
        const codeId = item.code?._id?.toString();

        if (!record.linkedBill || !existingSystemIds.includes(codeId)) {
            // Tariff Lookup Logic
            let rate = item.amount || item.code?.baseRate || 0;

            // Try to find a matching tariff
            const Tariff = require('../models/Tariff');
            const tariff = await Tariff.findOne({
                tariffCode: item.code?.code,
                isActive: true
            });

            if (tariff) {
                rate = tariff.basePrice;
            }

            // Format description: Code - Description
            const codePrefix = item.code?.code ? `${item.code.code} - ` : '';
            // Use short description if available for cleaner bills, otherwise full description
            const descText = item.code?.shortDescription || item.code?.description || 'Procedure Code';

            newItems.push({
                itemType: 'procedure',
                itemReference: item.code?._id,
                description: `${codePrefix}${descText}`,
                quantity: item.quantity || 1,
                rate: rate,
                amount: rate * (item.quantity || 1),
                netAmount: rate * (item.quantity || 1),
                isSystemGenerated: true,
                isBilled: true,
                billedAt: new Date()
            });
        }
    }

    if (newItems.length > 0) {
        bill.items.push(...newItems);

        // Trigger save which calculates totals
        await bill.save();

        console.log(`[ClinicalCoding] Synced ${newItems.length} items to Bill ${bill.billNumber}`);
    } else {
        console.log('[ClinicalCoding] No new items to sync to billing.');
    }

    // 4. Link back to record
    if (!record.linkedBill || record.linkedBill.toString() !== bill._id.toString()) {
        record.linkedBill = bill._id;
        record.billSyncedAt = new Date();

        record.addAuditEntry('synced_to_billing', userId, {
            billId: bill._id,
            itemCount: newItems.length
        });

        await record.save();
    }

    return { record, bill };
};

/**
 * Manual trigger for billing sync
 */
exports.manualSyncToBilling = async (recordId, userId) => {
    return this.syncToBilling(recordId, userId);
};


/**
 * Return coding for correction (move from pending-review to returned)
 * Only senior coders and admins can return
 * Reason is mandatory
 */
exports.returnForCorrection = async (recordId, userId, reason) => {
    const record = await ClinicalCodingRecord.findById(recordId);
    if (!record) {
        throw new Error('Coding record not found');
    }

    if (record.status !== CLINICAL_CODING_STATUS.PENDING_REVIEW) {
        throw new Error(this.getTransitionBlockedReason(record.status, CLINICAL_CODING_STATUS.RETURNED));
    }

    if (!reason || reason.trim().length === 0) {
        throw new Error('Return reason is mandatory.');
    }

    const previousStatus = record.status;
    record.status = CLINICAL_CODING_STATUS.RETURNED;
    record.currentReturnReason = reason.trim();

    // Add to return history
    record.returnHistory.push({
        returnedBy: userId,
        returnedAt: new Date(),
        reason: reason.trim(),
    });

    record.addAuditEntry('returned_for_correction', userId, {
        reason: reason.trim(),
    }, {
        from: previousStatus,
        to: CLINICAL_CODING_STATUS.RETURNED,
    });

    await record.save();
    return record;
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get coding records with filters
 */
exports.getCodingRecords = async (filters = {}, options = {}) => {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.encounterType) query.encounterType = filters.encounterType;
    if (filters.patient) query.patient = filters.patient;
    if (filters.finalizingDoctor) query.finalizingDoctor = filters.finalizingDoctor;
    if (filters.codedBy) query.codedBy = filters.codedBy;

    // Date range filter
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        ClinicalCodingRecord.find(query)
            .populate('patient', 'patientId firstName lastName')
            .populate('finalizingDoctor', 'profile')
            .populate('codedBy', 'profile')
            .populate('submittedBy', 'profile')
            .populate('approvedBy', 'profile')
            .populate('assignedCodes.code')
            .populate('returnHistory.returnedBy', 'profile')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        ClinicalCodingRecord.countDocuments(query),
    ]);

    return {
        records,
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};

/**
 * Get records pending review (for senior coder dashboard)
 */
exports.getPendingReview = async (options = {}) => {
    return this.getCodingRecords({ status: CLINICAL_CODING_STATUS.PENDING_REVIEW }, options);
};

/**
 * Get coding record by encounter
 */
exports.getCodingByEncounter = async (encounterId, encounterModel) => {
    return ClinicalCodingRecord.findOne({
        encounter: encounterId,
        encounterModel,
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('encounter')
        .populate('finalizingDoctor', 'profile')
        .populate('codedBy', 'profile')
        .populate('submittedBy', 'profile')
        .populate('approvedBy', 'profile')
        .populate('reviewedBy', 'profile')
        .populate('assignedCodes.code')
        .populate('assignedCodes.addedBy', 'profile')
        .populate('returnHistory.returnedBy', 'profile');
};

/**
 * Sync coding record to billing
 */
// Duplicate syncToBilling removed. See lines 326-413 for implementation.

// Export status constants for convenience
exports.CLINICAL_CODING_STATUS = CLINICAL_CODING_STATUS;
exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
