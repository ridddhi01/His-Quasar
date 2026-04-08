import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/surgery';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const surgeryService = {
    // ═══════════════════════════════════════════════════════════════════════════════
    // SCHEDULING & BASIC CRUD
    // ═══════════════════════════════════════════════════════════════════════════════

    getDashboard: async () => {
        const response = await axios.get(`${API_URL}/dashboard`, getConfig());
        return response.data;
    },

    scheduleSurgery: async (data) => {
        const response = await axios.post(`${API_URL}/schedule`, data, getConfig());
        return response.data;
    },

    getAllSchedules: async (params) => {
        const config = getConfig();
        config.params = params;
        const response = await axios.get(`${API_URL}/schedules`, config);
        return response.data;
    },

    getScheduleById: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}`, getConfig());
        return response.data;
    },

    updateSchedule: async (id, data) => {
        const response = await axios.put(`${API_URL}/schedules/${id}`, data, getConfig());
        return response.data;
    },

    getOTRoster: async (date) => {
        const config = getConfig();
        if (date) config.params = { date };
        const response = await axios.get(`${API_URL}/ot-roster`, config);
        return response.data;
    },

    startSurgery: async (id) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/start`, {}, getConfig());
        return response.data;
    },

    completeSurgery: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/complete`, data, getConfig());
        return response.data;
    },

    cancelSurgery: async (id, reason) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/cancel`, { reason }, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRE-OP ASSESSMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    addPreOpAssessment: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/pre-op-assessment`, data, getConfig());
        return response.data;
    },

    getPreOpAssessment: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/pre-op-assessment`, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // WHO CHECKLIST
    // ═══════════════════════════════════════════════════════════════════════════════

    updateWHOSignIn: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/who-checklist/sign-in`, data, getConfig());
        return response.data;
    },

    updateWHOTimeOut: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/who-checklist/time-out`, data, getConfig());
        return response.data;
    },

    updateWHOSignOut: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/who-checklist/sign-out`, data, getConfig());
        return response.data;
    },

    getWHOChecklist: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/who-checklist`, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ANESTHESIA RECORD
    // ═══════════════════════════════════════════════════════════════════════════════

    addAnesthesiaRecord: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/anesthesia-record`, data, getConfig());
        return response.data;
    },

    addAnesthesiaVitals: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/anesthesia-record/vitals`, data, getConfig());
        return response.data;
    },

    addAnesthesiaDrug: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/anesthesia-record/drug`, data, getConfig());
        return response.data;
    },

    getAnesthesiaRecord: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/anesthesia-record`, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // IMPLANTS & CONSUMABLES
    // ═══════════════════════════════════════════════════════════════════════════════

    addImplantConsumable: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/implants-consumables`, data, getConfig());
        return response.data;
    },

    getImplantsConsumables: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/implants-consumables`, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // INTRA-OP NOTES
    // ═══════════════════════════════════════════════════════════════════════════════

    addIntraOpNote: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/intra-op-notes`, data, getConfig());
        return response.data;
    },

    getIntraOpNotes: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/intra-op-notes`, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // POST-OP ORDERS
    // ═══════════════════════════════════════════════════════════════════════════════

    addPostOpOrder: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/post-op-orders`, data, getConfig());
        return response.data;
    },

    getPostOpOrders: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/post-op-orders`, getConfig());
        return response.data;
    },

    updatePostOpOrderStatus: async (surgeryId, orderIndex, status) => {
        const response = await axios.put(
            `${API_URL}/schedules/${surgeryId}/post-op-orders/${orderIndex}`,
            { status },
            getConfig()
        );
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // INFECTION CONTROL
    // ═══════════════════════════════════════════════════════════════════════════════

    updateInfectionControl: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/infection-control`, data, getConfig());
        return response.data;
    },

    getInfectionControl: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/infection-control`, getConfig());
        return response.data;
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // BILLING
    // ═══════════════════════════════════════════════════════════════════════════════

    generateOTBilling: async (id, data) => {
        const response = await axios.post(`${API_URL}/schedules/${id}/generate-billing`, data, getConfig());
        return response.data;
    },

    getOTBilling: async (id) => {
        const response = await axios.get(`${API_URL}/schedules/${id}/billing`, getConfig());
        return response.data;
    },
};

export default surgeryService;
