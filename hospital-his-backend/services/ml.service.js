const axios = require('axios');
const config = require('../config/config');

/**
 * ML Service
 * Bridge to Python ML services for AI features
 */

class MLService {
    constructor() {
        this.revenueServiceUrl = config.ml?.revenueServiceUrl || 'http://localhost:5001';
        this.predictServiceUrl = config.ml?.predictServiceUrl || 'http://localhost:5002';
        this.timeout = 30000; // 30 seconds timeout
    }

    /**
     * Create axios instance with timeout
     */
    createClient(baseURL) {
        return axios.create({
            baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    // ==========================================
    // Revenue Leakage Detection Service
    // ==========================================

    /**
     * Detect revenue anomalies
     */
    async detectRevenueAnomalies(billingData) {
        try {
            const client = this.createClient(this.revenueServiceUrl);
            const response = await client.post('/api/detect', { data: billingData });
            return response.data;
        } catch (error) {
            console.error('ML Revenue Service Error:', error.message);
            throw new Error('Revenue detection service unavailable');
        }
    }

    /**
     * Get anomaly score for a specific billing
     */
    async getAnomalyScore(billingId) {
        try {
            const client = this.createClient(this.revenueServiceUrl);
            const response = await client.get(`/api/score/${billingId}`);
            return response.data;
        } catch (error) {
            console.error('ML Revenue Service Error:', error.message);
            throw new Error('Revenue detection service unavailable');
        }
    }

    /**
     * Train/update anomaly detection model
     */
    async trainRevenueModel(trainingData) {
        try {
            const client = this.createClient(this.revenueServiceUrl);
            const response = await client.post('/api/train', { data: trainingData });
            return response.data;
        } catch (error) {
            console.error('ML Revenue Service Error:', error.message);
            throw new Error('Model training failed');
        }
    }

    // ==========================================
    // Predictive Analytics Service
    // ==========================================

    /**
     * Predict OPD rush hours
     */
    async predictOPDRush(historicalData, forecastDays = 7) {
        try {
            const client = this.createClient(this.predictServiceUrl);
            const response = await client.post('/api/predict/opd-rush', {
                data: historicalData,
                forecastDays,
            });
            return response.data;
        } catch (error) {
            console.error('ML Predict Service Error:', error.message);
            throw new Error('Prediction service unavailable');
        }
    }

    /**
     * Predict bed occupancy
     */
    async predictBedOccupancy(historicalData, forecastDays = 7) {
        try {
            const client = this.createClient(this.predictServiceUrl);
            const response = await client.post('/api/predict/bed-occupancy', {
                data: historicalData,
                forecastDays,
            });
            return response.data;
        } catch (error) {
            console.error('ML Predict Service Error:', error.message);
            throw new Error('Prediction service unavailable');
        }
    }

    /**
     * Predict lab workload
     */
    async predictLabWorkload(historicalData, forecastDays = 7) {
        try {
            const client = this.createClient(this.predictServiceUrl);
            const response = await client.post('/api/predict/lab-workload', {
                data: historicalData,
                forecastDays,
            });
            return response.data;
        } catch (error) {
            console.error('ML Predict Service Error:', error.message);
            throw new Error('Prediction service unavailable');
        }
    }

    /**
     * Predict resource requirements
     */
    async predictResourceRequirements(params) {
        try {
            const client = this.createClient(this.predictServiceUrl);
            const response = await client.post('/api/predict/resources', params);
            return response.data;
        } catch (error) {
            console.error('ML Predict Service Error:', error.message);
            throw new Error('Prediction service unavailable');
        }
    }

    // ==========================================
    // Health Check
    // ==========================================

    /**
     * Check ML services health
     */
    async checkHealth() {
        const results = {
            revenueService: { status: 'unknown', url: this.revenueServiceUrl },
            predictService: { status: 'unknown', url: this.predictServiceUrl },
        };

        try {
            const revenueClient = this.createClient(this.revenueServiceUrl);
            await revenueClient.get('/health');
            results.revenueService.status = 'healthy';
        } catch {
            results.revenueService.status = 'unhealthy';
        }

        try {
            const predictClient = this.createClient(this.predictServiceUrl);
            await predictClient.get('/health');
            results.predictService.status = 'healthy';
        } catch {
            results.predictService.status = 'unhealthy';
        }

        return results;
    }

    // ==========================================
    // Data Preparation Helpers
    // ==========================================

    /**
     * Prepare billing data for anomaly detection
     */
    prepareBillingDataForML(bills) {
        return bills.map((bill) => ({
            billId: bill._id.toString(),
            patientId: bill.patient?.toString(),
            amount: bill.grandTotal,
            itemCount: bill.items?.length || 0,
            department: bill.department?.toString(),
            visitType: bill.visitModel,
            date: bill.billDate,
        }));
    }

    /**
     * Prepare appointment data for predictions
     */
    prepareAppointmentDataForML(appointments) {
        return appointments.map((apt) => ({
            date: apt.scheduledDate,
            hour: parseInt(apt.scheduledTime?.split(':')[0] || 0, 10),
            department: apt.department?.toString(),
            dayOfWeek: new Date(apt.scheduledDate).getDay(),
        }));
    }
}

module.exports = new MLService();
