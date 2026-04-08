const Billing = require('../models/Billing');
const BillingItem = require('../models/BillingItem');
const Tariff = require('../models/Tariff');
const { PAYMENT_STATUS, CLINICAL_CODING_STATUS } = require('../config/constants');

/**
 * Billing Service
 * Handles billing calculations and invoice generation
 */

class BillingService {
    /**
     * Generate bill number
     */
    async generateBillNumber() {
        const today = new Date();
        const prefix = `BIL${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

        const lastBill = await Billing.findOne({ billNumber: { $regex: `^${prefix}` } })
            .sort({ createdAt: -1 });

        const sequence = lastBill
            ? parseInt(lastBill.billNumber.slice(-6), 10) + 1
            : 1;

        return `${prefix}${String(sequence).padStart(6, '0')}`;
    }

    /**
     * Calculate bill totals
     */
    calculateTotals(items) {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach((item) => {
            const itemAmount = item.quantity * item.rate;
            const discount = item.discountAmount || (itemAmount * (item.discountPercent || 0)) / 100;
            const taxableAmount = itemAmount - discount;
            const tax = (taxableAmount * (item.taxPercent || 0)) / 100;

            subtotal += itemAmount;
            totalDiscount += discount;
            totalTax += tax;
        });

        const grandTotal = subtotal - totalDiscount + totalTax;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100,
        };
    }

    /**
     * Generate bill for patient
     */
    async generateBill(billData) {
        const billNumber = await this.generateBillNumber();
        const { items, ...rest } = billData;

        // Calculate totals
        const totals = this.calculateTotals(items);

        const bill = await Billing.create({
            ...rest,
            billNumber,
            items,
            ...totals,
            paidAmount: 0,
            balanceAmount: totals.grandTotal,
            paymentStatus: PAYMENT_STATUS.PENDING,
        });

        return bill;
    }

    /**
     * Add items to existing bill
     */
    async addItemsToBill(billId, newItems) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        bill.items.push(...newItems);
        const totals = this.calculateTotals(bill.items);

        Object.assign(bill, totals);
        bill.balanceAmount = totals.grandTotal - bill.paidAmount;
        bill.paymentStatus = this.getPaymentStatus(bill.paidAmount, totals.grandTotal);

        return bill.save();
    }

    /**
     * Update bill with validation
     */
    async updateBill(billId, updateData, user) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        // Check if bill is locked
        if (bill.isLocked) {
            // Only admins can edit finalized bills
            if (!user || user.role !== 'admin') {
                throw new Error('Cannot update a finalized bill. Admin access required.');
            }

            // Flag this as a post-finalization edit in audit trail
            bill.auditTrail.push({
                action: 'post_finalization_edit',
                performedBy: user._id || user.id,
                performedAt: new Date(),
                details: {
                    changes: Object.keys(updateData).join(', '),
                    note: 'Admin override on finalized bill'
                }
            });
        }

        // Handle Item Updates
        if (updateData.items) {
            const existingItemsMap = new Map(bill.items.map(i => [i._id.toString(), i]));

            for (const newItem of updateData.items) {
                // If existing item is being updated
                if (newItem._id && existingItemsMap.has(newItem._id)) {
                    const existing = existingItemsMap.get(newItem._id);

                    // Prevent editing system-generated items' financials
                    if (existing.isSystemGenerated) {
                        const rateChanged = Math.abs(Number(existing.rate) - Number(newItem.rate)) > 0.01;
                        // const amountChanged = Math.abs(Number(existing.amount) - Number(newItem.amount)) > 0.01; 
                        // Amount is calculated from rate*qty, so checking rate is key. 
                        // Use original description just in case

                        if (rateChanged) {
                            throw new Error(`Cannot manually edit rate of system-generated item: ${existing.description}`);
                        }
                    }
                }
            }

            bill.items = updateData.items;
            const totals = this.calculateTotals(bill.items);
            Object.assign(bill, totals);
            bill.balanceAmount = totals.grandTotal - bill.paidAmount;
        }

        // Handle other fields generically if needed, or specific fields
        if (updateData.paymentResponsibility) {
            bill.paymentResponsibility = updateData.paymentResponsibility;
        }

        await bill.save();
        return bill;
    }

    /**
     * Get payment status based on amounts
     */
    getPaymentStatus(paidAmount, grandTotal) {
        if (paidAmount >= grandTotal) return PAYMENT_STATUS.PAID;
        if (paidAmount > 0) return PAYMENT_STATUS.PARTIAL;
        return PAYMENT_STATUS.PENDING;
    }

    /**
     * Apply discount to bill
     */
    async applyDiscount(billId, discountPercent, discountReason) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        const additionalDiscount = (bill.subtotal * discountPercent) / 100;
        bill.totalDiscount += additionalDiscount;
        bill.grandTotal = bill.subtotal - bill.totalDiscount + bill.totalTax;
        bill.balanceAmount = bill.grandTotal - bill.paidAmount;
        bill.discountReason = discountReason;

        return bill.save();
    }

    /**
     * Get tariff for service
     */
    async getServiceTariff(tariffCode) {
        return Tariff.findOne({ tariffCode, isActive: true });
    }

    /**
     * Get outstanding bills for patient
     */
    async getPatientOutstanding(patientId) {
        const bills = await Billing.find({
            patient: patientId,
            paymentStatus: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIAL] },
        });

        const totalOutstanding = bills.reduce((acc, bill) => acc + bill.balanceAmount, 0);

        return { bills, totalOutstanding };
    }

    /**
     * Get billing summary for date range
     */
    async getBillingSummary(startDate, endDate) {
        const summary = await Billing.aggregate([
            {
                $match: {
                    billDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$grandTotal' },
                    totalCollected: { $sum: '$paidAmount' },
                    totalOutstanding: { $sum: '$balanceAmount' },
                    billCount: { $sum: 1 },
                },
            },
        ]);

        return summary[0] || { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, billCount: 0 };
    }

    /**
     * Add auto-generated charge to a bill
     */
    async addAutoCharge(billId, chargeData) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');
        if (bill.isLocked) throw new Error('Cannot modify a locked bill');

        const autoChargeItem = {
            itemType: chargeData.itemType,
            itemReference: chargeData.itemReference,
            description: chargeData.description,
            quantity: chargeData.quantity || 1,
            rate: chargeData.rate,
            amount: (chargeData.quantity || 1) * chargeData.rate,
            netAmount: (chargeData.quantity || 1) * chargeData.rate,
            isSystemGenerated: true,
            billedAt: new Date(),
        };

        bill.items.push(autoChargeItem);
        await bill.save();
        return bill;
    }

    /**
     * Generate bed charges for admission
     */
    async generateBedCharges(admissionId) {
        const Admission = require('../models/Admission');
        const admission = await Admission.findById(admissionId).populate('bed');
        if (!admission || !admission.bed) throw new Error('Admission or bed not found');

        const bill = await Billing.findOne({ visit: admissionId, visitModel: 'Admission', status: 'draft' });
        if (!bill) throw new Error('Bill not found for this admission');

        // Calculate duration
        const admissionDate = new Date(admission.admissionDate);
        const today = new Date();
        const daysStayed = Math.ceil((today - admissionDate) / (1000 * 60 * 60 * 24));

        // Get bed rate
        let bedRate = 500; // Default
        const tariff = await Tariff.findOne({ serviceType: 'bed', category: admission.bed.type, isActive: true });
        if (tariff) bedRate = tariff.rate;

        return this.addAutoCharge(bill._id, {
            itemType: 'bed',
            itemReference: admission.bed._id,
            description: `Bed Charges - ${admission.bed.bedNumber} (${admission.bed.type}) - ${daysStayed} day(s)`,
            quantity: daysStayed,
            rate: bedRate,
        });
    }

    /**
     * Generate OT charges for surgery
     */
    async generateOTCharges(surgeryId) {
        const Surgery = require('../models/Surgery');
        const surgery = await Surgery.findById(surgeryId);
        if (!surgery) throw new Error('Surgery not found');

        const bill = await Billing.findOne({ patient: surgery.patient, status: 'draft' }).sort({ createdAt: -1 });
        if (!bill) throw new Error('Active bill not found');

        // OT room charges
        const otRoomTariff = await Tariff.findOne({ serviceType: 'surgery', category: 'ot_room', isActive: true });
        if (otRoomTariff) {
            await this.addAutoCharge(bill._id, {
                itemType: 'surgery',
                itemReference: surgery._id,
                description: `OT Room Charges - ${surgery.surgeryType}`,
                quantity: 1,
                rate: otRoomTariff.rate,
            });
        }

        // Surgeon fees
        const surgeonTariff = await Tariff.findOne({ serviceType: 'surgery', category: surgery.surgeryType, isActive: true });
        if (surgeonTariff) {
            await this.addAutoCharge(bill._id, {
                itemType: 'surgery',
                itemReference: surgery._id,
                description: `Surgeon Fee - ${surgery.surgeryType}`,
                quantity: 1,
                rate: surgeonTariff.rate,
            });
        }

        return bill;
    }

    /**
     * Generate lab charges
     */
    async generateLabCharges(labTestId) {
        const LabTest = require('../models/LabTest');
        const labTest = await LabTest.findById(labTestId).populate('testMaster');
        if (!labTest) throw new Error('Lab test not found');

        const bill = await Billing.findOne({ patient: labTest.patient, status: 'draft' }).sort({ createdAt: -1 });
        if (!bill) throw new Error('Active bill not found');

        return this.addAutoCharge(bill._id, {
            itemType: 'lab',
            itemReference: labTest._id,
            description: `Lab Test - ${labTest.testMaster?.testName || labTest.testName}`,
            quantity: 1,
            rate: labTest.testMaster?.price || labTest.price || 0,
        });
    }

    /**
     * Generate pharmacy charges
     */
    async generatePharmacyCharges(dispenseId) {
        const PharmacyDispense = require('../models/PharmacyDispense');
        const dispense = await PharmacyDispense.findById(dispenseId).populate('medicine');
        if (!dispense) throw new Error('Dispense record not found');

        const bill = await Billing.findOne({ patient: dispense.patient, status: 'draft' }).sort({ createdAt: -1 });
        if (!bill) throw new Error('Active bill not found');

        return this.addAutoCharge(bill._id, {
            itemType: 'medicine',
            itemReference: dispense._id,
            description: `Medicine - ${dispense.medicine?.name || dispense.medicineName}`,
            quantity: dispense.quantity,
            rate: dispense.rate || dispense.medicine?.sellingPrice || 0,
        });
    }

    /**
     * Request discount on a bill
     */
    async requestDiscount(billId, discountAmount, reason, requestedBy) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');
        if (bill.isLocked) throw new Error('Cannot request discount on locked bill');
        if (bill.status !== 'draft') throw new Error('Discount can only be requested on draft bills');

        bill.discountRequest = {
            amount: discountAmount,
            reason,
            requestedBy,
            requestedAt: new Date(),
            status: 'pending',
        };

        bill.auditTrail.push({
            action: 'discount_requested',
            performedBy: requestedBy,
            performedAt: new Date(),
            details: { amount: discountAmount, reason },
        });

        await bill.save();
        return bill;
    }

    /**
     * Approve or reject discount
     */
    async approveDiscount(billId, approverId, isApproved, rejectionReason = null) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');
        if (bill.discountRequest.status !== 'pending') throw new Error('No pending discount request');

        if (isApproved) {
            bill.discountRequest.status = 'approved';
            bill.discountApprovedBy = approverId;
            bill.discountApprovalDate = new Date();
            bill.totalDiscount = (bill.totalDiscount || 0) + bill.discountRequest.amount;

            bill.auditTrail.push({
                action: 'discount_approved',
                performedBy: approverId,
                performedAt: new Date(),
                details: { amount: bill.discountRequest.amount },
            });
        } else {
            bill.discountRequest.status = 'rejected';
            bill.discountRejectionReason = rejectionReason;

            bill.auditTrail.push({
                action: 'discount_rejected',
                performedBy: approverId,
                performedAt: new Date(),
                details: { reason: rejectionReason },
            });
        }

        await bill.save();
        return bill;
    }

    /**
     * Finalize bill (lock it)
     */
    /**
     * Finalize bill (lock it)
     */
    async finalizeBill(billId, userId) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');
        if (bill.isLocked) throw new Error('Bill is already finalized');

        // Check for Clinical Coding Status
        if (bill.visit) {
            const ClinicalCodingRecord = require('../models/ClinicalCodingRecord');
            const codingRecord = await ClinicalCodingRecord.findOne({
                encounter: bill.visit
            });

            if (codingRecord && codingRecord.status !== CLINICAL_CODING_STATUS.APPROVED) {
                // Formatting the status for better readability in error message
                const statusLabel = codingRecord.status.replace(/-/g, ' ').toUpperCase();
                throw new Error(`Cannot finalize bill: Clinical coding is ${statusLabel}. It must be APPROVED.`);
            }
        }

        bill.status = 'finalized';
        bill.isLocked = true;
        bill.lockedAt = new Date();
        bill.lockedBy = userId;

        bill.auditTrail.push({
            action: 'finalized',
            performedBy: userId,
            performedAt: new Date(),
            previousStatus: 'draft',
            newStatus: 'finalized',
        });

        await bill.save();
        return bill;
    }

    /**
     * Set payment responsibility (Patient vs Insurance)
     */
    async setPaymentResponsibility(billId, { patientAmount, insuranceAmount, insuranceClaimId, insuranceStatus }) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        bill.paymentResponsibility = {
            patientAmount: patientAmount || 0,
            insuranceAmount: insuranceAmount || 0
        };

        if (insuranceClaimId) {
            bill.insuranceClaim = insuranceClaimId;
        }

        if (insuranceStatus) {
            bill.insuranceStatus = insuranceStatus;
        } else if (insuranceAmount > 0) {
            bill.insuranceStatus = 'pending';
        }

        await bill.save();
        return bill;
    }

    /**
     * Record a payment
     */
    async recordPayment(billId, { amount, mode, reference, notes, receivedBy }) {
        const bill = await Billing.findById(billId);
        if (!bill) throw new Error('Bill not found');

        const newPaidAmount = (bill.paidAmount || 0) + Number(amount);

        // Prevent overpayment
        if (newPaidAmount > bill.grandTotal) {
            throw new Error(`Payment amount exceeds outstanding balance. Balance: ${bill.balanceAmount}, Attempted: ${amount}`);
        }

        bill.paidAmount = newPaidAmount;
        bill.balanceAmount = bill.grandTotal - bill.paidAmount;

        // Update payment status
        if (bill.paidAmount >= bill.grandTotal) {
            bill.paymentStatus = PAYMENT_STATUS.PAID;
            if (bill.insuranceStatus === 'pending' && mode === 'insurance') {
                bill.insuranceStatus = 'settled';
            }
        } else if (bill.paidAmount > 0) {
            bill.paymentStatus = PAYMENT_STATUS.PARTIAL;
        }

        bill.auditTrail.push({
            action: 'payment_received',
            performedBy: receivedBy,
            performedAt: new Date(),
            details: { amount, mode, reference, notes },
            previousStatus: bill.paymentStatus,
            newStatus: bill.paymentStatus
        });

        await bill.save();
        return bill;
    }
}

module.exports = new BillingService();
