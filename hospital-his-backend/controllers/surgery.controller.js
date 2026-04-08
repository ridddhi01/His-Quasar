const Surgery = require('../models/Surgery');
const Billing = require('../models/Billing');
const { SURGERY_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { createAuditLog } = require('../services/audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULING & BASIC CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Schedule surgery
 * @route   POST /api/surgery/schedule
 */
exports.scheduleSurgery = asyncHandler(async (req, res, next) => {
    // Generate surgery number: SURG + YYYYMMDD + sequence
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Find the count of surgeries created today to generate sequence
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const countToday = await Surgery.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const sequence = String(countToday + 1).padStart(3, '0');
    const surgeryNumber = `SURG${dateStr}${sequence}`;

    const surgery = await Surgery.create({
        ...req.body,
        surgeryNumber
    });
    await surgery.populate(['patient', 'surgeon', 'admission']);

    await createAuditLog({
        user: req.user.id,
        action: 'CREATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Scheduled surgery ${surgery.surgeryNumber}`,
    });

    res.status(201).json({
        success: true,
        data: surgery,
    });
});

/**
 * @desc    Get all schedules
 * @route   GET /api/surgery/schedules
 */
exports.getAllSchedules = asyncHandler(async (req, res, next) => {
    const { status, date, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (date) query.scheduledDate = new Date(date);

    const skip = (page - 1) * limit;

    const schedules = await Surgery.find(query)
        .populate('patient', 'patientId firstName lastName')
        .populate('surgeon', 'profile.firstName profile.lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ scheduledDate: 1, scheduledTime: 1 });

    const total = await Surgery.countDocuments(query);

    res.status(200).json({
        success: true,
        count: schedules.length,
        total,
        page: parseInt(page),
        data: schedules,
    });
});

/**
 * @desc    Get schedule by ID
 * @route   GET /api/surgery/schedules/:id
 */
exports.getScheduleById = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .populate('patient')
        .populate('surgeon', 'profile')
        .populate('assistantSurgeons', 'profile')
        .populate('anesthetist', 'profile')
        .populate('nurses', 'profile')
        .populate('billingId');

    if (!surgery) {
        return next(new ErrorResponse('Surgery schedule not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery,
    });
});

/**
 * @desc    Update schedule
 * @route   PUT /api/surgery/schedules/:id
 */
exports.updateSchedule = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!surgery) {
        return next(new ErrorResponse('Surgery schedule not found', 404));
    }

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Updated surgery ${surgery.surgeryNumber}`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: surgery,
    });
});

/**
 * @desc    Get OT roster
 * @route   GET /api/surgery/ot-roster
 */
exports.getOTRoster = asyncHandler(async (req, res, next) => {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const roster = await Surgery.find({
        scheduledDate: { $gte: targetDate, $lt: nextDay },
        status: { $ne: SURGERY_STATUS.CANCELLED },
    })
        .populate('patient', 'patientId firstName lastName')
        .populate('surgeon', 'profile.firstName profile.lastName')
        .populate('anesthetist', 'profile.firstName profile.lastName')
        .sort({ scheduledTime: 1 });

    res.status(200).json({
        success: true,
        count: roster.length,
        data: roster,
    });
});

/**
 * @desc    Get surgery dashboard
 * @route   GET /api/surgery/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayScheduled, inProgress, completed, cancelled] = await Promise.all([
        Surgery.countDocuments({
            scheduledDate: { $gte: today, $lt: tomorrow },
        }),
        Surgery.countDocuments({ status: SURGERY_STATUS.IN_PROGRESS }),
        Surgery.countDocuments({
            status: SURGERY_STATUS.COMPLETED,
            actualEndTime: { $gte: today },
        }),
        Surgery.countDocuments({
            status: SURGERY_STATUS.CANCELLED,
            updatedAt: { $gte: today },
        }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            todayScheduled,
            inProgress,
            completedToday: completed,
            cancelledToday: cancelled,
        },
    });
});

/**
 * @desc    Start surgery
 * @route   POST /api/surgery/schedules/:id/start
 */
exports.startSurgery = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    surgery.status = SURGERY_STATUS.IN_PROGRESS;
    surgery.actualStartTime = new Date();
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Started surgery ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery,
    });
});

/**
 * @desc    Complete surgery
 * @route   POST /api/surgery/schedules/:id/complete
 */
exports.completeSurgery = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    surgery.status = SURGERY_STATUS.COMPLETED;
    surgery.actualEndTime = new Date();
    surgery.complications = req.body.complications || surgery.complications;
    surgery.postOpInstructions = req.body.postOpInstructions || surgery.postOpInstructions;
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Completed surgery ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery,
    });
});

/**
 * @desc    Cancel surgery
 * @route   POST /api/surgery/schedules/:id/cancel
 */
exports.cancelSurgery = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    surgery.status = SURGERY_STATUS.CANCELLED;
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Cancelled surgery ${surgery.surgeryNumber}`,
        changes: { reason: req.body.reason },
    });

    res.status(200).json({
        success: true,
        data: surgery,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-OP ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add pre-op assessment
 * @route   POST /api/surgery/schedules/:id/pre-op-assessment
 */
exports.addPreOpAssessment = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    surgery.preOpAssessment = {
        ...req.body,
        assessedBy: req.user.id,
        assessmentDate: new Date(),
    };
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Added pre-op assessment for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery,
    });
});

/**
 * @desc    Get pre-op assessment
 * @route   GET /api/surgery/schedules/:id/pre-op-assessment
 */
exports.getPreOpAssessment = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber preOpAssessment')
        .populate('preOpAssessment.assessedBy', 'profile.firstName profile.lastName')
        .populate('preOpAssessment.consent.witnessedBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.preOpAssessment || {},
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WHO SURGICAL SAFETY CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Update WHO checklist – Sign In
 * @route   POST /api/surgery/schedules/:id/who-checklist/sign-in
 */
exports.updateWHOSignIn = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.whoChecklist) {
        surgery.whoChecklist = {};
    }

    surgery.whoChecklist.signIn = {
        ...req.body,
        completedAt: new Date(),
        completedBy: req.user.id,
    };
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Completed WHO Sign-In for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.whoChecklist,
    });
});

/**
 * @desc    Update WHO checklist – Time Out
 * @route   POST /api/surgery/schedules/:id/who-checklist/time-out
 */
exports.updateWHOTimeOut = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.whoChecklist) {
        surgery.whoChecklist = {};
    }

    surgery.whoChecklist.timeOut = {
        ...req.body,
        completedAt: new Date(),
        completedBy: req.user.id,
    };
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Completed WHO Time-Out for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.whoChecklist,
    });
});

/**
 * @desc    Update WHO checklist – Sign Out
 * @route   POST /api/surgery/schedules/:id/who-checklist/sign-out
 */
exports.updateWHOSignOut = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.whoChecklist) {
        surgery.whoChecklist = {};
    }

    surgery.whoChecklist.signOut = {
        ...req.body,
        completedAt: new Date(),
        completedBy: req.user.id,
    };
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Completed WHO Sign-Out for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.whoChecklist,
    });
});

/**
 * @desc    Get full WHO checklist
 * @route   GET /api/surgery/schedules/:id/who-checklist
 */
exports.getWHOChecklist = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber whoChecklist')
        .populate('whoChecklist.signIn.completedBy', 'profile.firstName profile.lastName')
        .populate('whoChecklist.timeOut.completedBy', 'profile.firstName profile.lastName')
        .populate('whoChecklist.signOut.completedBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.whoChecklist || {},
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANESTHESIA RECORD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add/update anesthesia record
 * @route   POST /api/surgery/schedules/:id/anesthesia-record
 */
exports.addAnesthesiaRecord = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    surgery.anesthesiaRecord = {
        ...surgery.anesthesiaRecord?.toObject(),
        ...req.body,
        recordedBy: req.user.id,
    };
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Updated anesthesia record for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.anesthesiaRecord,
    });
});

/**
 * @desc    Add vitals reading to anesthesia timeline
 * @route   POST /api/surgery/schedules/:id/anesthesia-record/vitals
 */
exports.addAnesthesiaVitals = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.anesthesiaRecord) {
        surgery.anesthesiaRecord = { vitalsTimeline: [] };
    }
    if (!surgery.anesthesiaRecord.vitalsTimeline) {
        surgery.anesthesiaRecord.vitalsTimeline = [];
    }

    surgery.anesthesiaRecord.vitalsTimeline.push({
        time: new Date(),
        ...req.body,
    });
    await surgery.save();

    res.status(200).json({
        success: true,
        data: surgery.anesthesiaRecord.vitalsTimeline,
    });
});

/**
 * @desc    Add drug to anesthesia record
 * @route   POST /api/surgery/schedules/:id/anesthesia-record/drug
 */
exports.addAnesthesiaDrug = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.anesthesiaRecord) {
        surgery.anesthesiaRecord = { drugsAdministered: [] };
    }
    if (!surgery.anesthesiaRecord.drugsAdministered) {
        surgery.anesthesiaRecord.drugsAdministered = [];
    }

    surgery.anesthesiaRecord.drugsAdministered.push({
        ...req.body,
        timeGiven: new Date(),
        givenBy: req.user.id,
    });
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Added anesthesia drug for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.anesthesiaRecord.drugsAdministered,
    });
});

/**
 * @desc    Get anesthesia record
 * @route   GET /api/surgery/schedules/:id/anesthesia-record
 */
exports.getAnesthesiaRecord = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber anesthesiaRecord')
        .populate('anesthesiaRecord.recordedBy', 'profile.firstName profile.lastName')
        .populate('anesthesiaRecord.drugsAdministered.givenBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.anesthesiaRecord || {},
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLANTS & CONSUMABLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add implant or consumable
 * @route   POST /api/surgery/schedules/:id/implants-consumables
 */
exports.addImplantConsumable = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.implantsAndConsumables) {
        surgery.implantsAndConsumables = [];
    }

    surgery.implantsAndConsumables.push({
        ...req.body,
        addedBy: req.user.id,
        addedAt: new Date(),
    });
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Added ${req.body.itemType} "${req.body.itemName}" for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.implantsAndConsumables,
    });
});

/**
 * @desc    Get implants and consumables
 * @route   GET /api/surgery/schedules/:id/implants-consumables
 */
exports.getImplantsConsumables = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber implantsAndConsumables')
        .populate('implantsAndConsumables.addedBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.implantsAndConsumables || [],
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTRA-OP NOTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add intra-op note
 * @route   POST /api/surgery/schedules/:id/intra-op-notes
 */
exports.addIntraOpNote = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.intraOpNotes) {
        surgery.intraOpNotes = [];
    }

    surgery.intraOpNotes.push({
        note: req.body.note,
        time: new Date(),
        recordedBy: req.user.id,
    });
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Added intra-op note for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.intraOpNotes,
    });
});

/**
 * @desc    Get intra-op notes
 * @route   GET /api/surgery/schedules/:id/intra-op-notes
 */
exports.getIntraOpNotes = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber intraOpNotes')
        .populate('intraOpNotes.recordedBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.intraOpNotes || [],
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST-OP ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add post-op order
 * @route   POST /api/surgery/schedules/:id/post-op-orders
 */
exports.addPostOpOrder = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.postOpOrders) {
        surgery.postOpOrders = [];
    }

    surgery.postOpOrders.push({
        ...req.body,
        orderedBy: req.user.id,
        orderedAt: new Date(),
        status: 'pending',
    });
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Added post-op order for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.postOpOrders,
    });
});

/**
 * @desc    Get post-op orders
 * @route   GET /api/surgery/schedules/:id/post-op-orders
 */
exports.getPostOpOrders = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber postOpOrders')
        .populate('postOpOrders.orderedBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.postOpOrders || [],
    });
});

/**
 * @desc    Update post-op order status
 * @route   PUT /api/surgery/schedules/:id/post-op-orders/:orderIndex
 */
exports.updatePostOpOrderStatus = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    const orderIndex = parseInt(req.params.orderIndex);
    if (!surgery.postOpOrders || !surgery.postOpOrders[orderIndex]) {
        return next(new ErrorResponse('Post-op order not found', 404));
    }

    surgery.postOpOrders[orderIndex].status = req.body.status;
    await surgery.save();

    res.status(200).json({
        success: true,
        data: surgery.postOpOrders,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INFECTION CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Add/update infection control record
 * @route   POST /api/surgery/schedules/:id/infection-control
 */
exports.updateInfectionControl = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id);

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    surgery.infectionControl = {
        ...surgery.infectionControl?.toObject(),
        ...req.body,
        reportedBy: req.user.id,
        reportedAt: new Date(),
    };
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'UPDATE',
        entity: 'Surgery',
        entityId: surgery._id,
        description: `Updated infection control for ${surgery.surgeryNumber}`,
    });

    res.status(200).json({
        success: true,
        data: surgery.infectionControl,
    });
});

/**
 * @desc    Get infection control record
 * @route   GET /api/surgery/schedules/:id/infection-control
 */
exports.getInfectionControl = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id)
        .select('surgeryNumber infectionControl')
        .populate('infectionControl.reportedBy', 'profile.firstName profile.lastName');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.infectionControl || {},
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OT BILLING INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Generate OT billing
 * @route   POST /api/surgery/schedules/:id/generate-billing
 */
exports.generateOTBilling = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id).populate('patient admission');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (surgery.billingGenerated) {
        return next(new ErrorResponse('Billing already generated for this surgery', 400));
    }

    // Build billing items
    const items = [];

    // OT Charges (base)
    if (req.body.otCharges) {
        items.push({
            description: `OT Charges - ${surgery.surgeryType}`,
            category: 'OT',
            quantity: 1,
            unitPrice: req.body.otCharges,
            amount: req.body.otCharges,
        });
    }

    // Surgeon fee
    if (req.body.surgeonFee) {
        items.push({
            description: 'Surgeon Fee',
            category: 'Professional',
            quantity: 1,
            unitPrice: req.body.surgeonFee,
            amount: req.body.surgeonFee,
        });
    }

    // Anesthetist fee
    if (req.body.anesthetistFee) {
        items.push({
            description: 'Anesthetist Fee',
            category: 'Professional',
            quantity: 1,
            unitPrice: req.body.anesthetistFee,
            amount: req.body.anesthetistFee,
        });
    }

    // Add implants and consumables
    if (surgery.implantsAndConsumables && surgery.implantsAndConsumables.length > 0) {
        for (const item of surgery.implantsAndConsumables) {
            items.push({
                description: `${item.itemType === 'implant' ? 'Implant' : 'Consumable'}: ${item.itemName}`,
                category: item.itemType === 'implant' ? 'Implant' : 'Consumable',
                quantity: item.quantity || 1,
                unitPrice: item.unitCost || 0,
                amount: (item.quantity || 1) * (item.unitCost || 0),
            });
        }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Create billing record
    const bill = await Billing.create({
        patient: surgery.patient._id,
        admission: surgery.admission._id,
        billType: 'OT',
        items,
        totalAmount,
        discount: req.body.discount || 0,
        netAmount: totalAmount - (req.body.discount || 0),
        status: 'pending',
        generatedBy: req.user.id,
        notes: `OT Billing for Surgery ${surgery.surgeryNumber}`,
    });

    // Link billing to surgery
    surgery.billingGenerated = true;
    surgery.billingId = bill._id;
    await surgery.save();

    await createAuditLog({
        user: req.user.id,
        action: 'CREATE',
        entity: 'Billing',
        entityId: bill._id,
        description: `Generated OT billing for surgery ${surgery.surgeryNumber}`,
    });

    res.status(201).json({
        success: true,
        data: bill,
    });
});

/**
 * @desc    Get OT billing for surgery
 * @route   GET /api/surgery/schedules/:id/billing
 */
exports.getOTBilling = asyncHandler(async (req, res, next) => {
    const surgery = await Surgery.findById(req.params.id).populate('billingId');

    if (!surgery) {
        return next(new ErrorResponse('Surgery not found', 404));
    }

    if (!surgery.billingId) {
        return next(new ErrorResponse('No billing found for this surgery', 404));
    }

    res.status(200).json({
        success: true,
        data: surgery.billingId,
    });
});
