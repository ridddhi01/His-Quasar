import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/insurance';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

// Claims Management
const getAllClaims = async (params) => {
    const config = getConfig();
    config.params = params;
    const response = await axios.get(`${API_URL}/claims`, config);
    return response.data;
};

const getClaimById = async (id) => {
    const response = await axios.get(`${API_URL}/claims/${id}`, getConfig());
    return response.data;
};

const createClaim = async (claimData) => {
    const response = await axios.post(`${API_URL}/claims`, claimData, getConfig());
    return response.data;
};

const updateClaim = async (id, updateData) => {
    const response = await axios.put(`${API_URL}/claims/${id}`, updateData, getConfig());
    return response.data;
};

// Claim Lifecycle
const submitClaim = async (id) => {
    const response = await axios.post(`${API_URL}/claims/${id}/submit`, {}, getConfig());
    return response.data;
};

const approveClaim = async (id, approvedAmount, remarks) => {
    const response = await axios.post(`${API_URL}/claims/${id}/approve`,
        { approvedAmount, remarks }, getConfig());
    return response.data;
};

const rejectClaim = async (id, rejectionReason) => {
    const response = await axios.post(`${API_URL}/claims/${id}/reject`,
        { rejectionReason }, getConfig());
    return response.data;
};

const settleClaim = async (id, settlementAmount, settlementReference, remarks) => {
    const response = await axios.post(`${API_URL}/claims/${id}/settle`,
        { settlementAmount, settlementReference, remarks }, getConfig());
    return response.data;
};

// Pre-Authorization
const updatePreAuth = async (id, status, amount, remarks) => {
    const response = await axios.put(`${API_URL}/claims/${id}/pre-auth`,
        { status, amount, remarks }, getConfig());
    return response.data;
};

// Timeline & Audit
const getClaimTimeline = async (id) => {
    const response = await axios.get(`${API_URL}/claims/${id}/timeline`, getConfig());
    return response.data;
};

// Providers
const getProviders = async () => {
    const response = await axios.get(`${API_URL}/providers`, getConfig());
    return response.data;
};

const getTPAProviders = async () => {
    const response = await axios.get(`${API_URL}/tpa-providers`, getConfig());
    return response.data;
};

const addTPAProvider = async (providerData) => {
    const response = await axios.post(`${API_URL}/tpa-providers`, providerData, getConfig());
    return response.data;
};

const insuranceService = {
    getAllClaims,
    getClaimById,
    createClaim,
    updateClaim,
    submitClaim,
    approveClaim,
    rejectClaim,
    settleClaim,
    updatePreAuth,
    getClaimTimeline,
    getProviders,
    getTPAProviders,
    addTPAProvider,
};

export default insuranceService;
