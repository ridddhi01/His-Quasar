/**
 * Emergency Order Set Controller
 * REST API endpoints for emergency order set (bundle) operations
 */

const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const emergencyOrderSetService = require('../services/emergency.orderSet.service');
const Emergency = require('../models/Emergency');

/**
 * @desc    Get available emergency order sets (bundles)
 * @route   GET /api/emergency/order-sets
 * @access  Private (Doctor, Nurse, Admin)
 */
exports.getAvailableBundles = asyncHandler(async (req, res, next) => {
    const { category } = req.query;

    const bundles = await emergencyOrderSetService.getAvailableBundles(category);

    res.status(200).json({
        success: true,
        count: bundles.length,
        data: bundles,
    });
});

/**
 * @desc    Get trauma bundle by level
 * @route   GET /api/emergency/order-sets/trauma/:level
 * @access  Private (Doctor, Admin)
 */
exports.getTraumaBundleByLevel = asyncHandler(async (req, res, next) => {
    const level = parseInt(req.params.level);

    if (![1, 2, 3].includes(level)) {
        return next(new ErrorResponse('Invalid trauma level. Must be 1, 2, or 3', 400));
    }

    const bundle = await emergencyOrderSetService.getTraumaBundleByLevel(level);

    if (!bundle) {
        return next(new ErrorResponse(`Trauma Level ${level} bundle not found`, 404));
    }

    res.status(200).json({
        success: true,
        data: bundle,
    });
});

/**
 * @desc    Apply order set (bundle) to emergency case
 * @route   POST /api/emergency/cases/:id/apply-bundle
 * @access  Private (Doctor only)
 */
exports.applyBundle = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const {
        orderSetId,
        selectedInvestigations,
        selectedMedications,
        selectedProcedures,
        traumaLevel,
        notes,
    } = req.body;

    if (!orderSetId) {
        return next(new ErrorResponse('Order set ID is required', 400));
    }

    // Verify emergency case exists
    const emergencyCase = await Emergency.findById(id);
    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    // Apply the bundle
    const result = await emergencyOrderSetService.applyOrderSet({
        emergencyCaseId: id,
        orderSetId,
        doctorId: req.user.id,
        selectedInvestigations: selectedInvestigations || [],
        selectedMedications: selectedMedications || [],
        selectedProcedures: selectedProcedures || [],
        traumaLevel,
        notes,
    });

    res.status(201).json({
        success: true,
        message: 'Bundle applied successfully',
        data: result,
    });
});

/**
 * @desc    Get applied bundles for an emergency case
 * @route   GET /api/emergency/cases/:id/bundles
 * @access  Private (Doctor, Nurse, Admin)
 */
exports.getAppliedBundles = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Verify emergency case exists
    const emergencyCase = await Emergency.findById(id);
    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    const applications = await emergencyOrderSetService.getAppliedBundles(id);

    res.status(200).json({
        success: true,
        count: applications.length,
        data: applications,
    });
});

/**
 * @desc    Add nursing note to emergency case
 * @route   POST /api/emergency/cases/:id/nursing-notes
 * @access  Private (Nurse, Doctor, Admin)
 */
exports.addNursingNote = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
        return next(new ErrorResponse('Note content is required', 400));
    }

    const emergencyCase = await emergencyOrderSetService.addNursingNote(
        id,
        req.user.id,
        note.trim()
    );

    res.status(201).json({
        success: true,
        message: 'Nursing note added',
        data: emergencyCase.nursingNotes,
    });
});

/**
 * @desc    Mark patient ready for doctor
 * @route   POST /api/emergency/cases/:id/ready-for-doctor
 * @access  Private (Nurse only)
 */
exports.markReadyForDoctor = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const emergencyCase = await emergencyOrderSetService.markReadyForDoctor(
        id,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Patient marked as ready for doctor',
        data: {
            readyForDoctor: emergencyCase.readyForDoctor,
            readyForDoctorAt: emergencyCase.readyForDoctorAt,
        },
    });
});

/**
 * @desc    Set emergency tag (cardiac, stroke, trauma, etc.)
 * @route   POST /api/emergency/cases/:id/set-tag
 * @access  Private (Doctor, Admin)
 */
exports.setEmergencyTag = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { tag, traumaLevel } = req.body;

    if (!tag || !Object.values(Emergency.EMERGENCY_TAGS).includes(tag)) {
        return next(new ErrorResponse('Valid emergency tag is required', 400));
    }

    if (tag === 'trauma' && traumaLevel && ![1, 2, 3].includes(traumaLevel)) {
        return next(new ErrorResponse('Invalid trauma level. Must be 1, 2, or 3', 400));
    }

    const emergencyCase = await emergencyOrderSetService.setEmergencyTag(
        id,
        req.user.id,
        tag,
        traumaLevel
    );

    res.status(200).json({
        success: true,
        message: 'Emergency tag updated',
        data: {
            emergencyTag: emergencyCase.emergencyTag,
            traumaLevel: emergencyCase.traumaLevel,
        },
    });
});

/**
 * @desc    Process disposition (IPD/ICU/OT transfer or discharge)
 * @route   POST /api/emergency/cases/:id/disposition
 * @access  Private (Doctor only)
 */
exports.processDisposition = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const {
        dispositionType, // 'ipd', 'icu', 'ot', 'discharge'
        targetWard,
        surgeryNotes,
        dischargeSummary,
        transferNotes,
    } = req.body;

    if (!dispositionType || !['ipd', 'icu', 'ot', 'discharge'].includes(dispositionType)) {
        return next(new ErrorResponse('Valid disposition type is required (ipd, icu, ot, discharge)', 400));
    }

    const emergencyCase = await Emergency.findById(id).populate('patient');
    if (!emergencyCase) {
        return next(new ErrorResponse('Emergency case not found', 404));
    }

    let result = { disposition: dispositionType };

    // Handle based on disposition type
    if (dispositionType === 'ipd' || dispositionType === 'icu') {
        const Admission = require('../models/Admission');
        const Bed = require('../models/Bed');
        const AdmissionRequest = require('../models/AdmissionRequest');

        // Check for available bed of requested type
        const requestedType = dispositionType === 'icu' ? 'icu' : (targetWard || 'general');

        let allocatedBed = await Bed.findOne({
            bedType: requestedType,
            status: 'available'
        });

        if (allocatedBed) {
            // AUTO-ADMIT
            // Generate Admission Number
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            const admCount = await Admission.countDocuments();
            const admissionNumber = `ADM${dateStr}${String(admCount + 1).padStart(4, '0')}`;

            // Create Admission
            const admission = await Admission.create({
                admissionNumber,
                patient: emergencyCase.patient._id,
                doctor: emergencyCase.assignedDoctor || req.user.id,
                department: req.user.department || emergencyCase.patient?.department || emergencyCase.assignedDoctor?.department || '6508493f65022e3650645601',
                ward: allocatedBed.ward,
                bed: allocatedBed._id,
                admissionDate: new Date(),
                admissionType: 'emergency',
                status: 'admitted',
                diagnosis: emergencyCase.diagnosis || emergencyCase.chiefComplaint,
                createdBy: req.user.id,
                clinicalNotes: [{
                    note: transferNotes,
                    type: 'doctor_round',
                    recordedBy: req.user.id
                }]
            });

            // Update Bed status
            allocatedBed.status = 'occupied';
            allocatedBed.currentPatient = emergencyCase.patient._id;
            allocatedBed.currentAdmission = admission._id;
            await allocatedBed.save();

            // Update Emergency Case
            emergencyCase.status = Emergency.EMERGENCY_STATUS.ADMITTED;
            emergencyCase.disposition = 'admit';
            emergencyCase.treatmentEndTime = new Date();
            emergencyCase.dispositionDetails = {
                targetWard: requestedType,
                admittedToBed: allocatedBed.bedNumber,
                admissionId: admission._id,
                transferNotes,
                processedAt: new Date(),
                processedBy: req.user.id,
            };

            await emergencyCase.save();

            result.admissionId = admission._id;
            result.bedNumber = allocatedBed.bedNumber;
            result.message = `Patient admitted to ${allocatedBed.bedNumber} (${requestedType.toUpperCase()})`;

        } else {
            // NO BED AVAILABLE - Create REQUEST
            const admissionRequest = await AdmissionRequest.create({
                patient: emergencyCase.patient._id,
                doctor: emergencyCase.assignedDoctor || req.user.id,
                reason: emergencyCase.chiefComplaint || 'Emergency admission',
                priority: 'emergency',
                recommendedWardType: requestedType,
                status: 'pending',
                notes: transferNotes || `Transferred from Emergency. Triage: ${emergencyCase.triageLevel}`,
            });

            // Update emergency case
            emergencyCase.status = Emergency.EMERGENCY_STATUS.ADMITTED; // Mark as admitted process started
            emergencyCase.disposition = 'admit';
            emergencyCase.treatmentEndTime = new Date();
            emergencyCase.dispositionDetails = {
                targetWard: requestedType,
                transferNotes,
                admissionRequestId: admissionRequest._id,
                processedAt: new Date(),
                processedBy: req.user.id,
            };

            await emergencyCase.save();

            result.admissionRequestId = admissionRequest._id;
            result.message = `No ${requestedType.toUpperCase()} beds available. Admission Request created.`;
        }

    } else if (dispositionType === 'ot') {
        // 1. Create Emergency Admission for the patient (Required by Surgery model)
        const Admission = require('../models/Admission');
        const Surgery = require('../models/Surgery');

        // Generate Admission Number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const admCount = await Admission.countDocuments();
        const admissionNumber = `ADM${dateStr}${String(admCount + 1).padStart(4, '0')}`;

        // Get Department (Emergency or General) or first available
        const Department = require('../models/Department');
        let departmentId = req.user.department || emergencyCase.assignedDoctor?.department;

        if (!departmentId) {
            const emDept = await Department.findOne({ name: { $regex: 'Emergency', $options: 'i' } });
            if (emDept) departmentId = emDept._id;
            else {
                const anyDept = await Department.findOne();
                departmentId = anyDept?._id;
            }
        }

        if (!departmentId) {
            console.error("No department found for Admission creation");
            // Critical error but try to continue or throw?
            // Mongoose will fail if department is required.
            // We'll let it fail with a clear error if possible, or assume one exists.
        }

        // Create Admission
        const admission = await Admission.create({
            admissionNumber,
            patient: emergencyCase.patient._id,
            doctor: emergencyCase.assignedDoctor || req.user.id,
            department: departmentId,
            admissionDate: new Date(),
            admissionType: 'emergency',
            status: 'admitted',
            diagnosis: emergencyCase.diagnosis || emergencyCase.chiefComplaint,
            createdBy: req.user.id,
            // No ward/bed yet
        });

        // 2. Create surgery schedule
        // Generate Surgery Number
        const srgCount = await Surgery.countDocuments();
        const surgeryNumber = `SRG${dateStr}${String(srgCount + 1).padStart(4, '0')}`;

        const surgery = await Surgery.create({
            surgeryNumber,
            patient: emergencyCase.patient._id,
            admission: admission._id, // Link to the new admission
            surgeon: emergencyCase.assignedDoctor || req.user.id,
            scheduledDate: new Date(),
            scheduledTime: new Date().toTimeString().slice(0, 5),
            procedureName: surgeryNotes || 'Emergency Surgery',
            surgeryType: 'emergency',
            priority: 'emergency',
            status: 'scheduled',
            preOpDiagnosis: emergencyCase.diagnosis || emergencyCase.chiefComplaint,
            notes: transferNotes || `Emergency transfer. Triage: ${emergencyCase.triageLevel}`,
            createdBy: req.user.id,
        });

        // Update emergency case
        emergencyCase.status = Emergency.EMERGENCY_STATUS.TRANSFERRED;
        emergencyCase.disposition = 'transfer';
        emergencyCase.treatmentEndTime = new Date();
        emergencyCase.dispositionDetails = {
            surgeryId: surgery._id,
            admissionId: admission._id,
            transferNotes: surgeryNotes,
            processedAt: new Date(),
            processedBy: req.user.id,
        };

        await emergencyCase.save();

        result.surgeryId = surgery._id;
        result.surgeryNumber = surgery.surgeryNumber;
        result.message = 'Patient scheduled for emergency surgery (Admission created)';

    } else if (dispositionType === 'discharge') {
        // Discharge from ER
        emergencyCase.status = Emergency.EMERGENCY_STATUS.DISCHARGED;
        emergencyCase.disposition = 'discharge';
        emergencyCase.dischargeTime = new Date();
        emergencyCase.treatmentEndTime = new Date();
        emergencyCase.treatmentNotes = dischargeSummary || emergencyCase.treatmentNotes;
        emergencyCase.dispositionDetails = {
            transferNotes: dischargeSummary,
            processedAt: new Date(),
            processedBy: req.user.id,
        };

        await emergencyCase.save();

        result.message = 'Patient discharged from Emergency';
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
        io.to('emergency-room').emit('emergency:disposition', {
            caseId: emergencyCase._id,
            emergencyNumber: emergencyCase.emergencyNumber,
            dispositionType,
            ...result,
        });
    }

    res.status(200).json({
        success: true,
        data: result,
    });
});
