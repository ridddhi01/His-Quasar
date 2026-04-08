/**
 * Admin Dashboard Controller
 * Provides governance-focused metrics for Admin
 * 
 * Design Principle: Patterns, not Patients
 * - All data is aggregated and anonymized
 * - Focus on operational efficiency
 * - No patient-identifiable information
 */

const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const adminDashboardService = require('../services/adminDashboard.service');

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get full admin dashboard
 * @route   GET /api/admin/dashboard
 * @access  Admin only
 * @refresh Real-time (on request)
 */
exports.getFullDashboard = asyncHandler(async (req, res, next) => {
    const dashboard = await adminDashboardService.getFullDashboard();

    res.status(200).json({
        success: true,
        data: dashboard,
        meta: {
            refreshStrategy: 'real-time',
            cacheTTL: 60, // Suggested client cache: 1 minute
            sections: [
                'revenue',
                'bedOccupancy',
                'erMetrics',
                'incidents',
                'compliance',
                'users',
                'system',
            ],
        },
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL SECTIONS (For targeted refresh)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get revenue leakage metrics
 * @route   GET /api/admin/dashboard/revenue
 * @access  Admin only
 * @refresh Polling recommended: 5 minutes
 */
exports.getRevenueMetrics = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getRevenueMetrics();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'polling',
            recommendedInterval: 300, // 5 minutes
        },
    });
});

/**
 * @desc    Get bed occupancy overview
 * @route   GET /api/admin/dashboard/beds
 * @access  Admin only
 * @refresh Real-time recommended for critical wards
 */
exports.getBedOccupancy = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getBedOccupancy();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'websocket', // For real-time updates
            fallbackInterval: 60, // 1 minute polling fallback
        },
    });
});

/**
 * @desc    Get ER congestion indicators
 * @route   GET /api/admin/dashboard/er
 * @access  Admin only
 * @refresh Real-time via WebSocket
 */
exports.getERMetrics = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getERMetrics();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'websocket',
            fallbackInterval: 30, // 30 seconds for ER
            critical: data.congestionLevel !== 'normal',
        },
    });
});

/**
 * @desc    Get incident and near-miss counts
 * @route   GET /api/admin/dashboard/incidents
 * @access  Admin only
 * @refresh Polling: 15 minutes
 */
exports.getIncidentMetrics = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getIncidentMetrics();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'polling',
            recommendedInterval: 900, // 15 minutes
        },
    });
});

/**
 * @desc    Get compliance status
 * @route   GET /api/admin/dashboard/compliance
 * @access  Admin only
 * @refresh Polling: 30 minutes (less volatile)
 */
exports.getComplianceStatus = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getComplianceStatus();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'polling',
            recommendedInterval: 1800, // 30 minutes
        },
    });
});

/**
 * @desc    Get user activity metrics
 * @route   GET /api/admin/dashboard/users
 * @access  Admin only
 * @refresh Polling: 5 minutes
 */
exports.getUserMetrics = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getUserMetrics();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'polling',
            recommendedInterval: 300, // 5 minutes
        },
    });
});

/**
 * @desc    Get system health status
 * @route   GET /api/admin/dashboard/system
 * @access  Admin only
 * @refresh Polling: 1 minute
 */
exports.getSystemHealth = asyncHandler(async (req, res, next) => {
    const data = await adminDashboardService.getSystemHealth();

    res.status(200).json({
        success: true,
        data,
        meta: {
            refreshStrategy: 'polling',
            recommendedInterval: 60, // 1 minute
        },
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all active alerts (aggregated from all sections)
 * @route   GET /api/admin/dashboard/alerts
 * @access  Admin only
 * @refresh Real-time via WebSocket
 */
exports.getAlerts = asyncHandler(async (req, res, next) => {
    const dashboard = await adminDashboardService.getFullDashboard();

    res.status(200).json({
        success: true,
        count: dashboard.alerts.length,
        data: dashboard.alerts,
        meta: {
            refreshStrategy: 'websocket',
            fallbackInterval: 30,
        },
    });
});

/**
 * @desc    Acknowledge an alert (mark as reviewed)
 * @route   POST /api/admin/dashboard/alerts/:alertType/acknowledge
 * @access  Admin only
 */
exports.acknowledgeAlert = asyncHandler(async (req, res, next) => {
    const { alertType } = req.params;
    const { notes } = req.body;

    // Log acknowledgment (would store in a dedicated alerts collection in production)
    const { createAuditLog } = require('../services/audit.service');
    await createAuditLog({
        user: req.user._id,
        action: 'ALERT_ACKNOWLEDGE',
        entity: 'Dashboard',
        description: `Acknowledged alert: ${alertType}`,
        changes: { notes },
    });

    res.status(200).json({
        success: true,
        message: 'Alert acknowledged',
        data: {
            alertType,
            acknowledgedBy: req.user._id,
            acknowledgedAt: new Date(),
        },
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// KPI SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get KPI summary cards data
 * @route   GET /api/admin/dashboard/kpis
 * @access  Admin only
 */
exports.getKPISummary = asyncHandler(async (req, res, next) => {
    const [revenue, beds, er, compliance, users] = await Promise.all([
        adminDashboardService.getRevenueMetrics(),
        adminDashboardService.getBedOccupancy(),
        adminDashboardService.getERMetrics(),
        adminDashboardService.getComplianceStatus(),
        adminDashboardService.getUserMetrics(),
    ]);

    const kpis = [
        {
            id: 'revenue',
            label: 'Monthly Revenue',
            value: revenue.currentMonthRevenue,
            format: 'currency',
            trend: revenue.revenueGrowth > 0 ? 'up' : revenue.revenueGrowth < 0 ? 'down' : 'stable',
            trendValue: `${revenue.revenueGrowth}%`,
            status: revenue.revenueGrowth >= 0 ? 'good' : 'warning',
        },
        {
            id: 'bedOccupancy',
            label: 'Bed Occupancy',
            value: beds.summary.overallOccupancyRate,
            format: 'percent',
            trend: 'stable',
            status: beds.summary.overallOccupancyRate < 85 ? 'good' : beds.summary.overallOccupancyRate < 95 ? 'warning' : 'critical',
        },
        {
            id: 'erWait',
            label: 'ER Wait Time',
            value: er.averageWaitTimeMinutes,
            format: 'minutes',
            trend: 'stable',
            status: er.averageWaitTimeMinutes < 30 ? 'good' : er.averageWaitTimeMinutes < 60 ? 'warning' : 'critical',
        },
        {
            id: 'compliance',
            label: 'Compliance Score',
            value: compliance.overallScore,
            format: 'score',
            trend: 'stable',
            status: compliance.status,
        },
        {
            id: 'pendingCollection',
            label: 'Pending Collection',
            value: revenue.pendingCollection,
            format: 'currency',
            trend: 'stable',
            status: revenue.pendingBillCount > 100 ? 'warning' : 'good',
            subtitle: `${revenue.pendingBillCount} bills`,
        },
        {
            id: 'activeUsers',
            label: 'Active Users (24h)',
            value: users.summary.loggedInLast24h,
            format: 'number',
            trend: 'stable',
            status: 'info',
            subtitle: `of ${users.summary.active} total`,
        },
    ];

    res.status(200).json({
        success: true,
        data: kpis,
        lastUpdated: new Date(),
    });
});

module.exports = exports;
