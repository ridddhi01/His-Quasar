const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const Emergency = require('../models/Emergency');

/**
 * Patient Service
 * Handles patient-related business logic
 */

class PatientService {
    /**
     * Generate unique patient ID
     */
    async generatePatientId() {
        const lastPatient = await Patient.findOne().sort({ createdAt: -1 });
        const lastId = lastPatient?.patientId?.replace('PAT', '') || '0';
        const newIdNumber = parseInt(lastId, 10) + 1;
        return `PAT${String(newIdNumber).padStart(8, '0')}`;
    }

    /**
     * Register new patient
     */
    async registerPatient(patientData) {
        const patientId = await this.generatePatientId();
        return Patient.create({ ...patientData, patientId });
    }

    /**
     * Search patients by multiple criteria
     */
    async searchPatients(criteria, options = {}) {
        const { query, patientId, phone, email } = criteria;
        const { page = 1, limit = 20 } = options;

        const searchQuery = {};

        if (query) {
            searchQuery.$or = [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { patientId: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
            ];
        }

        if (patientId) searchQuery.patientId = patientId;
        if (phone) searchQuery.phone = phone;
        if (email) searchQuery.email = email;

        const skip = (page - 1) * limit;

        const [patients, total] = await Promise.all([
            Patient.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Patient.countDocuments(searchQuery),
        ]);

        return { patients, total, page, pages: Math.ceil(total / limit) };
    }

    /**
     * Get comprehensive patient history
     */
    async getPatientHistory(patientId) {
        const [appointments, admissions, emergencies] = await Promise.all([
            Appointment.find({ patient: patientId })
                .populate('doctor', 'profile.firstName profile.lastName')
                .populate('department', 'name')
                .sort({ scheduledDate: -1 }),
            Admission.find({ patient: patientId })
                .populate('doctor', 'profile.firstName profile.lastName')
                .populate('department', 'name')
                .populate('ward', 'name')
                .sort({ admissionDate: -1 }),
            Emergency.find({ patient: patientId })
                .populate('assignedDoctor', 'profile.firstName profile.lastName')
                .sort({ arrivalTime: -1 }),
        ]);

        return {
            appointments,
            admissions,
            emergencies,
            summary: {
                totalAppointments: appointments.length,
                totalAdmissions: admissions.length,
                totalEmergencies: emergencies.length,
            },
        };
    }

    /**
     * Check for duplicate patient
     */
    async checkDuplicate(phone, email, firstName, lastName) {
        const query = {
            $or: [
                { phone },
                ...(email ? [{ email }] : []),
                { firstName: { $regex: new RegExp(`^${firstName}$`, 'i') }, lastName: { $regex: new RegExp(`^${lastName}$`, 'i') } },
            ],
        };

        return Patient.findOne(query);
    }

    /**
     * Get patient statistics
     */
    async getPatientStats(patientId) {
        const patient = await Patient.findById(patientId);
        if (!patient) return null;

        const [appointmentCount, admissionCount] = await Promise.all([
            Appointment.countDocuments({ patient: patientId }),
            Admission.countDocuments({ patient: patientId }),
        ]);

        return {
            patient,
            stats: {
                totalVisits: appointmentCount + admissionCount,
                appointmentCount,
                admissionCount,
            },
        };
    }
}

module.exports = new PatientService();
