import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/clinical-coding';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE CODES (Master Data)
// ═══════════════════════════════════════════════════════════════════════════════

const getProcedureCodes = async (params = {}) => {
    const config = getConfig();
    config.params = params;
    const response = await axios.get(`${API_URL}/procedure-codes`, config);
    return response.data;
};

const getProcedureCodeById = async (id) => {
    const response = await axios.get(`${API_URL}/procedure-codes/${id}`, getConfig());
    return response.data;
};

const createProcedureCode = async (data) => {
    const response = await axios.post(`${API_URL}/procedure-codes`, data, getConfig());
    return response.data;
};

const updateProcedureCode = async (id, data) => {
    const response = await axios.put(`${API_URL}/procedure-codes/${id}`, data, getConfig());
    return response.data;
};

const deleteProcedureCode = async (id) => {
    const response = await axios.delete(`${API_URL}/procedure-codes/${id}`, getConfig());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL CODING RECORDS - READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getDashboard = async () => {
    const response = await axios.get(`${API_URL}/dashboard`, getConfig());
    return response.data;
};

const getPendingReview = async (params = {}) => {
    const config = getConfig();
    config.params = params;
    const response = await axios.get(`${API_URL}/pending-review`, config);
    return response.data;
};

const getCodingRecords = async (params = {}) => {
    const config = getConfig();
    config.params = params;
    const response = await axios.get(`${API_URL}/records`, config);
    return response.data;
};

const getCodingRecordById = async (id) => {
    const response = await axios.get(`${API_URL}/records/${id}`, getConfig());
    return response.data;
};

const getCodingByEncounter = async (encounterId, encounterModel) => {
    const config = getConfig();
    config.params = { encounterModel };
    const response = await axios.get(`${API_URL}/encounter/${encounterId}`, config);
    return response.data;
};

const getTransitions = async (recordId) => {
    const response = await axios.get(`${API_URL}/records/${recordId}/transitions`, getConfig());
    return response.data;
};

const getRecordAudit = async (recordId) => {
    const response = await axios.get(`${API_URL}/records/${recordId}/audit`, getConfig());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL CODING RECORDS - EDIT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const updateCodingRecord = async (id, data) => {
    const response = await axios.put(`${API_URL}/records/${id}`, data, getConfig());
    return response.data;
};

const addCodesToRecord = async (recordId, codes) => {
    const response = await axios.post(
        `${API_URL}/records/${recordId}/codes`,
        { codes },
        getConfig()
    );
    return response.data;
};

const removeCodeFromRecord = async (recordId, codeId) => {
    const response = await axios.delete(
        `${API_URL}/records/${recordId}/codes/${codeId}`,
        getConfig()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start coding (awaiting-coding → in-progress)
 */
const startCoding = async (recordId) => {
    const response = await axios.post(
        `${API_URL}/records/${recordId}/start`,
        {},
        getConfig()
    );
    return response.data;
};

/**
 * Submit coding for review (in-progress/returned → pending-review)
 */
const submitForReview = async (recordId) => {
    const response = await axios.post(
        `${API_URL}/records/${recordId}/submit`,
        {},
        getConfig()
    );
    return response.data;
};

/**
 * Approve coding (pending-review → approved)
 * Only senior_coder/admin can perform this action
 */
const approveCoding = async (recordId) => {
    const response = await axios.post(
        `${API_URL}/records/${recordId}/approve`,
        {},
        getConfig()
    );
    return response.data;
};

/**
 * Return coding for correction (pending-review → returned)
 * Only senior_coder/admin can perform this action
 * @param {string} recordId - Record ID
 * @param {string} reason - REQUIRED return reason
 */
const returnForCorrection = async (recordId, reason) => {
    const response = await axios.post(
        `${API_URL}/records/${recordId}/return`,
        { reason },
        getConfig()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const CLINICAL_CODING_STATUS = {
    AWAITING_CODING: 'awaiting-coding',
    IN_PROGRESS: 'in-progress',
    PENDING_REVIEW: 'pending-review',
    APPROVED: 'approved',
    RETURNED: 'returned',
};

const STATUS_LABELS = {
    'awaiting-coding': 'Awaiting Coding',
    'in-progress': 'In Progress',
    'pending-review': 'Pending Review',
    'approved': 'Approved for Billing',
    'returned': 'Returned for Correction',
};

const STATUS_COLORS = {
    'awaiting-coding': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'pending-review': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'approved': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    'returned': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const clinicalCodingService = {
    // Procedure Codes
    getProcedureCodes,
    getProcedureCodeById,
    createProcedureCode,
    updateProcedureCode,
    deleteProcedureCode,
    // Coding Records - Read
    getDashboard,
    getPendingReview,
    getCodingRecords,
    getCodingRecordById,
    getCodingByEncounter,
    getTransitions,
    getRecordAudit,
    // Coding Records - Edit
    updateCodingRecord,
    addCodesToRecord,
    removeCodeFromRecord,
    // Workflow Actions
    startCoding,
    submitForReview,
    approveCoding,
    returnForCorrection,
    // Status Constants & Helpers
    CLINICAL_CODING_STATUS,
    STATUS_LABELS,
    STATUS_COLORS,
};

export default clinicalCodingService;
