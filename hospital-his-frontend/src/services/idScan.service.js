/**
 * ID Scan Service
 * ===============
 * Frontend service for communicating with the backend ID scanning endpoint.
 * Sends ID card images and receives extracted patient data.
 */

import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/patients/';

/**
 * Get authorization config from localStorage
 */
const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.token) {
        return {
            headers: {
                Authorization: `Bearer ${user.token}`,
                'Content-Type': 'multipart/form-data'
            }
        };
    }
    return {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    };
};

/**
 * Scan an ID card image and extract patient details
 * @param {File} imageFile - The ID card image file
 * @returns {Promise<Object>} Extracted patient data with masked Aadhaar
 */
const scanIdCard = async (imageFile) => {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('idImage', imageFile);

    try {
        const response = await axios.post(
            `${API_URL}scan-id`,
            formData,
            getConfig()
        );

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data
            };
        } else {
            throw new Error(response.data.message || 'Scan failed');
        }
    } catch (error) {
        console.error('ID Scan Error:', error);

        // Extract meaningful error message
        const errorMessage = error.response?.data?.error
            || error.response?.data?.message
            || error.message
            || 'Failed to scan ID card';

        return {
            success: false,
            error: errorMessage
        };
    }
};

/**
 * Check if the AI OCR service is available
 * @returns {Promise<boolean>} True if service is running
 */
const checkServiceAvailability = async () => {
    try {
        const response = await axios.get('http://localhost:8000/health', {
            timeout: 3000
        });
        return response.data.status === 'healthy';
    } catch {
        return false;
    }
};

const idScanService = {
    scanIdCard,
    checkServiceAvailability
};

export default idScanService;
