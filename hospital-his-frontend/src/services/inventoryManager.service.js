/**
 * Inventory Manager Service
 * Frontend API client for non-medicine inventory management
 * Only accessible by Inventory Manager role
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
const BASE_URL = `${API_URL}/inventory-manager`;

// Create axios instance with auth header
const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return {
        headers: {
            Authorization: `Bearer ${user?.token}`,
        },
    };
};

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export const getDashboard = async (locationId = null) => {
    const params = locationId ? { locationId } : {};
    const response = await axios.get(`${BASE_URL}/dashboard`, { ...getAuthHeaders(), params });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// INVENTORY ITEMS (MASTER)
// ═══════════════════════════════════════════════════════════════════

export const getItems = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/items`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getItem = async (id) => {
    const response = await axios.get(`${BASE_URL}/items/${id}`, getAuthHeaders());
    return response.data;
};

export const createItem = async (data) => {
    const response = await axios.post(`${BASE_URL}/items`, data, getAuthHeaders());
    return response.data;
};

export const updateItem = async (id, data) => {
    const response = await axios.put(`${BASE_URL}/items/${id}`, data, getAuthHeaders());
    return response.data;
};

export const deactivateItem = async (id, reason) => {
    const response = await axios.put(`${BASE_URL}/items/${id}/deactivate`, { reason }, getAuthHeaders());
    return response.data;
};

export const getItemAuditLog = async (id) => {
    const response = await axios.get(`${BASE_URL}/items/${id}/audit-log`, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════

export const getCategories = async () => {
    const response = await axios.get(`${BASE_URL}/categories`, getAuthHeaders());
    return response.data;
};

export const createCategory = async (data) => {
    const response = await axios.post(`${BASE_URL}/categories`, data, getAuthHeaders());
    return response.data;
};

export const updateCategory = async (id, data) => {
    const response = await axios.put(`${BASE_URL}/categories/${id}`, data, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════════════

export const getLocations = async () => {
    const response = await axios.get(`${BASE_URL}/locations`, getAuthHeaders());
    return response.data;
};

export const createLocation = async (data) => {
    const response = await axios.post(`${BASE_URL}/locations`, data, getAuthHeaders());
    return response.data;
};

export const updateLocation = async (id, data) => {
    const response = await axios.put(`${BASE_URL}/locations/${id}`, data, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// VENDORS
// ═══════════════════════════════════════════════════════════════════

export const getVendors = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/vendors`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getVendor = async (id) => {
    const response = await axios.get(`${BASE_URL}/vendors/${id}`, getAuthHeaders());
    return response.data;
};

export const createVendor = async (data) => {
    const response = await axios.post(`${BASE_URL}/vendors`, data, getAuthHeaders());
    return response.data;
};

export const updateVendor = async (id, data) => {
    const response = await axios.put(`${BASE_URL}/vendors/${id}`, data, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// PURCHASE REQUISITIONS
// ═══════════════════════════════════════════════════════════════════

export const getPurchaseRequisitions = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/purchase-requisitions`, { ...getAuthHeaders(), params });
    return response.data;
};

export const createPurchaseRequisition = async (data) => {
    const response = await axios.post(`${BASE_URL}/purchase-requisitions`, data, getAuthHeaders());
    return response.data;
};

export const approvePurchaseRequisition = async (id) => {
    const response = await axios.put(`${BASE_URL}/purchase-requisitions/${id}/approve`, {}, getAuthHeaders());
    return response.data;
};

export const rejectPurchaseRequisition = async (id, reason) => {
    const response = await axios.put(`${BASE_URL}/purchase-requisitions/${id}/reject`, { reason }, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════

export const getPurchaseOrders = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/purchase-orders`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getPurchaseOrder = async (id) => {
    const response = await axios.get(`${BASE_URL}/purchase-orders/${id}`, getAuthHeaders());
    return response.data;
};

export const createPurchaseOrder = async (data) => {
    const response = await axios.post(`${BASE_URL}/purchase-orders`, data, getAuthHeaders());
    return response.data;
};

export const approvePurchaseOrder = async (id) => {
    const response = await axios.put(`${BASE_URL}/purchase-orders/${id}/approve`, {}, getAuthHeaders());
    return response.data;
};

export const cancelPurchaseOrder = async (id, reason) => {
    const response = await axios.put(`${BASE_URL}/purchase-orders/${id}/cancel`, { reason }, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// GRN (GOODS RECEIPT)
// ═══════════════════════════════════════════════════════════════════

export const getGRNs = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/grns`, { ...getAuthHeaders(), params });
    return response.data;
};

export const createGRN = async (data) => {
    const response = await axios.post(`${BASE_URL}/grns`, data, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// STOCK MONITORING
// ═══════════════════════════════════════════════════════════════════

export const getStockLevels = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/stock/levels`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getLowStockItems = async (location = null) => {
    const params = location ? { location } : {};
    const response = await axios.get(`${BASE_URL}/stock/low-stock`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getNearExpiryItems = async (days = 30, location = null) => {
    const params = { days };
    if (location) params.location = location;
    const response = await axios.get(`${BASE_URL}/stock/near-expiry`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getExpiredItems = async (location = null) => {
    const params = location ? { location } : {};
    const response = await axios.get(`${BASE_URL}/stock/expired`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getSlowMovingItems = async (days = 90, location = null) => {
    const params = { days };
    if (location) params.location = location;
    const response = await axios.get(`${BASE_URL}/stock/slow-moving`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getDeadStock = async (days = 180, location = null) => {
    const params = { days };
    if (location) params.location = location;
    const response = await axios.get(`${BASE_URL}/stock/dead-stock`, { ...getAuthHeaders(), params });
    return response.data;
};

export const getStockMovementHistory = async (itemId, params = {}) => {
    const response = await axios.get(`${BASE_URL}/stock/movement/${itemId}`, { ...getAuthHeaders(), params });
    return response.data;
};

export const blockStock = async (stockId, reason) => {
    const response = await axios.put(`${BASE_URL}/stock/${stockId}/block`, { reason }, getAuthHeaders());
    return response.data;
};

export const unblockStock = async (stockId) => {
    const response = await axios.put(`${BASE_URL}/stock/${stockId}/unblock`, {}, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// STOCK ISSUE
// ═══════════════════════════════════════════════════════════════════

export const getStockIssues = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/stock-issues`, { ...getAuthHeaders(), params });
    return response.data;
};

export const createStockIssue = async (data) => {
    const response = await axios.post(`${BASE_URL}/stock-issues`, data, getAuthHeaders());
    return response.data;
};

export const approveStockIssue = async (id) => {
    const response = await axios.put(`${BASE_URL}/stock-issues/${id}/approve`, {}, getAuthHeaders());
    return response.data;
};

export const processStockIssue = async (id) => {
    const response = await axios.put(`${BASE_URL}/stock-issues/${id}/process`, {}, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// STOCK RETURN
// ═══════════════════════════════════════════════════════════════════

export const getStockReturns = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/stock-returns`, { ...getAuthHeaders(), params });
    return response.data;
};

export const createStockReturn = async (data) => {
    const response = await axios.post(`${BASE_URL}/stock-returns`, data, getAuthHeaders());
    return response.data;
};

export const processStockReturn = async (id, items) => {
    const response = await axios.put(`${BASE_URL}/stock-returns/${id}/process`, { items }, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// STOCK TRANSFER
// ═══════════════════════════════════════════════════════════════════

export const getStockTransfers = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/stock-transfers`, { ...getAuthHeaders(), params });
    return response.data;
};

export const createStockTransfer = async (data) => {
    const response = await axios.post(`${BASE_URL}/stock-transfers`, data, getAuthHeaders());
    return response.data;
};

export const approveStockTransfer = async (id) => {
    const response = await axios.put(`${BASE_URL}/stock-transfers/${id}/approve`, {}, getAuthHeaders());
    return response.data;
};

export const dispatchStockTransfer = async (id) => {
    const response = await axios.put(`${BASE_URL}/stock-transfers/${id}/dispatch`, {}, getAuthHeaders());
    return response.data;
};

export const receiveStockTransfer = async (id, data) => {
    const response = await axios.put(`${BASE_URL}/stock-transfers/${id}/receive`, data, getAuthHeaders());
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════
// RECALLS
// ═══════════════════════════════════════════════════════════════════

export const getRecalls = async (params = {}) => {
    const response = await axios.get(`${BASE_URL}/recalls`, { ...getAuthHeaders(), params });
    return response.data;
};

export const createRecall = async (data) => {
    const response = await axios.post(`${BASE_URL}/recalls`, data, getAuthHeaders());
    return response.data;
};

export const updateRecallProgress = async (id, data) => {
    const response = await axios.put(`${BASE_URL}/recalls/${id}/progress`, data, getAuthHeaders());
    return response.data;
};

export default {
    // Dashboard
    getDashboard,
    // Items
    getItems,
    getItem,
    createItem,
    updateItem,
    deactivateItem,
    getItemAuditLog,
    // Categories
    getCategories,
    createCategory,
    updateCategory,
    // Locations
    getLocations,
    createLocation,
    updateLocation,
    // Vendors
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    // Purchase Requisitions
    getPurchaseRequisitions,
    createPurchaseRequisition,
    approvePurchaseRequisition,
    rejectPurchaseRequisition,
    // Purchase Orders
    getPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    approvePurchaseOrder,
    cancelPurchaseOrder,
    // GRN
    getGRNs,
    createGRN,
    // Stock Monitoring
    getStockLevels,
    getLowStockItems,
    getNearExpiryItems,
    getExpiredItems,
    getSlowMovingItems,
    getDeadStock,
    getStockMovementHistory,
    blockStock,
    unblockStock,
    // Stock Issue
    getStockIssues,
    createStockIssue,
    approveStockIssue,
    processStockIssue,
    // Stock Return
    getStockReturns,
    createStockReturn,
    processStockReturn,
    // Stock Transfer
    getStockTransfers,
    createStockTransfer,
    approveStockTransfer,
    dispatchStockTransfer,
    receiveStockTransfer,
    // Recalls
    getRecalls,
    createRecall,
    updateRecallProgress,
};
