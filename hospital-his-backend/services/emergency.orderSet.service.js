/**
 * Emergency Order Set Service
 * Core service for applying order sets (bundles) to emergency cases
 * Integrates with Lab, Radiology, and Pharmacy modules
 */

const Emergency = require('../models/Emergency');
const EmergencyOrderApplication = require('../models/EmergencyOrderApplication');
const OrderSet = require('../models/OrderSet');
const LabTest = require('../models/LabTest');
const Radiology = require('../models/Radiology');
const Prescription = require('../models/Prescription');
const socketService = require('./socket.service');

/**
 * Get available emergency order sets
 * @param {string} category - Optional category filter (cardiac, stroke, trauma, etc.)
 * @returns {Array} List of active order sets
 */
const getAvailableBundles = async (category = null) => {
    const query = {
        category: 'emergency',
        isActive: true,
    };

    if (category) {
        query.subCategory = category;
    }

    const bundles = await OrderSet.find(query)
        .select('orderSetCode name description subCategory investigations medications procedures')
        .sort({ name: 1 });

    return bundles;
};

/**
 * Get trauma bundles by level
 * @param {number} level - Trauma level (1, 2, or 3)
 * @returns {Object} Trauma bundle for specified level
 */
const getTraumaBundleByLevel = async (level) => {
    const levelMap = {
        1: 'TRAUMA-L1',
        2: 'TRAUMA-L2',
        3: 'TRAUMA-L3',
        4: 'TRAUMA-L4',
    };

    const bundle = await OrderSet.findOne({
        category: 'emergency',
        subCategory: 'trauma',
        orderSetCode: { $regex: levelMap[level], $options: 'i' },
        isActive: true,
    }).populate('investigations.test')
        .populate('medications.medicine');

    return bundle;
};

/**
 * Apply an order set to an emergency case
 * ...
 */
const applyOrderSet = async ({
    emergencyCaseId,
    orderSetId,
    doctorId,
    selectedInvestigations = [],
    selectedMedications = [],
    selectedProcedures = [],
    traumaLevel = null,
    notes = '',
}) => {
    // Get emergency case
    const emergencyCase = await Emergency.findById(emergencyCaseId).populate('patient');
    if (!emergencyCase) {
        throw new Error('Emergency case not found');
    }

    // Get order set
    const orderSet = await OrderSet.findById(orderSetId)
        .populate('investigations.test')
        .populate('medications.medicine');
    if (!orderSet) {
        throw new Error('Order set not found');
    }

    // Prepare created orders tracking
    const createdOrders = {
        labTests: [],
        radiologyTests: [],
        prescriptions: [],
    };

    // 1. Create Lab Orders
    const labInvestigations = selectedInvestigations.filter(
        inv => inv.included && inv.testType === 'LabTestMaster'
    );

    for (const inv of labInvestigations) {
        try {
            const labOrder = await LabTest.create({
                patient: emergencyCase.patient._id,
                test: inv.test,
                orderedBy: doctorId,
                priority: inv.priority || 'stat',
                visitModel: 'Emergency',
                visit: emergencyCase._id,
                clinicalNotes: `Emergency Bundle: ${orderSet.name}`,
                status: 'ordered',
            });
            createdOrders.labTests.push(labOrder._id);
        } catch (error) {
            console.error(`[EmergencyOrderSet] Failed to create lab order:`, error.message);
        }
    }

    // 2. Create Radiology Orders
    const radiologyInvestigations = selectedInvestigations.filter(
        inv => inv.included && inv.testType === 'RadiologyMaster'
    );

    for (const inv of radiologyInvestigations) {
        try {
            const radiologyOrder = await Radiology.create({
                patient: emergencyCase.patient._id,
                test: inv.test,
                orderedBy: doctorId,
                priority: inv.priority || 'stat',
                visitModel: 'Emergency',
                visit: emergencyCase._id,
                clinicalNotes: `Emergency Bundle: ${orderSet.name}`,
                status: 'ordered',
            });
            createdOrders.radiologyTests.push(radiologyOrder._id);
        } catch (error) {
            console.error(`[EmergencyOrderSet] Failed to create radiology order:`, error.message);
        }
    }

    // 3. Create Prescription for Medications
    const includedMedications = selectedMedications.filter(med => med.included);

    if (includedMedications.length > 0) {
        try {
            const prescription = await Prescription.create({
                patient: emergencyCase.patient._id,
                doctor: doctorId, // Fixed field name
                visitModel: 'Emergency',
                visit: emergencyCase._id,
                medicines: includedMedications.map(med => ({
                    medicine: med.medicine,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    duration: med.duration,
                    route: med.route,
                    instructions: med.instructions || `Emergency Bundle: ${orderSet.name}`,
                    quantity: 1,
                })),
                status: 'active',
                prescriptionType: 'emergency',
            });
            createdOrders.prescriptions.push(prescription._id);
        } catch (error) {
            console.error(`[EmergencyOrderSet] Failed to create prescription:`, error.message);
        }
    }

    // 4. Create EmergencyOrderApplication record
    const application = await EmergencyOrderApplication.create({
        emergencyCase: emergencyCaseId,
        orderSet: orderSetId,
        appliedBy: doctorId,
        bundleCategory: orderSet.subCategory,
        traumaLevel: traumaLevel,
        selectedInvestigations: selectedInvestigations,
        selectedMedications: selectedMedications,
        selectedProcedures: selectedProcedures,
        createdOrders: createdOrders,
        applicationNotes: notes,
        status: 'applied',
    });

    // 5. Update emergency case with applied bundle
    emergencyCase.appliedBundles.push(application._id);

    // Update emergency tag based on bundle category
    if (orderSet.subCategory && !emergencyCase.emergencyTag) {
        emergencyCase.emergencyTag = orderSet.subCategory;
    }

    // Update trauma level if applicable
    if (traumaLevel && orderSet.subCategory === 'trauma') {
        emergencyCase.traumaLevel = traumaLevel;
    }

    await emergencyCase.save();

    // 6. Emit socket events for real-time updates
    socketService.broadcast('emergency:bundleApplied', {
        emergencyCaseId: emergencyCase._id,
        bundleName: orderSet.name,
        bundleCategory: orderSet.subCategory,
        createdOrdersCount: {
            lab: createdOrders.labTests.length,
            radiology: createdOrders.radiologyTests.length,
            prescriptions: createdOrders.prescriptions.length,
        },
    });

    // Notify Lab if lab orders were created
    if (createdOrders.labTests.length > 0) {
        socketService.emitToRole('lab_tech', 'newLabOrders', {
            source: 'emergency',
            emergencyNumber: emergencyCase.emergencyNumber,
            count: createdOrders.labTests.length,
            priority: 'stat',
        });
    }

    // Notify Radiology if radiology orders were created
    if (createdOrders.radiologyTests.length > 0) {
        socketService.emitToRole('radiologist', 'newRadiologyOrders', {
            source: 'emergency',
            emergencyNumber: emergencyCase.emergencyNumber,
            count: createdOrders.radiologyTests.length,
            priority: 'stat',
        });
    }

    // Notify Pharmacy if prescriptions were created
    if (createdOrders.prescriptions.length > 0) {
        socketService.emitToRole('pharmacist', 'newEmergencyPrescription', {
            source: 'emergency',
            emergencyNumber: emergencyCase.emergencyNumber,
            prescriptionId: createdOrders.prescriptions[0],
        });
    }

    // Populate and return the application
    await application.populate([
        { path: 'orderSet', select: 'name orderSetCode subCategory' },
        { path: 'appliedBy', select: 'profile.firstName profile.lastName' },
    ]);

    return {
        application,
        createdOrders: {
            labTestsCount: createdOrders.labTests.length,
            radiologyTestsCount: createdOrders.radiologyTests.length,
            prescriptionsCount: createdOrders.prescriptions.length,
        },
    };
};

/**
 * Get applied bundles for an emergency case
 * @param {string} emergencyCaseId - Emergency case ID
 * @returns {Array} List of applied bundles with details
 */
const getAppliedBundles = async (emergencyCaseId) => {
    const applications = await EmergencyOrderApplication.find({
        emergencyCase: emergencyCaseId,
    })
        .populate('orderSet', 'name orderSetCode subCategory description')
        .populate('appliedBy', 'profile.firstName profile.lastName')
        .populate('createdOrders.labTests', 'testNumber status')
        .populate('createdOrders.radiologyTests', 'orderNumber status')
        .populate('createdOrders.prescriptions', 'prescriptionNumber status')
        .sort({ appliedAt: -1 });

    return applications;
};

/**
 * Add nursing note to emergency case
 * @param {string} emergencyCaseId - Emergency case ID
 * @param {string} nurseId - Nurse user ID
 * @param {string} note - Note content
 * @returns {Object} Updated emergency case
 */
const addNursingNote = async (emergencyCaseId, nurseId, note) => {
    const emergencyCase = await Emergency.findById(emergencyCaseId);
    if (!emergencyCase) {
        throw new Error('Emergency case not found');
    }

    emergencyCase.nursingNotes.push({
        note,
        recordedBy: nurseId,
        recordedAt: new Date(),
    });

    await emergencyCase.save();

    // Emit socket event
    socketService.broadcast('emergency:nursingNoteAdded', {
        emergencyCaseId: emergencyCase._id,
        emergencyNumber: emergencyCase.emergencyNumber,
    });

    return emergencyCase;
};

/**
 * Mark patient ready for doctor
 * @param {string} emergencyCaseId - Emergency case ID
 * @param {string} nurseId - Nurse user ID
 * @returns {Object} Updated emergency case
 */
const markReadyForDoctor = async (emergencyCaseId, nurseId) => {
    const emergencyCase = await Emergency.findByIdAndUpdate(
        emergencyCaseId,
        {
            readyForDoctor: true,
            readyForDoctorAt: new Date(),
            readyForDoctorBy: nurseId,
        },
        { new: true }
    ).populate('patient', 'patientId firstName lastName');

    if (!emergencyCase) {
        throw new Error('Emergency case not found');
    }

    // Emit socket event to doctors
    socketService.emitToRole('doctor', 'emergency:patientReady', {
        emergencyCaseId: emergencyCase._id,
        emergencyNumber: emergencyCase.emergencyNumber,
        patientName: `${emergencyCase.patient.firstName} ${emergencyCase.patient.lastName}`,
        triageLevel: emergencyCase.triageLevel,
    });

    return emergencyCase;
};

/**
 * Set emergency tag for a case
 * @param {string} emergencyCaseId - Emergency case ID
 * @param {string} doctorId - Doctor user ID
 * @param {string} tag - Emergency tag (cardiac, stroke, trauma, etc.)
 * @param {number} traumaLevel - Trauma level if tag is trauma
 * @returns {Object} Updated emergency case
 */
const setEmergencyTag = async (emergencyCaseId, doctorId, tag, traumaLevel = null) => {
    const updateData = {
        emergencyTag: tag,
    };

    if (tag === 'trauma' && traumaLevel) {
        updateData.traumaLevel = traumaLevel;
    }

    const emergencyCase = await Emergency.findByIdAndUpdate(
        emergencyCaseId,
        updateData,
        { new: true }
    ).populate('patient', 'patientId firstName lastName');

    if (!emergencyCase) {
        throw new Error('Emergency case not found');
    }

    // Emit socket event
    socketService.broadcast('emergency:tagUpdated', {
        emergencyCaseId: emergencyCase._id,
        emergencyNumber: emergencyCase.emergencyNumber,
        tag: tag,
        traumaLevel: traumaLevel,
    });

    return emergencyCase;
};

module.exports = {
    getAvailableBundles,
    getTraumaBundleByLevel,
    applyOrderSet,
    getAppliedBundles,
    addNursingNote,
    markReadyForDoctor,
    setEmergencyTag,
};
