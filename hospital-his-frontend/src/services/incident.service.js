import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/incidents';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

/**
 * Create a new incident report
 */
const createIncident = async (incidentData) => {
    const response = await axios.post(API_URL, incidentData, getConfig());
    return response.data;
};

/**
 * Get all incident reports (with optional filters)
 */
const getAllIncidents = async (params = {}) => {
    const config = getConfig();
    config.params = params;
    const response = await axios.get(API_URL, config);
    return response.data;
};

/**
 * Get incident report by ID
 */
const getIncidentById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`, getConfig());
    return response.data;
};

/**
 * Get current user's incident reports
 */
const getMyIncidents = async () => {
    const config = getConfig();
    config.params = { myReports: 'true' };
    const response = await axios.get(API_URL, config);
    return response.data;
};

/**
 * Get incident reports for user's department (Dept Head only sees all; staff sees own)
 */
const getDepartmentIncidents = async () => {
    const config = getConfig();
    config.params = { departmentReports: 'true' };
    const response = await axios.get(API_URL, config);
    return response.data;
};

/**
 * Update incident status
 */
const updateStatus = async (id, status, reviewNotes) => {
    const response = await axios.put(`${API_URL}/${id}/status`, { status, reviewNotes }, getConfig());
    return response.data;
};

/**
 * Reassign incident to another user (Admin only)
 */
const reassignIncident = async (id, assignedTo) => {
    const response = await axios.put(`${API_URL}/${id}/assign`, { assignedTo }, getConfig());
    return response.data;
};

/**
 * Add review notes
 */
const addReviewNotes = async (id, reviewNotes) => {
    const response = await axios.put(`${API_URL}/${id}/notes`, { reviewNotes }, getConfig());
    return response.data;
};

const incidentService = {
    createIncident,
    getAllIncidents,
    getIncidentById,
    getMyIncidents,
    getDepartmentIncidents,
    updateStatus,
    reassignIncident,
    addReviewNotes,
};

export default incidentService;
