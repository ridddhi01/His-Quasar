import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/v1/';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.token) {
        return {
            headers: { Authorization: `Bearer ${user.token}` }
        };
    }
    return {};
};

// --- Emergency Live Board ---

const getLiveBoard = async () => {
    const response = await axios.get(API_BASE_URL + 'emergency/live-board', getConfig());
    return response.data.data;
};

// --- Emergency Cases ---

const createCase = async (caseData) => {
    const response = await axios.post(API_BASE_URL + 'emergency/cases', caseData, getConfig());
    return response.data.data;
};

const getCaseById = async (id) => {
    const response = await axios.get(API_BASE_URL + `emergency/cases/${id}`, getConfig());
    return response.data.data;
};

const updateCase = async (id, caseData) => {
    const response = await axios.put(API_BASE_URL + `emergency/cases/${id}`, caseData, getConfig());
    return response.data.data;
};

// --- Triage ---

const updateTriage = async (id, triageData) => {
    const response = await axios.post(API_BASE_URL + `emergency/cases/${id}/triage`, triageData, getConfig());
    return response.data.data;
};

// --- Status ---

const updateStatus = async (id, status) => {
    const response = await axios.put(API_BASE_URL + `emergency/cases/${id}/status`, { status }, getConfig());
    return response.data.data;
};

// --- Queue ---

const getQueue = async () => {
    const response = await axios.get(API_BASE_URL + 'emergency/queue', getConfig());
    return response.data.data;
};

// --- Dashboard Stats ---

const getDashboardStats = async () => {
    const response = await axios.get(API_BASE_URL + 'emergency/dashboard', getConfig());
    return response.data.data;
};

// --- Vitals ---

const updateVitals = async (id, vitalsData) => {
    const response = await axios.post(API_BASE_URL + `emergency/cases/${id}/vitals`, vitalsData, getConfig());
    return response.data.data;
};

const emergencyService = {
    getLiveBoard,
    createCase,
    getCaseById,
    updateCase,
    updateTriage,
    updateStatus,
    updateVitals,
    getQueue,
    getDashboardStats,
};

export default emergencyService;
