const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Service
 * Handles PDF generation for reports and documents
 */

class PDFService {
    constructor() {
        this.outputDir = path.join(__dirname, '../../uploads/reports');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Create basic PDF document
     */
    createDocument(options = {}) {
        return new PDFDocument({
            size: options.size || 'A4',
            margin: options.margin || 50,
            info: {
                Title: options.title || 'Hospital Report',
                Author: 'Hospital HIS',
            },
        });
    }

    /**
     * Add header to PDF
     */
    addHeader(doc, title, subtitle = '') {
        doc.fontSize(20).text(title, { align: 'center' });
        if (subtitle) {
            doc.fontSize(12).text(subtitle, { align: 'center' });
        }
        doc.moveDown(2);
        return doc;
    }

    /**
     * Add table to PDF
     */
    addTable(doc, headers, rows, options = {}) {
        const startX = options.startX || 50;
        const startY = doc.y;
        const columnWidth = options.columnWidth || (doc.page.width - 100) / headers.length;
        const rowHeight = options.rowHeight || 25;

        // Draw headers
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((header, i) => {
            doc.text(header, startX + i * columnWidth, startY, {
                width: columnWidth,
                align: 'left',
            });
        });

        doc.moveDown();
        doc.font('Helvetica');

        // Draw rows
        rows.forEach((row, rowIndex) => {
            const y = startY + (rowIndex + 1) * rowHeight;
            row.forEach((cell, i) => {
                doc.text(String(cell), startX + i * columnWidth, y, {
                    width: columnWidth,
                    align: 'left',
                });
            });
        });

        doc.y = startY + (rows.length + 1) * rowHeight + 20;
    }

    /**
     * Generate bill PDF
     */
    async generateBillPDF(bill) {
        const filename = `bill_${bill.billNumber}.pdf`;
        const filepath = path.join(this.outputDir, filename);

        return new Promise((resolve, reject) => {
            const doc = this.createDocument({ title: `Bill - ${bill.billNumber}` });
            const stream = fs.createWriteStream(filepath);

            doc.pipe(stream);

            // Header
            this.addHeader(doc, 'HOSPITAL BILL', `Bill No: ${bill.billNumber}`);

            // Patient info
            doc.fontSize(12).text(`Patient: ${bill.patient?.firstName} ${bill.patient?.lastName}`);
            doc.text(`Patient ID: ${bill.patient?.patientId}`);
            doc.text(`Bill Date: ${new Date(bill.billDate).toLocaleDateString()}`);
            doc.moveDown();

            // Items table
            const headers = ['Item', 'Qty', 'Rate', 'Amount'];
            const rows = bill.items.map((item) => [
                item.description,
                item.quantity,
                `₹${item.rate.toFixed(2)}`,
                `₹${item.amount.toFixed(2)}`,
            ]);

            this.addTable(doc, headers, rows);

            // Totals
            doc.moveDown();
            doc.text(`Subtotal: ₹${bill.subtotal.toFixed(2)}`, { align: 'right' });
            doc.text(`Discount: ₹${bill.totalDiscount.toFixed(2)}`, { align: 'right' });
            doc.text(`Tax: ₹${bill.totalTax.toFixed(2)}`, { align: 'right' });
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text(`Grand Total: ₹${bill.grandTotal.toFixed(2)}`, { align: 'right' });

            doc.end();

            stream.on('finish', () => resolve(filepath));
            stream.on('error', reject);
        });
    }

    /**
     * Generate lab report PDF
     */
    async generateLabReportPDF(labTest) {
        const filename = `lab_${labTest.testNumber}.pdf`;
        const filepath = path.join(this.outputDir, filename);

        return new Promise((resolve, reject) => {
            const doc = this.createDocument({ title: `Lab Report - ${labTest.testNumber}` });
            const stream = fs.createWriteStream(filepath);

            doc.pipe(stream);

            this.addHeader(doc, 'LAB TEST REPORT', `Test No: ${labTest.testNumber}`);

            // Patient info
            doc.fontSize(12);
            doc.text(`Patient: ${labTest.patient?.firstName} ${labTest.patient?.lastName}`);
            doc.text(`Test: ${labTest.test?.testName}`);
            doc.text(`Date: ${new Date(labTest.createdAt).toLocaleDateString()}`);
            doc.moveDown();

            // Results
            if (labTest.results && labTest.results.length > 0) {
                const headers = ['Parameter', 'Result', 'Unit', 'Normal Range'];
                const rows = labTest.results.map((r) => [
                    r.parameterName,
                    r.value,
                    r.unit || '-',
                    r.normalRange || '-',
                ]);
                this.addTable(doc, headers, rows);
            }

            if (labTest.remarks) {
                doc.moveDown();
                doc.text(`Remarks: ${labTest.remarks}`);
            }

            doc.end();

            stream.on('finish', () => resolve(filepath));
            stream.on('error', reject);
        });
    }

    /**
     * Generate general report PDF
     */
    async generateReport(reportType, data) {
        const filename = `report_${reportType}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);

        return new Promise((resolve, reject) => {
            const doc = this.createDocument({ title: `${reportType} Report` });
            const stream = fs.createWriteStream(filepath);

            doc.pipe(stream);

            this.addHeader(doc, reportType.toUpperCase() + ' REPORT', new Date().toLocaleDateString());

            // Add summary if present
            if (data.summary) {
                doc.fontSize(14).text('Summary', { underline: true });
                doc.fontSize(12);
                Object.entries(data.summary).forEach(([key, value]) => {
                    doc.text(`${key}: ${value}`);
                });
                doc.moveDown();
            }

            doc.end();

            stream.on('finish', () => resolve(filepath));
            stream.on('error', reject);
        });
    }
}

module.exports = new PDFService();
