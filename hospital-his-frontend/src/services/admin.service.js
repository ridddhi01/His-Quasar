/**
 * Admin Service
 * API calls for Admin dashboard and management
 * 
 * Design Principle: Clear separation from clinical APIs
 * All APIs under /admin/ prefix
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Create axios instance with auth headers
const api = axios.create({
    baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export const getDashboard = async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
};

export const getDashboardKPIs = async () => {
    const response = await api.get('/admin/dashboard/kpis');
    return response.data;
};

export const getRevenueMetrics = async () => {
    const response = await api.get('/admin/dashboard/revenue');
    return response.data;
};

export const getBedOccupancy = async () => {
    const response = await api.get('/admin/dashboard/beds');
    return response.data;
};

export const getERMetrics = async () => {
    const response = await api.get('/admin/dashboard/er');
    return response.data;
};

export const getIncidentMetrics = async () => {
    const response = await api.get('/admin/dashboard/incidents');
    return response.data;
};

export const getComplianceStatus = async () => {
    const response = await api.get('/admin/dashboard/compliance');
    return response.data;
};

export const getUserMetrics = async () => {
    const response = await api.get('/admin/dashboard/users');
    return response.data;
};

export const getSystemHealth = async () => {
    const response = await api.get('/admin/dashboard/system');
    return response.data;
};

export const getAlerts = async () => {
    const response = await api.get('/admin/dashboard/alerts');
    return response.data;
};

export const acknowledgeAlert = async (alertType, notes) => {
    const response = await api.post(`/admin/dashboard/alerts/${alertType}/acknowledge`, { notes });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const getUsers = async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
};

export const getUserById = async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
};

export const createUser = async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
};

export const updateUser = async (userId, userData) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
};

export const changeUserRole = async (userId, newRole, reason) => {
    const response = await api.put(`/admin/users/${userId}/role`, { newRole, reason });
    return response.data;
};

export const getUserRoleHistory = async (userId) => {
    const response = await api.get(`/admin/users/${userId}/role-history`);
    return response.data;
};

export const assignDepartment = async (userId, departmentId) => {
    const response = await api.put(`/admin/users/${userId}/department`, { departmentId });
    return response.data;
};

export const deactivateUser = async (userId, reason) => {
    const response = await api.post(`/admin/users/${userId}/deactivate`, { reason });
    return response.data;
};

export const reactivateUser = async (userId) => {
    const response = await api.post(`/admin/users/${userId}/reactivate`);
    return response.data;
};

export const suspendUser = async (userId, reason, durationDays) => {
    const response = await api.post(`/admin/users/${userId}/suspend`, { reason, durationDays });
    return response.data;
};

export const unlockUser = async (userId) => {
    const response = await api.post(`/admin/users/${userId}/unlock`);
    return response.data;
};

export const resetPassword = async (userId) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
};

export const forcePasswordChange = async (userId) => {
    const response = await api.post(`/admin/users/${userId}/force-password-change`);
    return response.data;
};

export const terminateSessions = async (userId) => {
    const response = await api.post(`/admin/users/${userId}/terminate-sessions`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK-GLASS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const getBreakGlassPending = async () => {
    const response = await api.get('/admin/break-glass/pending');
    return response.data;
};

export const getBreakGlassActive = async () => {
    const response = await api.get('/admin/break-glass/active');
    return response.data;
};

export const getBreakGlassPendingReview = async () => {
    const response = await api.get('/admin/break-glass/pending-review');
    return response.data;
};

export const getBreakGlassFlagged = async () => {
    const response = await api.get('/admin/break-glass/flagged');
    return response.data;
};

export const getBreakGlassStatistics = async (dateFrom, dateTo) => {
    const response = await api.get('/admin/break-glass/statistics', { params: { dateFrom, dateTo } });
    return response.data;
};

export const getBreakGlassLog = async (logId) => {
    const response = await api.get(`/admin/break-glass/${logId}`);
    return response.data;
};

export const approveBreakGlass = async (logId, notes) => {
    const response = await api.post(`/admin/break-glass/${logId}/approve`, { notes });
    return response.data;
};

export const rejectBreakGlass = async (logId, reason) => {
    const response = await api.post(`/admin/break-glass/${logId}/reject`, { reason });
    return response.data;
};

export const revokeBreakGlass = async (logId, reason) => {
    const response = await api.post(`/admin/break-glass/${logId}/revoke`, { reason });
    return response.data;
};

export const grantBreakGlass = async (userId, accessLevel, reason, emergencyType, durationHours) => {
    const response = await api.post('/admin/break-glass/grant', {
        userId, accessLevel, reason, emergencyType, durationHours
    });
    return response.data;
};

export const reviewBreakGlass = async (logId, outcome, notes, followUpRequired, followUpActions) => {
    const response = await api.post(`/admin/break-glass/${logId}/review`, {
        outcome, notes, followUpRequired, followUpActions
    });
    return response.data;
};

export const flagBreakGlass = async (logId, reason) => {
    const response = await api.post(`/admin/break-glass/${logId}/flag`, { reason });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ANOMALIES
// ═══════════════════════════════════════════════════════════════════════════════

export const runRevenueAnomalyScan = async () => {
    const response = await api.post('/admin/revenue-anomalies/scan');
    return response.data;
};

export const getRevenueAnomalies = async (params = {}) => {
    const response = await api.get('/admin/revenue-anomalies', { params });
    return response.data;
};

export const getAnomalySummary = async () => {
    const response = await api.get('/admin/revenue-anomalies/summary');
    return response.data;
};

export const getAnomalyById = async (anomalyId) => {
    const response = await api.get(`/admin/revenue-anomalies/${anomalyId}`);
    return response.data;
};

export const getAnomalyInvestigation = async (anomalyId) => {
    const response = await api.get(`/admin/revenue-anomalies/${anomalyId}/investigate`);
    return response.data;
};

export const startAnomalyReview = async (anomalyId) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/review`);
    return response.data;
};

export const assignAnomaly = async (anomalyId, assigneeId, notes) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/assign`, { assigneeId, notes });
    return response.data;
};

export const markAnomalyFalsePositive = async (anomalyId, reason, justification) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/false-positive`, { reason, justification });
    return response.data;
};

export const sendAnomalyForAction = async (anomalyId, notes) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/send-for-action`, { notes });
    return response.data;
};

export const escalateAnomaly = async (anomalyId, reason) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/escalate`, { reason });
    return response.data;
};

export const resolveAnomaly = async (anomalyId, type, notes, amountRecovered) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/resolve`, { type, notes, amountRecovered });
    return response.data;
};

export const closeAnomaly = async (anomalyId, notes) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/close`, { notes });
    return response.data;
};

export const addAnomalyComment = async (anomalyId, text, isInternal = true) => {
    const response = await api.post(`/admin/revenue-anomalies/${anomalyId}/comments`, { text, isInternal });
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const getDepartments = async () => {
    const response = await api.get('/admin/master/departments');
    return response.data;
};

export const createDepartment = async (data) => {
    const response = await api.post('/admin/master/departments', data);
    return response.data;
};

export const updateDepartment = async (id, data) => {
    const response = await api.put(`/admin/master/departments/${id}`, data);
    return response.data;
};

export const getWards = async () => {
    const response = await api.get('/admin/master/wards');
    return response.data;
};

export const getBeds = async () => {
    const response = await api.get('/admin/master/beds');
    return response.data;
};

export const getTariffs = async () => {
    const response = await api.get('/admin/master/tariffs');
    return response.data;
};

export const getOrderSets = async () => {
    const response = await api.get('/admin/master/order-sets');
    return response.data;
};

export const getCriticalValues = async () => {
    const response = await api.get('/admin/master/critical-values');
    return response.data;
};

export const getDrugInteractions = async () => {
    const response = await api.get('/admin/master/drug-interactions');
    return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════════

export const getAuditLogs = async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
};

export const getComplianceReports = async () => {
    const response = await api.get('/admin/compliance-reports');
    return response.data;
};

export default {
    // Dashboard
    getDashboard,
    getDashboardKPIs,
    getRevenueMetrics,
    getBedOccupancy,
    getERMetrics,
    getIncidentMetrics,
    getComplianceStatus,
    getUserMetrics,
    getSystemHealth,
    getAlerts,
    acknowledgeAlert,
    // Users
    getUsers,
    getUserById,
    createUser,
    updateUser,
    changeUserRole,
    getUserRoleHistory,
    assignDepartment,
    deactivateUser,
    reactivateUser,
    suspendUser,
    unlockUser,
    resetPassword,
    forcePasswordChange,
    terminateSessions,
    // Break-Glass
    getBreakGlassPending,
    getBreakGlassActive,
    getBreakGlassPendingReview,
    getBreakGlassFlagged,
    getBreakGlassStatistics,
    getBreakGlassLog,
    approveBreakGlass,
    rejectBreakGlass,
    revokeBreakGlass,
    grantBreakGlass,
    reviewBreakGlass,
    flagBreakGlass,
    // Revenue Anomalies
    runRevenueAnomalyScan,
    getRevenueAnomalies,
    getAnomalySummary,
    getAnomalyById,
    getAnomalyInvestigation,
    startAnomalyReview,
    assignAnomaly,
    markAnomalyFalsePositive,
    sendAnomalyForAction,
    escalateAnomaly,
    resolveAnomaly,
    closeAnomaly,
    addAnomalyComment,
    // Master Data
    getDepartments,
    createDepartment,
    updateDepartment,
    getWards,
    getBeds,
    getTariffs,
    getOrderSets,
    getCriticalValues,
    getDrugInteractions,
    // Audit
    getAuditLogs,
    getComplianceReports,
};
