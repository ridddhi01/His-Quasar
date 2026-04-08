const ExcelJS = require('exceljs');
const pdfService = require('./pdf.service');

/**
 * Report Service
 * Handles report generation
 */

class ReportService {
    /**
     * Generate daily collection report
     */
    async generateDailyCollectionReport(date) {
        const Billing = require('../models/Billing');
        const Payment = require('../models/Payment');

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const [bills, payments] = await Promise.all([
            Billing.find({ billDate: { $gte: startOfDay, $lte: endOfDay } })
                .populate('patient', 'patientId firstName lastName'),
            Payment.find({ paymentDate: { $gte: startOfDay, $lte: endOfDay } })
                .populate('bill', 'billNumber'),
        ]);

        const summary = {
            date,
            totalBills: bills.length,
            totalBilled: bills.reduce((acc, b) => acc + b.grandTotal, 0),
            totalCollected: payments.reduce((acc, p) => acc + p.amount, 0),
            paymentModeBreakdown: {},
        };

        payments.forEach((p) => {
            summary.paymentModeBreakdown[p.paymentMode] = (summary.paymentModeBreakdown[p.paymentMode] || 0) + p.amount;
        });

        return { bills, payments, summary };
    }

    /**
     * Generate patient census report
     */
    async generatePatientCensusReport() {
        const Admission = require('../models/Admission');
        const Emergency = require('../models/Emergency');
        const Appointment = require('../models/Appointment');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [currentAdmissions, emergencyActive, opdToday] = await Promise.all([
            Admission.countDocuments({ status: 'admitted' }),
            Emergency.countDocuments({
                status: { $nin: ['discharged', 'admitted', 'transferred', 'deceased'] },
            }),
            Appointment.countDocuments({
                scheduledDate: { $gte: today },
                status: { $in: ['scheduled', 'checked-in', 'in-consultation', 'completed'] },
            }),
        ]);

        return {
            date: new Date(),
            ipdCount: currentAdmissions,
            emergencyCount: emergencyActive,
            opdCount: opdToday,
            totalPatients: currentAdmissions + emergencyActive + opdToday,
        };
    }

    /**
     * Generate department-wise revenue report
     */
    async generateDepartmentRevenueReport(startDate, endDate) {
        const Billing = require('../models/Billing');

        const revenue = await Billing.aggregate([
            {
                $match: { billDate: { $gte: startDate, $lte: endDate } },
            },
            {
                $group: {
                    _id: '$department',
                    totalBilled: { $sum: '$grandTotal' },
                    totalCollected: { $sum: '$paidAmount' },
                    billCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'departmentInfo',
                },
            },
            { $unwind: { path: '$departmentInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    departmentName: { $ifNull: ['$departmentInfo.name', 'General'] },
                    totalBilled: 1,
                    totalCollected: 1,
                    billCount: 1,
                    outstanding: { $subtract: ['$totalBilled', '$totalCollected'] },
                },
            },
            { $sort: { totalBilled: -1 } },
        ]);

        return {
            period: { startDate, endDate },
            departments: revenue,
            grandTotal: revenue.reduce((acc, d) => acc + d.totalBilled, 0),
        };
    }

    /**
     * Generate outstanding report
     */
    async generateOutstandingReport() {
        const Billing = require('../models/Billing');

        const outstanding = await Billing.find({
            paymentStatus: { $in: ['pending', 'partial'] },
            balanceAmount: { $gt: 0 },
        })
            .populate('patient', 'patientId firstName lastName phone')
            .sort({ balanceAmount: -1 });

        const totalOutstanding = outstanding.reduce((acc, b) => acc + b.balanceAmount, 0);

        return {
            bills: outstanding,
            totalOutstanding,
            billCount: outstanding.length,
        };
    }

    /**
     * Generate lab workload report
     */
    async generateLabWorkloadReport(startDate, endDate) {
        const LabTest = require('../models/LabTest');

        const workload = await LabTest.aggregate([
            {
                $match: { createdAt: { $gte: startDate, $lte: endDate } },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        status: '$status',
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: '$_id.date',
                    statusBreakdown: {
                        $push: { status: '$_id.status', count: '$count' },
                    },
                    total: { $sum: '$count' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return {
            period: { startDate, endDate },
            dailyWorkload: workload,
        };
    }

    /**
     * Export report to PDF
     */
    async exportToPDF(reportType, data) {
        return pdfService.generateReport(reportType, data);
    }

    /**
     * Export report to Excel
     */
    async exportToExcel(reportType, data) {
        const excelService = require('./excel.service');
        return excelService.generateReport(reportType, data);
    }
}

module.exports = new ReportService();
