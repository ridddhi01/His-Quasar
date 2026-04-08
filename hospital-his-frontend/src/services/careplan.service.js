import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Get auth headers
const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return {
        headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
        },
    };
};

/**
 * Care Plan Service
 * For doctors to create/manage care plans
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CARE PLAN CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new care plan
 * @param {Object} carePlanData - Care plan details
 */
export const createCarePlan = async (carePlanData) => {
    const response = await axios.post(
        `${API_URL}/care-plans`,
        carePlanData,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Get care plans for a patient
 * @param {string} patientId - Patient ID
 * @param {string} status - Filter by status (active, completed, all)
 */
export const getPatientCarePlans = async (patientId, status = 'active') => {
    const response = await axios.get(
        `${API_URL}/care-plans/patient/${patientId}?status=${status}`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Get care plan by ID
 * @param {string} carePlanId - Care plan ID
 */
export const getCarePlanById = async (carePlanId) => {
    const response = await axios.get(
        `${API_URL}/care-plans/${carePlanId}`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Update care plan
 * @param {string} carePlanId - Care plan ID
 * @param {Object} updates - Fields to update
 */
export const updateCarePlan = async (carePlanId, updates) => {
    const response = await axios.put(
        `${API_URL}/care-plans/${carePlanId}`,
        updates,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Add goal to care plan
 * @param {string} carePlanId - Care plan ID
 * @param {Object} goal - Goal details
 */
export const addGoal = async (carePlanId, goal) => {
    const response = await axios.post(
        `${API_URL}/care-plans/${carePlanId}/goals`,
        goal,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Add intervention to care plan
 * @param {string} carePlanId - Care plan ID
 * @param {Object} intervention - Intervention details
 */
export const addIntervention = async (carePlanId, intervention) => {
    const response = await axios.post(
        `${API_URL}/care-plans/${carePlanId}/interventions`,
        intervention,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Update goal status
 * @param {string} carePlanId - Care plan ID
 * @param {number} goalIndex - Goal index
 * @param {Object} data - Status and notes
 */
export const updateGoalStatus = async (carePlanId, goalIndex, data) => {
    const response = await axios.put(
        `${API_URL}/care-plans/${carePlanId}/goals/${goalIndex}`,
        data,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Resolve flagged issue
 * @param {string} carePlanId - Care plan ID
 * @param {number} issueIndex - Issue index
 * @param {string} resolution - Resolution notes
 */
export const resolveIssue = async (carePlanId, issueIndex, resolution) => {
    const response = await axios.post(
        `${API_URL}/care-plans/${carePlanId}/issues/${issueIndex}/resolve`,
        { resolution },
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Discontinue care plan
 * @param {string} carePlanId - Care plan ID
 * @param {string} reason - Discontinuation reason
 */
export const discontinueCarePlan = async (carePlanId, reason) => {
    const response = await axios.post(
        `${API_URL}/care-plans/${carePlanId}/discontinue`,
        { reason },
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Assign nurses to care plan
 * @param {string} carePlanId - Care plan ID
 * @param {Array} nurseIds - Array of nurse IDs
 */
export const assignNurses = async (carePlanId, nurseIds) => {
    const response = await axios.post(
        `${API_URL}/care-plans/${carePlanId}/assign-nurses`,
        { nurseIds },
        getAuthHeaders()
    );
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// NURSE ASSIGNMENT (For Supervisors)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all nurses
 */
export const getAllNurses = async () => {
    const response = await axios.get(
        `${API_URL}/nurse-assignments/nurses`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Create shift assignment
 * @param {Object} assignmentData - Shift assignment details
 */
export const createShiftAssignment = async (assignmentData) => {
    const response = await axios.post(
        `${API_URL}/nurse-assignments/roster`,
        assignmentData,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Get duty roster
 * @param {Object} params - Query parameters (startDate, endDate, wardId, nurseId)
 */
export const getDutyRoster = async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(
        `${API_URL}/nurse-assignments/roster?${queryString}`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Update shift assignment
 * @param {string} shiftId - Shift ID
 * @param {Object} updates - Fields to update
 */
export const updateShiftAssignment = async (shiftId, updates) => {
    const response = await axios.put(
        `${API_URL}/nurse-assignments/roster/${shiftId}`,
        updates,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Cancel shift assignment
 * @param {string} shiftId - Shift ID
 */
export const cancelShiftAssignment = async (shiftId) => {
    const response = await axios.delete(
        `${API_URL}/nurse-assignments/roster/${shiftId}`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Assign patients to nurse
 * @param {string} shiftId - Shift ID
 * @param {Array} patientAssignments - Array of patient assignments
 */
export const assignPatientsToNurse = async (shiftId, patientAssignments) => {
    const response = await axios.post(
        `${API_URL}/nurse-assignments/patients`,
        { shiftId, patientAssignments },
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Get patients in ward for assignment
 * @param {string} wardId - Ward ID
 */
export const getWardPatients = async (wardId) => {
    const response = await axios.get(
        `${API_URL}/nurse-assignments/ward/${wardId}/patients`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Get current ward assignments
 * @param {string} wardId - Ward ID
 * @param {string} shiftType - Shift type (morning, evening, night)
 */
export const getCurrentWardAssignments = async (wardId, shiftType = null) => {
    const query = shiftType ? `?shiftType=${shiftType}` : '';
    const response = await axios.get(
        `${API_URL}/nurse-assignments/ward/${wardId}/shift${query}`,
        getAuthHeaders()
    );
    return response.data;
};

/**
 * Swap patient assignment between nurses
 * @param {Object} swapData - Swap details (fromShiftId, toShiftId, patientId, admissionId)
 */
export const swapPatientAssignment = async (swapData) => {
    const response = await axios.post(
        `${API_URL}/nurse-assignments/swap`,
        swapData,
        getAuthHeaders()
    );
    return response.data;
};

export default {
    // Care Plans
    createCarePlan,
    getPatientCarePlans,
    getCarePlanById,
    updateCarePlan,
    addGoal,
    addIntervention,
    updateGoalStatus,
    resolveIssue,
    discontinueCarePlan,
    assignNurses,
    // Nurse Assignments
    getAllNurses,
    createShiftAssignment,
    getDutyRoster,
    updateShiftAssignment,
    cancelShiftAssignment,
    assignPatientsToNurse,
    getWardPatients,
    getCurrentWardAssignments,
    swapPatientAssignment,
};
