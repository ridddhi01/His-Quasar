/**
 * Radiology Service
 * API calls for Radiology module
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
    baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export const createOrder = async (orderData) => {
    const response = await api.post('/radiology/orders', orderData);
    return response.data;
};

export const getOrders = async (params = {}) => {
    const response = await api.get('/radiology/orders', { params });
    return response.data;
};

export const getOrderById = async (orderId) => {
    const response = await api.get(`/radiology/orders/${orderId}`);
    return response.data;
};

export const updateOrder = async (orderId, data) => {
    const response = await api.put(`/radiology/orders/${orderId}`, data);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULING & WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════

export const scheduleTest = async (orderId, scheduledAt) => {
    const response = await api.post(`/radiology/orders/${orderId}/schedule`, { scheduledAt });
    return response.data;
};

export const enterReport = async (orderId, reportData) => {
    const response = await api.post(`/radiology/orders/${orderId}/enter-report`, reportData);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE & DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export const getQueue = async () => {
    const response = await api.get('/radiology/queue');
    return response.data;
};

export const getDashboard = async () => {
    const response = await api.get('/radiology/dashboard');
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const getTests = async () => {
    const response = await api.get('/radiology/tests');
    return response.data;
};

export default {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    scheduleTest,
    enterReport,
    getQueue,
    getDashboard,
    getTests,
};
