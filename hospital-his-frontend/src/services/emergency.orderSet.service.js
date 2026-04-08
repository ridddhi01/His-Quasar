/**
 * Emergency Order Set Service (Frontend)
 * API service for emergency order set (bundle) operations
 */

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

// --- Bundle Operations ---

/**
 * Get available emergency order sets
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} List of bundles
 */
const getAvailableBundles = async (category = null) => {
    const params = category ? { category } : {};
    const response = await axios.get(
        API_BASE_URL + 'emergency/order-sets',
        { ...getConfig(), params }
    );
    return response.data.data;
};

/**
 * Get trauma bundle by level
 * @param {number} level - Trauma level (1, 2, or 3)
 * @returns {Promise<Object>} Trauma bundle
 */
const getTraumaBundleByLevel = async (level) => {
    const response = await axios.get(
        API_BASE_URL + `emergency/order-sets/trauma/${level}`,
        getConfig()
    );
    return response.data.data;
};

/**
 * Apply bundle to emergency case
 * @param {string} emergencyCaseId - Case ID
 * @param {Object} bundleData - Application data
 * @returns {Promise<Object>} Result
 */
const applyBundle = async (emergencyCaseId, bundleData) => {
    const response = await axios.post(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/apply-bundle`,
        bundleData,
        getConfig()
    );
    return response.data.data;
};

/**
 * Get applied bundles for case
 * @param {string} emergencyCaseId - Case ID
 * @returns {Promise<Array>} List of applied bundles
 */
const getAppliedBundles = async (emergencyCaseId) => {
    const response = await axios.get(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/bundles`,
        getConfig()
    );
    return response.data.data;
};

// --- Nursing Operations ---

/**
 * Add nursing note
 * @param {string} emergencyCaseId - Case ID
 * @param {string} note - Note content
 * @returns {Promise<Array>} Updated notes list
 */
const addNursingNote = async (emergencyCaseId, note) => {
    const response = await axios.post(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/nursing-notes`,
        { note },
        getConfig()
    );
    return response.data.data;
};

/**
 * Mark patient ready for doctor
 * @param {string} emergencyCaseId - Case ID
 * @returns {Promise<Object>} Status update
 */
const markReadyForDoctor = async (emergencyCaseId) => {
    const response = await axios.post(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/ready-for-doctor`,
        {},
        getConfig()
    );
    return response.data.data;
};

// --- Doctor Operations ---

/**
 * Set emergency tag
 * @param {string} emergencyCaseId - Case ID
 * @param {string} tag - Emergency tag
 * @param {number} traumaLevel - Optional trauma level (1-3)
 * @returns {Promise<Object>} Updated tag info
 */
const setEmergencyTag = async (emergencyCaseId, tag, traumaLevel = null) => {
    const response = await axios.post(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/set-tag`,
        { tag, traumaLevel },
        getConfig()
    );
    return response.data.data;
};

/**
 * Process disposition (Transfer/Discharge)
 * @param {string} emergencyCaseId - Case ID
 * @param {Object} dispositionData - Disposition details
 * @returns {Promise<Object>} Result
 */
const processDisposition = async (emergencyCaseId, dispositionData) => {
    const response = await axios.post(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/disposition`,
        dispositionData,
        getConfig()
    );
    return response.data.data;
};

/**
 * Update case status
 * @param {string} emergencyCaseId - Case ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated case
 */
const updateStatus = async (emergencyCaseId, status) => {
    const response = await axios.put(
        API_BASE_URL + `emergency/cases/${emergencyCaseId}/status`,
        { status },
        getConfig()
    );
    return response.data.data;
};

const emergencyOrderSetService = {
    getAvailableBundles,
    getTraumaBundleByLevel,
    applyBundle,
    getAppliedBundles,
    addNursingNote,
    markReadyForDoctor,
    setEmergencyTag,
    processDisposition,
    updateStatus,
};

export default emergencyOrderSetService;
