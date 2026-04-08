const Insurance = require('../models/Insurance');
const InsuranceProvider = require('../models/InsuranceProvider');
const { INSURANCE_STATUS } = require('../config/constants');

/**
 * Insurance Service
 * Handles insurance processing and claims
 */

class InsuranceService {
    /**
     * Generate claim number
     */
    async generateClaimNumber() {
        const today = new Date();
        const prefix = `CLM${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

        const lastClaim = await Insurance.findOne({ claimNumber: { $regex: `^${prefix}` } })
            .sort({ createdAt: -1 });

        const sequence = lastClaim
            ? parseInt(lastClaim.claimNumber.slice(-6), 10) + 1
            : 1;

        return `${prefix}${String(sequence).padStart(6, '0')}`;
    }

    /**
     * Verify patient insurance
     */
    async verifyInsurance(patientId, providerId, policyNumber) {
        const provider = await InsuranceProvider.findById(providerId);
        if (!provider || !provider.isActive) {
            return { valid: false, message: 'Insurance provider not found or inactive' };
        }

        // TODO: Integrate with actual insurance verification API
        return {
            valid: true,
            provider,
            policyNumber,
            coverageDetails: {
                maxCoverage: 500000,
                usedAmount: 0,
                remainingAmount: 500000,
            },
        };
    }

    /**
     * Submit insurance claim
     */
    async submitClaim(claimData) {
        const claimNumber = await this.generateClaimNumber();

        const claim = await Insurance.create({
            ...claimData,
            claimNumber,
            status: INSURANCE_STATUS.SUBMITTED,
            submittedDate: new Date(),
        });

        // TODO: Integrate with insurance provider API
        return claim;
    }

    /**
     * Calculate co-pay amount
     */
    async calculateCoPay(providerId, totalAmount, serviceType) {
        const provider = await InsuranceProvider.findById(providerId);
        if (!provider) return totalAmount;

        // Check co-pay rate from provider settings
        const coPayPercent = provider.coPayPercentage || 20;
        const coPayAmount = (totalAmount * coPayPercent) / 100;

        return {
            totalAmount,
            coPayPercent,
            coPayAmount: Math.round(coPayAmount * 100) / 100,
            insuranceAmount: Math.round((totalAmount - coPayAmount) * 100) / 100,
        };
    }

    /**
     * Pre-authorization request
     */
    async requestPreAuth(patientId, providerId, treatmentDetails, estimatedCost) {
        const claimNumber = await this.generateClaimNumber();

        const preAuth = await Insurance.create({
            claimNumber,
            patient: patientId,
            provider: providerId,
            claimAmount: estimatedCost,
            treatmentDetails,
            status: INSURANCE_STATUS.PRE_AUTH_PENDING,
            submittedDate: new Date(),
        });

        // TODO: Send to insurance provider API
        return preAuth;
    }

    /**
     * Update claim status
     */
    async updateClaimStatus(claimId, status, approvedAmount, rejectionReason) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        claim.status = status;
        if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
        if (rejectionReason) claim.rejectionReason = rejectionReason;

        if (status === INSURANCE_STATUS.APPROVED) {
            claim.approvedDate = new Date();
        } else if (status === INSURANCE_STATUS.SETTLED) {
            claim.settlementDate = new Date();
        }

        return claim.save();
    }

    /**
     * Get claims summary
     */
    async getClaimsSummary(startDate, endDate) {
        const summary = await Insurance.aggregate([
            {
                $match: {
                    submittedDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$claimAmount' },
                    approvedAmount: { $sum: '$approvedAmount' },
                },
            },
        ]);

        return summary;
    }

    /**
     * Get provider-wise claim statistics
     */
    async getProviderStats(startDate, endDate) {
        return Insurance.aggregate([
            {
                $match: {
                    submittedDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$provider',
                    totalClaims: { $sum: 1 },
                    totalAmount: { $sum: '$claimAmount' },
                    approvedAmount: { $sum: '$approvedAmount' },
                    settledClaims: {
                        $sum: { $cond: [{ $eq: ['$status', INSURANCE_STATUS.SETTLED] }, 1, 0] },
                    },
                },
            },
            {
                $lookup: {
                    from: 'insuranceproviders',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'providerInfo',
                },
            },
            {
                $unwind: '$providerInfo',
            },
            {
                $project: {
                    providerName: '$providerInfo.name',
                    totalClaims: 1,
                    totalAmount: 1,
                    approvedAmount: 1,
                    settledClaims: 1,
                },
            },
        ]);
    }

    /**
     * Create/update pre-authorization with status tracking
     */
    async updatePreAuthStatus(claimId, status, amount, remarks, updatedBy) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        const previousStatus = claim.preAuthStatus;
        claim.preAuthStatus = status;

        if (status === 'approved') {
            claim.preAuthDate = new Date();
            claim.preAuthAmount = amount;
            claim.status = 'pre-authorized';
        }

        claim.claimLifecycle.push({
            status: `preauth_${status}`,
            updatedBy,
            updatedAt: new Date(),
            remarks,
        });

        claim.auditTrail.push({
            action: 'preauth_status_updated',
            performedBy: updatedBy,
            performedAt: new Date(),
            previousValue: previousStatus,
            newValue: status,
            details: { amount, remarks },
        });

        await claim.save();
        return claim;
    }

    /**
     * Validate ICD codes before claim submission
     */
    validateICDCodes(icdCodes) {
        if (!icdCodes || icdCodes.length === 0) {
            throw new Error('At least one ICD code is required for claim submission');
        }

        icdCodes.forEach((icd, index) => {
            if (!icd.code || icd.code.trim() === '') {
                throw new Error(`ICD code at index ${index} is empty`);
            }
            // Basic format validation for ICD-10 (e.g., A00.0)
            if (icd.version === 'ICD-10' && !/^[A-Z]\d{2}(\.\d{1,2})?$/.test(icd.code)) {
                throw new Error(`Invalid ICD-10 code format: ${icd.code}`);
            }
        });

        return true;
    }

    /**
     * Submit claim with ICD validation
     */
    async submitClaimWithICD(claimId, submittedBy) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        // Validate ICD codes are present
        this.validateICDCodes(claim.icdCodes);

        const previousStatus = claim.status;
        claim.status = 'pending';
        claim.submittedDate = new Date();

        claim.claimLifecycle.push({
            status: 'submitted',
            updatedBy: submittedBy,
            updatedAt: new Date(),
            remarks: 'Claim submitted with ICD codes',
        });

        claim.auditTrail.push({
            action: 'claim_submitted',
            performedBy: submittedBy,
            performedAt: new Date(),
            previousValue: previousStatus,
            newValue: 'pending',
        });

        await claim.save();
        return claim;
    }

    /**
     * Approve claim
     */
    async approveClaim(claimId, approvedAmount, updatedBy, remarks = null) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        claim.status = 'approved';
        claim.approvedAmount = approvedAmount;
        claim.approvalDate = new Date();

        claim.claimLifecycle.push({
            status: 'approved',
            updatedBy,
            updatedAt: new Date(),
            remarks: remarks || `Approved amount: ${approvedAmount}`,
        });

        claim.auditTrail.push({
            action: 'claim_approved',
            performedBy: updatedBy,
            performedAt: new Date(),
            details: { approvedAmount, remarks },
        });

        await claim.save();
        return claim;
    }

    /**
     * Reject claim
     */
    async rejectClaim(claimId, rejectionReason, updatedBy) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        claim.status = 'rejected';
        claim.rejectionReason = rejectionReason;

        claim.claimLifecycle.push({
            status: 'rejected',
            updatedBy,
            updatedAt: new Date(),
            remarks: rejectionReason,
        });

        claim.auditTrail.push({
            action: 'claim_rejected',
            performedBy: updatedBy,
            performedAt: new Date(),
            details: { rejectionReason },
        });

        await claim.save();
        return claim;
    }

    /**
     * Settle claim and update linked bill
     */
    async settleClaim(claimId, settlementAmount, settlementRef, remarks, updatedBy) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        if (claim.status !== 'approved') {
            throw new Error('Only approved claims can be settled');
        }

        claim.status = 'settled';
        claim.settlementAmount = settlementAmount;
        claim.settlementReference = settlementRef;
        claim.settlementRemarks = remarks;
        claim.settlementDate = new Date();

        claim.claimLifecycle.push({
            status: 'settled',
            updatedBy,
            updatedAt: new Date(),
            remarks: `Settled: ${settlementAmount}, Ref: ${settlementRef}`,
        });

        claim.auditTrail.push({
            action: 'claim_settled',
            performedBy: updatedBy,
            performedAt: new Date(),
            details: { settlementAmount, settlementRef, remarks },
        });

        await claim.save();

        // Update linked bill
        await this.updateBillWithInsurancePayment(claim, updatedBy);

        return claim;
    }

    /**
     * Get claim timeline
     */
    async getClaimTimeline(claimId) {
        const claim = await Insurance.findById(claimId)
            .populate('patient', 'firstName lastName patientId')
            .populate('provider', 'name')
            .populate('claimLifecycle.updatedBy', 'profile.firstName profile.lastName')
            .populate('auditTrail.performedBy', 'profile.firstName profile.lastName');

        if (!claim) throw new Error('Claim not found');

        return {
            claimNumber: claim.claimNumber,
            patient: claim.patient,
            provider: claim.provider,
            currentStatus: claim.status,
            lifecycle: claim.claimLifecycle,
            auditTrail: claim.auditTrail,
        };
    }

    /**
     * Update bill with insurance payment
     */
    async updateBillWithInsurancePayment(claim, userId) {
        const Billing = require('../models/Billing');
        const Payment = require('../models/Payment');

        // Find bill linked to admission
        const bill = await Billing.findOne({
            visit: claim.admission,
            visitModel: 'Admission'
        });

        if (bill) {
            // Create insurance payment record
            await Payment.create({
                bill: bill._id,
                patient: claim.patient,
                amount: claim.settlementAmount,
                paymentMode: 'insurance',
                paymentDetails: {
                    transactionId: claim.settlementReference,
                },
                collectedBy: userId,
                remarks: `Insurance settlement - ${claim.claimNumber}`,
            });

            // Update bill
            bill.insuranceClaim = claim._id;
            bill.paidAmount = bill.paidAmount + claim.settlementAmount;

            bill.auditTrail.push({
                action: 'insurance_payment_received',
                performedBy: userId,
                performedAt: new Date(),
                details: {
                    claimNumber: claim.claimNumber,
                    amount: claim.settlementAmount
                },
            });

            await bill.save();
        }
    }
}

module.exports = new InsuranceService();
