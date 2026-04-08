import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Create axios instance with auth header
const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return {
        headers: {
            Authorization: `Bearer ${user?.token}`,
        },
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const startShift = async (shiftData) => {
    const response = await axios.post(
        `${API_URL}/nursing/shifts/start`,
        shiftData,
        getAuthHeaders()
    );
    return response.data;
};

export const getCurrentShift = async () => {
    const response = await axios.get(
        `${API_URL}/nursing/shifts/current`,
        getAuthHeaders()
    );
    return response.data;
};

export const endShift = async () => {
    const response = await axios.post(
        `${API_URL}/nursing/shifts/end`,
        {},
        getAuthHeaders()
    );
    return response.data;
};

export const getDashboard = async () => {
    const response = await axios.get(
        `${API_URL}/nursing/dashboard`,
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT TASKS
// ═══════════════════════════════════════════════════════════════════════════════

export const getPatientTasks = async (patientId, params = {}) => {
    const response = await axios.get(
        `${API_URL}/nursing/patients/${patientId}/tasks`,
        { ...getAuthHeaders(), params }
    );
    return response.data;
};

export const completeTask = async (taskId, notes) => {
    const response = await axios.post(
        `${API_URL}/nursing/tasks/${taskId}/complete`,
        { notes },
        getAuthHeaders()
    );
    return response.data;
};

export const skipTask = async (taskId, reason) => {
    const response = await axios.post(
        `${API_URL}/nursing/tasks/${taskId}/skip`,
        { reason },
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// VITAL SIGNS
// ═══════════════════════════════════════════════════════════════════════════════

export const recordVitals = async (vitalsData) => {
    const response = await axios.post(
        `${API_URL}/nursing/vitals`,
        vitalsData,
        getAuthHeaders()
    );
    return response.data;
};

export const getVitalsHistory = async (patientId, params = {}) => {
    const response = await axios.get(
        `${API_URL}/nursing/vitals/${patientId}`,
        { ...getAuthHeaders(), params }
    );
    return response.data;
};

export const getVitalsTrends = async (patientId, hours = 24) => {
    const response = await axios.get(
        `${API_URL}/nursing/vitals/${patientId}/trends`,
        { ...getAuthHeaders(), params: { hours } }
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICATION ADMINISTRATION (MAR)
// ═══════════════════════════════════════════════════════════════════════════════

export const getMedicationSchedule = async (patientId, date) => {
    const response = await axios.get(
        `${API_URL}/nursing/medications/${patientId}`,
        { ...getAuthHeaders(), params: { date } }
    );
    return response.data;
};

export const administerMedication = async (marId, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/medications/${marId}/administer`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

export const skipMedication = async (marId, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/medications/${marId}/skip`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// NURSING NOTES
// ═══════════════════════════════════════════════════════════════════════════════

export const createNote = async (noteData) => {
    const response = await axios.post(
        `${API_URL}/nursing/notes`,
        noteData,
        getAuthHeaders()
    );
    return response.data;
};

export const getPatientNotes = async (patientId, params = {}) => {
    const response = await axios.get(
        `${API_URL}/nursing/notes/${patientId}`,
        { ...getAuthHeaders(), params }
    );
    return response.data;
};

export const addAddendum = async (noteId, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/notes/${noteId}/addendum`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARE PLANS
// ═══════════════════════════════════════════════════════════════════════════════

export const getCarePlans = async (patientId, status = 'active') => {
    const response = await axios.get(
        `${API_URL}/nursing/care-plans/${patientId}`,
        { ...getAuthHeaders(), params: { status } }
    );
    return response.data;
};

export const completeIntervention = async (planId, index, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/care-plans/${planId}/interventions/${index}/complete`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

export const addEvaluation = async (planId, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/care-plans/${planId}/evaluate`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

export const flagIssue = async (planId, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/care-plans/${planId}/flag`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT HANDOVER
// ═══════════════════════════════════════════════════════════════════════════════

export const createHandover = async (handoverData) => {
    const response = await axios.post(
        `${API_URL}/nursing/handover`,
        handoverData,
        getAuthHeaders()
    );
    return response.data;
};

export const acknowledgeHandover = async (handoverId, notes) => {
    const response = await axios.post(
        `${API_URL}/nursing/handover/${handoverId}/acknowledge`,
        { notes },
        getAuthHeaders()
    );
    return response.data;
};

export const getPendingHandovers = async () => {
    const response = await axios.get(
        `${API_URL}/nursing/handover/pending`,
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export const getActiveAlerts = async () => {
    const response = await axios.get(
        `${API_URL}/nursing/alerts`,
        getAuthHeaders()
    );
    return response.data;
};

export const acknowledgeAlert = async (alertId, notes) => {
    const response = await axios.post(
        `${API_URL}/nursing/alerts/${alertId}/acknowledge`,
        { notes },
        getAuthHeaders()
    );
    return response.data;
};

export const resolveAlert = async (alertId, data) => {
    const response = await axios.post(
        `${API_URL}/nursing/alerts/${alertId}/resolve`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

export const createEscalation = async (data) => {
    const response = await axios.post(
        `${API_URL}/nursing/alerts/escalate`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

export const getScheduledShifts = async (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // We use the user from localStorage to get the ID, or let backend filter by req.user if generic
    // But nurse-assignments/roster requires nurseId filter to narrow down usually.
    // If I don't pass nurseId, it might return all. 
    // The previous check showed 'nurseId' query param is supported.
    // Let's get current user ID from token/localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const nurseId = user?._id || user?.id; // Adjust based on user object structure

    const response = await axios.get(
        `${API_URL}/nurse-assignments/roster`,
        {
            ...getAuthHeaders(),
            params: {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                nurseId: nurseId
            }
        }
    );
    return response.data;
};

export default {
    // Shifts
    startShift,
    getCurrentShift,
    endShift,
    getDashboard,
    getScheduledShifts,
    // Tasks
    getPatientTasks,
    completeTask,
    skipTask,
    // Vitals
    recordVitals,
    getVitalsHistory,
    getVitalsTrends,
    // MAR
    getMedicationSchedule,
    administerMedication,
    skipMedication,
    // Notes
    createNote,
    getPatientNotes,
    addAddendum,
    // Care Plans
    getCarePlans,
    completeIntervention,
    addEvaluation,
    flagIssue,
    // Handover
    createHandover,
    acknowledgeHandover,
    getPendingHandovers,
    // Alerts
    getActiveAlerts,
    acknowledgeAlert,
    resolveAlert,
    createEscalation,
};
