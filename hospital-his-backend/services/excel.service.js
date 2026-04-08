const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Excel Service
 * Handles Excel file generation for reports
 */

class ExcelService {
    constructor() {
        this.outputDir = path.join(__dirname, '../../uploads/reports');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Create basic workbook
     */
    createWorkbook() {
        return new ExcelJS.Workbook();
    }

    /**
     * Style header row
     */
    styleHeaderRow(row) {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
        };
        row.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    /**
     * Generate daily collection report Excel
     */
    async generateDailyCollectionExcel(data) {
        const workbook = this.createWorkbook();
        const sheet = workbook.addWorksheet('Daily Collection');

        // Title
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = `Daily Collection Report - ${new Date(data.summary.date).toLocaleDateString()}`;
        sheet.getCell('A1').font = { size: 16, bold: true };

        // Headers
        const headers = ['Bill No', 'Patient ID', 'Patient Name', 'Billed', 'Collected', 'Status'];
        const headerRow = sheet.addRow(headers);
        this.styleHeaderRow(headerRow);

        // Data rows
        data.bills.forEach((bill) => {
            sheet.addRow([
                bill.billNumber,
                bill.patient?.patientId,
                `${bill.patient?.firstName} ${bill.patient?.lastName}`,
                bill.grandTotal,
                bill.paidAmount,
                bill.paymentStatus,
            ]);
        });

        // Summary
        sheet.addRow([]);
        sheet.addRow(['Summary']);
        sheet.addRow(['Total Bills', data.summary.totalBills]);
        sheet.addRow(['Total Billed', data.summary.totalBilled]);
        sheet.addRow(['Total Collected', data.summary.totalCollected]);

        // Auto-fit columns
        sheet.columns.forEach((column) => {
            column.width = 15;
        });

        const filename = `daily_collection_${Date.now()}.xlsx`;
        const filepath = path.join(this.outputDir, filename);
        await workbook.xlsx.writeFile(filepath);

        return filepath;
    }

    /**
     * Generate outstanding report Excel
     */
    async generateOutstandingExcel(data) {
        const workbook = this.createWorkbook();
        const sheet = workbook.addWorksheet('Outstanding');

        const headers = ['Bill No', 'Patient ID', 'Patient Name', 'Phone', 'Total', 'Paid', 'Outstanding'];
        const headerRow = sheet.addRow(headers);
        this.styleHeaderRow(headerRow);

        data.bills.forEach((bill) => {
            sheet.addRow([
                bill.billNumber,
                bill.patient?.patientId,
                `${bill.patient?.firstName} ${bill.patient?.lastName}`,
                bill.patient?.phone,
                bill.grandTotal,
                bill.paidAmount,
                bill.balanceAmount,
            ]);
        });

        sheet.addRow([]);
        sheet.addRow(['', '', '', '', '', 'Total Outstanding:', data.totalOutstanding]);

        sheet.columns.forEach((column) => {
            column.width = 15;
        });

        const filename = `outstanding_${Date.now()}.xlsx`;
        const filepath = path.join(this.outputDir, filename);
        await workbook.xlsx.writeFile(filepath);

        return filepath;
    }

    /**
     * Generate department revenue Excel
     */
    async generateDepartmentRevenueExcel(data) {
        const workbook = this.createWorkbook();
        const sheet = workbook.addWorksheet('Department Revenue');

        sheet.mergeCells('A1:E1');
        sheet.getCell('A1').value = `Department Revenue Report (${new Date(data.period.startDate).toLocaleDateString()} - ${new Date(data.period.endDate).toLocaleDateString()})`;
        sheet.getCell('A1').font = { size: 16, bold: true };

        const headers = ['Department', 'Bills', 'Billed', 'Collected', 'Outstanding'];
        const headerRow = sheet.addRow(headers);
        this.styleHeaderRow(headerRow);

        data.departments.forEach((dept) => {
            sheet.addRow([
                dept.departmentName,
                dept.billCount,
                dept.totalBilled,
                dept.totalCollected,
                dept.outstanding,
            ]);
        });

        sheet.addRow([]);
        sheet.addRow(['Grand Total', '', data.grandTotal, '', '']);

        sheet.columns.forEach((column) => {
            column.width = 18;
        });

        const filename = `dept_revenue_${Date.now()}.xlsx`;
        const filepath = path.join(this.outputDir, filename);
        await workbook.xlsx.writeFile(filepath);

        return filepath;
    }

    /**
     * Generate generic report Excel
     */
    async generateReport(reportType, data) {
        switch (reportType) {
            case 'daily-collection':
                return this.generateDailyCollectionExcel(data);
            case 'outstanding':
                return this.generateOutstandingExcel(data);
            case 'department-wise':
                return this.generateDepartmentRevenueExcel(data);
            default:
                return this.generateGenericExcel(reportType, data);
        }
    }

    /**
     * Generate generic Excel
     */
    async generateGenericExcel(title, data) {
        const workbook = this.createWorkbook();
        const sheet = workbook.addWorksheet(title);

        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            const headerRow = sheet.addRow(headers);
            this.styleHeaderRow(headerRow);

            data.forEach((row) => {
                sheet.addRow(Object.values(row));
            });
        }

        sheet.columns.forEach((column) => {
            column.width = 15;
        });

        const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
        const filepath = path.join(this.outputDir, filename);
        await workbook.xlsx.writeFile(filepath);

        return filepath;
    }
}

module.exports = new ExcelService();
