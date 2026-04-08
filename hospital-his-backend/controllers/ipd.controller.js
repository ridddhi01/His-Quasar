const Admission = require('../models/Admission');
const AdmissionRequest = require('../models/AdmissionRequest');
const Bed = require('../models/Bed');
const { ADMISSION_STATUS, BED_STATUS } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create a new admission
 * @route   POST /api/ipd/admissions
 */
exports.createAdmission = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user.id;

    // Generate Admission Number automatically
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Admission.countDocuments();
    req.body.admissionNumber = `ADM${dateStr}${(count + 1).toString().padStart(4, '0')}`;

    const admission = await Admission.create(req.body);

    // Update bed status if bed is assigned
    if (req.body.bed) {
        await Bed.findByIdAndUpdate(req.body.bed, {
            status: BED_STATUS.OCCUPIED,
            currentPatient: req.body.patient,
            currentAdmission: admission._id,
        });
    }

    // Update Admission Request status if linked
    if (req.body.requestId) {
        await AdmissionRequest.findByIdAndUpdate(req.body.requestId, { status: 'admitted' });
    }

    await admission.populate(['patient', 'doctor', 'department', 'ward', 'bed']);

    res.status(201).json({
        success: true,
        data: admission,
    });
});

/**
 * @desc    Get all admissions
 * @route   GET /api/ipd/admissions
 */
exports.getAllAdmissions = asyncHandler(async (req, res, next) => {
    const { status, doctor, department, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (doctor) query.doctor = doctor;
    if (department) query.department = department;

    const skip = (page - 1) * limit;

    const admissions = await Admission.find(query)
        .populate('patient', 'patientId firstName lastName phone')
        .populate('doctor', 'profile.firstName profile.lastName')
        .populate('department', 'name')
        .populate('ward', 'name')
        .populate('bed', 'bedNumber')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ admissionDate: -1 });

    const total = await Admission.countDocuments(query);

    res.status(200).json({
        success: true,
        count: admissions.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: admissions,
    });
});

/**
 * @desc    Get admission by ID
 * @route   GET /api/ipd/admissions/:id
 */
exports.getAdmissionById = asyncHandler(async (req, res, next) => {
    const admission = await Admission.findById(req.params.id)
        .populate('patient')
        .populate('doctor', 'profile')
        .populate('department')
        .populate('ward')
        .populate('bed');

    if (!admission) {
        return next(new ErrorResponse('Admission not found', 404));
    }

    // Merge Nursing Data (VitalSigns and NursingNotes collections)
    try {
        const VitalSigns = require('../models/VitalSigns');
        const NursingNote = require('../models/NursingNote');

        const [nursingVitals, nursingNotes] = await Promise.all([
            VitalSigns.find({ admission: req.params.id }).sort('recordedAt'),
            NursingNote.find({ admission: req.params.id }).sort('recordedAt')
        ]);

        const admissionObj = admission.toObject();

        const mappedVitals = nursingVitals.map(v => ({
            temperature: v.temperature?.value?.toString(),
            bpSystolic: v.bloodPressure?.systolic,
            bpDiastolic: v.bloodPressure?.diastolic,
            pulse: v.pulse?.rate,
            spo2: v.oxygenSaturation?.value,
            recordedAt: v.recordedAt,
            recordedBy: v.recordedBy,
            source: 'nursing'
        }));

        const mappedNotes = nursingNotes.map(n => ({
            note: n.content,
            type: n.noteType || 'nursing_note',
            recordedAt: n.recordedAt,
            recordedBy: n.recordedBy,
            category: n.category
        }));

        admissionObj.vitals = [...(admissionObj.vitals || []), ...mappedVitals]
            .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

        admissionObj.clinicalNotes = [...(admissionObj.clinicalNotes || []), ...mappedNotes]
            .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

        return res.status(200).json({
            success: true,
            data: admissionObj,
        });

    } catch (error) {
        console.error('Error merging nursing data:', error);
        res.status(200).json({
            success: true,
            data: admission,
        });
    }
});

/**
 * @desc    Update admission
 * @route   PUT /api/ipd/admissions/:id
 */
exports.updateAdmission = asyncHandler(async (req, res, next) => {
    const admission = await Admission.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    }).populate(['patient', 'doctor', 'department', 'ward', 'bed']);

    if (!admission) {
        return next(new ErrorResponse('Admission not found', 404));
    }

    res.status(200).json({
        success: true,
        data: admission,
    });
});

/**
 * @desc    Discharge patient
 * @route   POST /api/ipd/admissions/:id/discharge
 */
exports.dischargePatient = asyncHandler(async (req, res, next) => {
    const admission = await Admission.findById(req.params.id)
        .populate('patient')
        .populate('doctor');

    if (!admission) {
        return next(new ErrorResponse('Admission not found', 404));
    }

    admission.status = ADMISSION_STATUS.DISCHARGED;
    admission.dischargeDate = new Date();
    await admission.save();

    // Free up the bed
    if (admission.bed) {
        await Bed.findByIdAndUpdate(admission.bed, {
            status: BED_STATUS.AVAILABLE,
            currentPatient: null,
            currentAdmission: null,
        });
    }

    // AUTO-CREATE CLINICAL CODING RECORD
    try {
        const { createCodingForEncounter } = require('../services/clinicalCoding.service');
        await createCodingForEncounter({
            patient: admission.patient._id,
            encounter: admission._id,
            encounterModel: 'Admission',
            encounterType: 'ipd',
            finalizingDoctor: admission.doctor?._id || req.user.id,
            createdBy: req.user.id
        });
        console.log(`[IPD] Clinical coding record created for admission ${admission.admissionNumber}`);
    } catch (err) {
        console.error('[IPD] Failed to create clinical coding record:', err.message);
    }

    res.status(200).json({
        success: true,
        message: 'Patient discharged successfully',
        data: admission,
    });
});

/**
 * @desc    Get admitted patients
 * @route   GET /api/ipd/patients
 */
exports.getAdmittedPatients = asyncHandler(async (req, res, next) => {
    // --- Auto-generate Daily Charges (Lazy Execution) ---
    try {
        const { addItemToBill } = require('../services/billing.internal.service');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find active admissions that haven't been charged today
        const pendingCharges = await Admission.find({
            status: ADMISSION_STATUS.ADMITTED,
            $or: [
                { 'billing.lastChargeGeneration': { $lt: today } },
                { 'billing.lastChargeGeneration': { $exists: false } }
            ]
        }).populate('bed');

        for (const adm of pendingCharges) {
            if (adm.bed && adm.bed.tariff) {
                console.log(`[Billing] Generating bed charge for ${adm.admissionNumber}`);
                await addItemToBill({
                    patientId: adm.patient,
                    visitId: adm._id,
                    visitType: 'ipd',
                    visitModel: 'Admission',
                    itemType: 'bed',
                    description: `Daily Bed Charge - ${adm.bed.bedNumber} (${new Date().toLocaleDateString()})`,
                    quantity: 1,
                    rate: adm.bed.tariff,
                    amount: adm.bed.tariff,
                    netAmount: adm.bed.tariff,
                    generatedBy: req.user.id,
                    isSystemGenerated: true
                });
                // Update last generation time
                if (!adm.billing) adm.billing = {};
                adm.billing.lastChargeGeneration = new Date();
                await adm.save();
            }
        }
    } catch (err) {
        console.error('[IPD] Error auto-generating charges:', err);
    }
    // ----------------------------------------------------

    const admissions = await Admission.find({ status: ADMISSION_STATUS.ADMITTED })
        .populate('patient', 'patientId firstName lastName phone')
        .populate('doctor', 'profile.firstName profile.lastName')
        .populate('ward', 'name')
        .populate('bed', 'bedNumber')
        .sort({ admissionDate: -1 });

    res.status(200).json({
        success: true,
        count: admissions.length,
        data: admissions,
    });
});

/**
 * @desc    Get IPD dashboard stats
 * @route   GET /api/ipd/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res, next) => {
    const [totalAdmitted, todayAdmissions, todayDischarges] = await Promise.all([
        Admission.countDocuments({ status: ADMISSION_STATUS.ADMITTED }),
        Admission.countDocuments({
            admissionDate: { $gte: new Date().setHours(0, 0, 0, 0) },
        }),
        Admission.countDocuments({
            dischargeDate: { $gte: new Date().setHours(0, 0, 0, 0) },
        }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalAdmitted,
            todayAdmissions,
            todayDischarges,
        },
    });
});

/**
 * @desc    Add Vitals
 * @route   POST /api/ipd/admissions/:id/vitals
 */
exports.addVitals = asyncHandler(async (req, res, next) => {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return next(new ErrorResponse('Admission not found', 404));

    admission.vitals.push({
        ...req.body,
        recordedBy: req.user.id,
        recordedAt: new Date()
    });
    await admission.save();

    res.status(200).json({ success: true, data: admission });
});

/**
 * @desc    Add Clinical Note
 * @route   POST /api/ipd/admissions/:id/notes
 */
exports.addClinicalNote = asyncHandler(async (req, res, next) => {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return next(new ErrorResponse('Admission not found', 404));

    admission.clinicalNotes.push({
        ...req.body, // note, type
        recordedBy: req.user.id,
        recordedAt: new Date()
    });
    await admission.save();

    res.status(200).json({ success: true, data: admission });
});

/**
 * @desc    Approve Discharge
 * @route   POST /api/ipd/admissions/:id/approve-discharge
 */
exports.approveDischarge = asyncHandler(async (req, res, next) => {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return next(new ErrorResponse('Admission not found', 404));

    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return next(new ErrorResponse('Only doctors can approve discharge', 403));
    }

    // Ensure discharge subdocument exists (for older records)
    if (!admission.discharge) admission.discharge = {};

    admission.discharge.isApprovedByDoctor = true;
    admission.discharge.approvedBy = req.user.id;
    admission.discharge.initiatedAt = new Date();

    try {
        await admission.save();
    } catch (err) {
        console.error('[IPD] approveDischarge save error:', err);
        return next(new ErrorResponse('Failed to approve discharge', 500));
    }

    res.status(200).json({ success: true, message: 'Discharge approved', data: admission });
});

/**
 * @desc    Create Admission Request (Doctor)
 * @route   POST /api/ipd/requests
 */
exports.createAdmissionRequest = asyncHandler(async (req, res, next) => {
    const { patient, reason, recommendedWardType, priority } = req.body;

    const request = await AdmissionRequest.create({
        patient,
        doctor: req.user.id,
        reason,
        recommendedWardType,
        priority
    });

    res.status(201).json({ success: true, data: request });
});

/**
 * @desc    Get Admission Requests (Receptionist)
 * @route   GET /api/ipd/requests
 */
exports.getAdmissionRequests = asyncHandler(async (req, res, next) => {
    const requests = await AdmissionRequest.find({ status: 'pending' })
        .populate('patient', 'firstName lastName patientId phone gender age dob')
        .populate('doctor', 'profile username')
        .sort('-createdAt');

    res.status(200).json({ success: true, count: requests.length, data: requests });
});
