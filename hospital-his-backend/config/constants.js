/**
 * System Constants
 * Centralized constants used throughout the application
 */

// User Roles
const USER_ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    RECEPTIONIST: 'receptionist',
    LAB_TECH: 'lab_tech',
    RADIOLOGIST: 'radiologist',
    PHARMACIST: 'pharmacist',
    BILLING: 'billing',
    INSURANCE: 'insurance',
    COMPLIANCE: 'compliance',
    HEAD_NURSE: 'head_nurse',
    INVENTORY_MANAGER: 'inventory_manager',
    CODER: 'coder',
    SENIOR_CODER: 'senior_coder',
};

// Appointment Status
const APPOINTMENT_STATUS = {
    SCHEDULED: 'scheduled',
    CHECKED_IN: 'checked-in',
    IN_CONSULTATION: 'in-consultation',
    COMPLETED: 'completed',
    PHARMACY_CLEARED: 'pharmacy-cleared',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no-show',
};

// Admission Status
const ADMISSION_STATUS = {
    ADMITTED: 'admitted',
    DISCHARGED: 'discharged',
    TRANSFERRED: 'transferred',
};

// Lab Test Status
const LAB_TEST_STATUS = {
    ORDERED: 'ordered',
    SAMPLE_COLLECTED: 'sample-collected',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Radiology Test Status
const RADIOLOGY_STATUS = {
    ORDERED: 'ordered',
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Surgery Status
const SURGERY_STATUS = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Billing/Payment Status
const PAYMENT_STATUS = {
    PENDING: 'pending',
    PARTIAL: 'partial',
    PAID: 'paid',
    REFUNDED: 'refunded',
};

// Payment Modes
const PAYMENT_MODES = {
    CASH: 'cash',
    CARD: 'card',
    UPI: 'upi',
    CHEQUE: 'cheque',
    INSURANCE: 'insurance',
    ONLINE: 'online',
};

// Insurance Claim Status
const INSURANCE_CLAIM_STATUS = {
    PENDING: 'pending',
    PRE_AUTHORIZED: 'pre-authorized',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SETTLED: 'settled',
};

// Bed Status
const BED_STATUS = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    UNDER_MAINTENANCE: 'under-maintenance',
    RESERVED: 'reserved',
};

// Bed Types
const BED_TYPES = {
    GENERAL: 'general',
    SEMI_PRIVATE: 'semi-private',
    PRIVATE: 'private',
    ICU: 'icu',
    NICU: 'nicu',
};

// Inventory Status (for items)
const INVENTORY_STATUS = {
    AVAILABLE: 'available',
    LOW_STOCK: 'low-stock',
    OUT_OF_STOCK: 'out-of-stock',
    EXPIRED: 'expired',
    BLOCKED: 'blocked',
    QUARANTINED: 'quarantined',
};

// Purchase Order Status
const PURCHASE_ORDER_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    ORDERED: 'ordered',
    PARTIAL: 'partial',
    CLOSED: 'closed',
    CANCELLED: 'cancelled',
};

// Purchase Requisition Status
const PURCHASE_REQUISITION_STATUS = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CONVERTED: 'converted',
};

// Stock Issue Status
const STOCK_ISSUE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    ISSUED: 'issued',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

// Stock Transfer Status
const STOCK_TRANSFER_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    IN_TRANSIT: 'in-transit',
    RECEIVED: 'received',
    CANCELLED: 'cancelled',
};

// Stock Return Status
const STOCK_RETURN_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
};

// Inventory Recall Status
const INVENTORY_RECALL_STATUS = {
    ACTIVE: 'active',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// AI Anomaly Types
const AI_ANOMALY_TYPES = {
    UNBILLED_SERVICE: 'unbilled-service',
    UNBILLED_MEDICINE: 'unbilled-medicine',
    UNUSUAL_PATTERN: 'unusual-pattern',
};

// AI Anomaly Status
const AI_ANOMALY_STATUS = {
    DETECTED: 'detected',
    UNDER_REVIEW: 'under-review',
    RESOLVED: 'resolved',
    FALSE_POSITIVE: 'false-positive',
};

// AI Prediction Types
const AI_PREDICTION_TYPES = {
    OPD_RUSH: 'opd-rush',
    BED_OCCUPANCY: 'bed-occupancy',
    LAB_WORKLOAD: 'lab-workload',
};

// Notification Types
const NOTIFICATION_TYPES = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
    ALERT: 'alert',
};

// Visit Types
const VISIT_TYPES = {
    OPD: 'opd',
    IPD: 'ipd',
    EMERGENCY: 'emergency',
};

// Blood Groups
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Gender Options
const GENDERS = ['Male', 'Female', 'Other'];

// Drug Interaction Severity
const INTERACTION_SEVERITY = {
    MAJOR: 'major',
    MODERATE: 'moderate',
    MINOR: 'minor',
};

// MAR (Medication Administration Record) Status
const MAR_STATUS = {
    SCHEDULED: 'scheduled',
    GIVEN: 'given',
    HELD: 'held',
    REFUSED: 'refused',
    MISSED: 'missed',
    SELF_ADMINISTERED: 'self-administered',
};

// Medication Administration Routes
const MED_ROUTES = {
    ORAL: 'oral',
    IV: 'iv',
    IM: 'im',
    SC: 'sc',
    TOPICAL: 'topical',
    INHALATION: 'inhalation',
    SUBLINGUAL: 'sublingual',
    RECTAL: 'rectal',
    NASAL: 'nasal',
    OPHTHALMIC: 'ophthalmic',
    OTIC: 'otic',
    OTHER: 'other',
};

// Drug Recall Status
const RECALL_STATUS = {
    ACTIVE: 'active',
    RESOLVED: 'resolved',
    CANCELLED: 'cancelled',
};

// Drug Recall Class
const RECALL_CLASS = {
    CLASS_I: 'class-i',      // Serious health hazard
    CLASS_II: 'class-ii',    // May cause temporary problems
    CLASS_III: 'class-iii',  // Not likely to cause problems
};

// Hold Reasons for MAR
const MAR_HOLD_REASONS = {
    NPO: 'npo',
    PATIENT_NOT_AVAILABLE: 'patient_not_available',
    VITAL_SIGNS: 'vital_signs',
    LAB_VALUES: 'lab_values',
    DOCTOR_ORDER: 'doctor_order',
    OTHER: 'other',
};

// Incident Report Status
const INCIDENT_REPORT_STATUS = {
    SUBMITTED: 'submitted',
    IN_REVIEW: 'in_review',
    CLOSED: 'closed',
};

// Clinical Coding Status (Workflow-driven)
const CLINICAL_CODING_STATUS = {
    AWAITING_CODING: 'awaiting-coding',      // Initial state after encounter finalized
    IN_PROGRESS: 'in-progress',              // Coder has started working
    PENDING_REVIEW: 'pending-review',        // Coder submitted for review
    APPROVED: 'approved',                    // Senior coder/admin approved
    RETURNED: 'returned',                    // Returned for correction with reason
};

module.exports = {
    USER_ROLES,
    APPOINTMENT_STATUS,
    ADMISSION_STATUS,
    LAB_TEST_STATUS,
    RADIOLOGY_STATUS,
    SURGERY_STATUS,
    PAYMENT_STATUS,
    PAYMENT_MODES,
    INSURANCE_CLAIM_STATUS,
    BED_STATUS,
    BED_TYPES,
    INVENTORY_STATUS,
    PURCHASE_ORDER_STATUS,
    PURCHASE_REQUISITION_STATUS,
    STOCK_ISSUE_STATUS,
    STOCK_TRANSFER_STATUS,
    STOCK_RETURN_STATUS,
    INVENTORY_RECALL_STATUS,
    AI_ANOMALY_TYPES,
    AI_ANOMALY_STATUS,
    AI_PREDICTION_TYPES,
    NOTIFICATION_TYPES,
    VISIT_TYPES,
    BLOOD_GROUPS,
    GENDERS,
    // New pharmacy constants
    INTERACTION_SEVERITY,
    MAR_STATUS,
    MED_ROUTES,
    RECALL_STATUS,
    RECALL_CLASS,
    MAR_HOLD_REASONS,
    // Clinical Coding constants
    CLINICAL_CODING_STATUS,
    // Incident Report constants
    INCIDENT_REPORT_STATUS,
};
