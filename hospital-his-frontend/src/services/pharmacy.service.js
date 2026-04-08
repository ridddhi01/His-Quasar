import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/pharmacy';
const APPOINTMENT_URL = 'http://localhost:5001/api/v1/opd/appointments';
const PRESCRIPTION_URL = 'http://localhost:5001/api/v1/prescriptions';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const pharmacyService = {
    // ============================================================
    // INVENTORY
    // ============================================================

    // Get Pharmacy Inventory With Search
    getInventory: async (searchString = '') => {
        const response = await axios.get(`${API_URL}/inventory`, {
            ...getConfig(),
            params: { search: searchString }
        });
        return response.data;
    },

    // Add New Stock (and Medicine if new)
    addInventory: async (data) => {
        const response = await axios.post(`${API_URL}/inventory`, data, getConfig());
        return response.data;
    },

    // Get batches in FEFO order
    getBatchesFEFO: async (medicineId, quantity) => {
        const response = await axios.get(`${API_URL}/batches/fefo/${medicineId}`, {
            ...getConfig(),
            params: { quantity }
        });
        return response.data;
    },

    // Get expiring batches
    getExpiringBatches: async (days = 30) => {
        const response = await axios.get(`${API_URL}/batches/expiring`, {
            ...getConfig(),
            params: { days }
        });
        return response.data;
    },

    // Get recalled batches
    getRecalledBatches: async () => {
        const response = await axios.get(`${API_URL}/batches/recalled`, getConfig());
        return response.data;
    },

    // ============================================================
    // PRESCRIPTIONS & DISPENSING
    // ============================================================

    // Get Pending Prescriptions (dispense queue)
    getPendingPrescriptions: async () => {
        const response = await axios.get(`${API_URL}/dispense-queue`, getConfig());
        return response.data;
    },

    // Legacy: Get completed appointments for dispensing
    getPendingAppointments: async () => {
        const response = await axios.get(`${APPOINTMENT_URL}?status=completed`, getConfig());
        return response.data;
    },

    // Dispense with full safety checks
    dispensePrescription: async (prescriptionId, items, admissionId = null) => {
        const response = await axios.post(`${API_URL}/dispense`, {
            prescriptionId,
            items,
            admissionId
        }, getConfig());
        return response.data;
    },

    // Get dispense traceability
    getDispenseTraceability: async (dispenseId) => {
        const response = await axios.get(`${API_URL}/dispense/${dispenseId}/traceability`, getConfig());
        return response.data;
    },

    // ============================================================
    // SAFETY CHECKS
    // ============================================================

    // Check drug interactions for medicine list
    checkInteractions: async (medicineIds, patientId) => {
        const response = await axios.post(`${API_URL}/check-interactions`, {
            medicineIds,
            patientId
        }, getConfig());
        return response.data;
    },

    // Validate prescription safety
    validatePrescriptionSafety: async (prescriptionId) => {
        const response = await axios.post(
            `${API_URL}/validate-prescription/${prescriptionId}`,
            {},
            getConfig()
        );
        return response.data;
    },

    // Record interaction override (doctor only)
    overrideInteraction: async (prescriptionId, medicineIndex, overrideReason) => {
        const response = await axios.post(
            `${API_URL}/override-interaction/${prescriptionId}`,
            { medicineIndex, overrideReason },
            getConfig()
        );
        return response.data;
    },

    // Pre-dispense comprehensive check
    preDispenseCheck: async (prescriptionId, selectedBatches) => {
        const response = await axios.post(`${API_URL}/pre-dispense-check`, {
            prescriptionId,
            selectedBatches
        }, getConfig());
        return response.data;
    },

    // ============================================================
    // DRUG RECALLS
    // ============================================================

    // Get recalls (with optional status filter)
    getRecalls: async (status = '') => {
        const params = status && status !== 'all' ? { status } : {};
        const response = await axios.get(`${API_URL}/recalls`, {
            ...getConfig(),
            params
        });
        return response.data;
    },

    // Get single recall
    getRecallById: async (recallId) => {
        const response = await axios.get(`${API_URL}/recalls/${recallId}`, getConfig());
        return response.data;
    },

    // Initiate recall
    initiateRecall: async (data) => {
        const response = await axios.post(`${API_URL}/recalls`, data, getConfig());
        return response.data;
    },

    // Get affected patients for recall
    getAffectedPatients: async (recallId) => {
        const response = await axios.get(`${API_URL}/recalls/${recallId}/affected-patients`, getConfig());
        return response.data;
    },

    // Send recall notifications
    notifyRecallPatients: async (recallId) => {
        const response = await axios.post(`${API_URL}/recalls/${recallId}/notify`, {}, getConfig());
        return response.data;
    },

    // Resolve recall
    resolveRecall: async (recallId, resolutionNotes) => {
        const response = await axios.post(`${API_URL}/recalls/${recallId}/resolve`, {
            resolutionNotes
        }, getConfig());
        return response.data;
    },

    // ============================================================
    // DRUG INTERACTIONS MASTER
    // ============================================================

    // Get all interactions
    getDrugInteractions: async (severity = '', drug = '') => {
        const response = await axios.get(`${API_URL}/interactions`, {
            ...getConfig(),
            params: { severity, drug }
        });
        return response.data;
    },

    // Add new interaction
    addDrugInteraction: async (data) => {
        const response = await axios.post(`${API_URL}/interactions`, data, getConfig());
        return response.data;
    },
};

export default pharmacyService;
