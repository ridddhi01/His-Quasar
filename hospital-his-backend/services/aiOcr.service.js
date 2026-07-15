/**
 * AI OCR Service
 * ==============
 * Service to communicate with the external FastAPI AI OCR microservice.
 * Handles multipart image upload and returns extracted patient data.
 * 
 * @module services/aiOcr.service
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// AI OCR Service base URL - configurable via environment
const AI_OCR_SERVICE_URL = process.env.AI_OCR_SERVICE_URL;

/**
 * Extract patient details from an ID card image
 * Sends image to FastAPI AI service and returns extracted data
 * 
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - File MIME type
 * @returns {Promise<Object>} Extracted patient data with masked Aadhaar
 */
const extractIdDetails = async (imageBuffer, filename, mimetype) => {
    try {
        logger.info(`AI OCR Service: Sending image for extraction - ${filename}`);

        // Create form data for multipart upload
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: filename,
            contentType: mimetype
        });

        // Send to AI service
        const response = await axios.post(
            `${AI_OCR_SERVICE_URL}/extract-id`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 120000, // 2 minute timeout for model inference
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        if (response.data.success) {
            logger.info(`AI OCR Service: Extraction successful - Confidence: ${response.data.confidence}`);

            // Return sanitized data (should already be safe, but double-check)
            return {
                success: true,
                firstName: response.data.firstName || '',
                lastName: response.data.lastName || '',
                dateOfBirth: response.data.dateOfBirth || null,
                gender: response.data.gender || null,
                maskedAadhaar: response.data.maskedAadhaar || null,
                maskedImageUrl: response.data.maskedImageUrl
                    ? `${AI_OCR_SERVICE_URL}${response.data.maskedImageUrl}`
                    : null,
                confidence: response.data.confidence || 'low'
            };
        } else {
            throw new Error(response.data.message || 'Extraction failed');
        }

    } catch (error) {
        logger.error(`AI OCR Service Error: ${error.message}`);

        // Handle specific error types
        if (error.code === 'ECONNREFUSED') {
            throw new Error('AI OCR service is not running. Please start the service on port 8000.');
        }

        if (error.response) {
            // Server responded with error
            throw new Error(error.response.data?.detail || 'AI service error');
        }

        throw error;
    }
};

/**
 * Check if AI OCR service is healthy
 * @returns {Promise<boolean>} True if service is running
 */
const checkHealth = async () => {
    try {
        const response = await axios.get(`${AI_OCR_SERVICE_URL}/health`, {
            timeout: 5000
        });
        return response.data.status === 'healthy';
    } catch (error) {
        logger.warn(`AI OCR Service health check failed: ${error.message}`);
        return false;
    }
};

/**
 * Get service status information
 * @returns {Promise<Object>} Service status details
 */
const getStatus = async () => {
    try {
        const response = await axios.get(`${AI_OCR_SERVICE_URL}/health`, {
            timeout: 5000
        });
        return {
            available: true,
            ...response.data
        };
    } catch (error) {
        return {
            available: false,
            error: error.message
        };
    }
};

module.exports = {
    extractIdDetails,
    checkHealth,
    getStatus
};
