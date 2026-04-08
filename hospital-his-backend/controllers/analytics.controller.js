const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const Billing = require('../models/Billing');
const LabTest = require('../models/LabTest');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get executive dashboard
 * @route   GET /api/analytics/executive-dashboard
 */
exports.getExecutiveDashboard = asyncHandler(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [opdToday, ipdCurrent, revenueToday, revenueMonth] = await Promise.all([
        Appointment.countDocuments({ scheduledDate: { $gte: today } }),
        Admission.countDocuments({ status: 'admitted' }),
        Billing.aggregate([
            { $match: { billDate: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Billing.aggregate([
            { $match: { billDate: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            opdToday,
            ipdCurrent,
            revenueToday: revenueToday[0]?.total || 0,
            revenueMonth: revenueMonth[0]?.total || 0,
        },
    });
});

/**
 * @desc    Get clinical analytics
 * @route   GET /api/analytics/clinical
 */
exports.getClinicalAnalytics = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [opdStats, ipdStats, labStats] = await Promise.all([
        Appointment.aggregate([
            { $match: startDate ? { scheduledDate: dateFilter } : {} },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Admission.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        LabTest.aggregate([
            { $match: startDate ? { createdAt: dateFilter } : {} },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            opd: opdStats,
            ipd: ipdStats,
            lab: labStats,
        },
    });
});

/**
 * @desc    Get financial analytics
 * @route   GET /api/analytics/financial
 */
exports.getFinancialAnalytics = asyncHandler(async (req, res, next) => {
    const { period = 'month' } = req.query;
    const today = new Date();

    let startDate;
    if (period === 'week') {
        startDate = new Date(today.setDate(today.getDate() - 7));
    } else if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1);
    }

    const [revenue, collections, pending] = await Promise.all([
        Billing.aggregate([
            { $match: { billDate: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Billing.aggregate([
            { $match: { billDate: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Billing.aggregate([
            { $match: { paymentStatus: { $in: ['pending', 'partial'] } } },
            { $group: { _id: null, total: { $sum: '$balanceAmount' } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalRevenue: revenue[0]?.total || 0,
            totalCollections: collections[0]?.total || 0,
            pendingAmount: pending[0]?.total || 0,
        },
    });
});

/**
 * @desc    Get operational analytics
 * @route   GET /api/analytics/operational
 */
exports.getOperationalAnalytics = asyncHandler(async (req, res, next) => {
    const [bedOccupancy, avgWaitTime] = await Promise.all([
        // Bed occupancy
        require('../models/Bed').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Average wait time (placeholder)
        Promise.resolve({ avgMinutes: 25 }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            bedOccupancy,
            avgWaitTime: avgWaitTime.avgMinutes,
        },
    });
});

/**
 * @desc    Get available reports
 * @route   GET /api/analytics/reports
 */
exports.getReports = asyncHandler(async (req, res, next) => {
    const reports = [
        { id: 'daily-collection', name: 'Daily Collection Report' },
        { id: 'patient-census', name: 'Patient Census Report' },
        { id: 'department-wise', name: 'Department Wise Revenue' },
        { id: 'outstanding', name: 'Outstanding Report' },
        { id: 'lab-workload', name: 'Lab Workload Report' },
    ];

    res.status(200).json({
        success: true,
        data: reports,
    });
});

/**
 * @desc    Generate custom report
 * @route   POST /api/analytics/custom-report
 */
exports.generateCustomReport = asyncHandler(async (req, res, next) => {
    const { reportType, startDate, endDate, filters } = req.body;

    // TODO: Implement custom report generation
    res.status(200).json({
        success: true,
        message: 'Report generation initiated',
        data: {
            reportId: `RPT${Date.now()}`,
            status: 'processing',
        },
    });
});

/**
 * @desc    Download report
 * @route   GET /api/analytics/reports/:id/download
 */
exports.downloadReport = asyncHandler(async (req, res, next) => {
    // TODO: Implement report download
    res.status(200).json({
        success: true,
        message: 'Report download URL',
        data: {
            url: `/reports/${req.params.id}.pdf`,
        },
    });
});
