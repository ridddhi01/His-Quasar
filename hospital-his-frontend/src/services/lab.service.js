import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/lab';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const labService = {
    // Get Lab Work Queue (pending tests)
    getQueue: async () => {
        const response = await axios.get(`${API_URL}/queue`, getConfig());
        return response.data;
    },

    // Get Dashboard Stats
    getDashboard: async () => {
        const response = await axios.get(`${API_URL}/dashboard`, getConfig());
        return response.data;
    },

    // Get Order Details by ID
    getOrderById: async (orderId) => {
        const response = await axios.get(`${API_URL}/orders/${orderId}`, getConfig());
        return response.data;
    },

    // Collect Sample
    collectSample: async (orderId) => {
        const response = await axios.post(`${API_URL}/orders/${orderId}/collect-sample`, {}, getConfig());
        return response.data;
    },

    // Enter Results
    enterResults: async (orderId, results, remarks) => {
        const response = await axios.post(`${API_URL}/orders/${orderId}/enter-results`, { results, remarks }, getConfig());
        return response.data;
    },

    // Get Available Lab Tests (Master List)
    getLabTests: async () => {
        const response = await axios.get(`${API_URL}/tests`, getConfig());
        return response.data;
    },

    // Get All Orders (with optional status filter)
    getAllOrders: async (status = '') => {
        const url = status ? `${API_URL}/orders?status=${status}` : `${API_URL}/orders`;
        const response = await axios.get(url, getConfig());
        return response.data;
    },

    // Upload PDF Report
    uploadReport: async (orderId, file) => {
        const formData = new FormData();
        formData.append('report', file);
        const config = getConfig();
        config.headers['Content-Type'] = 'multipart/form-data';
        const response = await axios.post(`${API_URL}/orders/${orderId}/upload-report`, formData, config);
        return response.data;
    },

    // Get Report (PDF path + AI summary)
    getReport: async (orderId) => {
        const response = await axios.get(`${API_URL}/orders/${orderId}/report`, getConfig());
        return response.data;
    }
};

export default labService;
