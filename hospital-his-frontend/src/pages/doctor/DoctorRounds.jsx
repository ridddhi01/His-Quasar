import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Stethoscope,
    Users,
    Bed,
    ClipboardList,
    Activity,
    ChevronRight,
    Search,
    RefreshCw,
    Plus,
    Eye,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Target,
    Calendar,
    FileText
} from 'lucide-react';
import axios from 'axios';
import CarePlanCreator from '../../components/doctor/CarePlanCreator';
import * as carePlanService from '../../services/careplan.service';

const API_URL = 'http://localhost:5001/api/v1';

const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
};

/**
 * Doctor Rounds Page
 * For doctors to manage their admitted IPD patients and care plans
 */
const DoctorRounds = () => {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [carePlans, setCarePlans] = useState([]);
    const [vitals, setVitals] = useState([]);
    const [nursingNotes, setNursingNotes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCarePlanCreator, setShowCarePlanCreator] = useState(false);
    const [selectedCarePlan, setSelectedCarePlan] = useState(null);
    const [activeTab, setActiveTab] = useState('careplans'); // 'careplans', 'vitals', 'notes'

    // Load admitted patients
    useEffect(() => {
        fetchAdmittedPatients();
    }, []);

    const fetchAdmittedPatients = async () => {
        try {
            setLoading(true);
            // Get current user to find their assigned patients
            const user = JSON.parse(localStorage.getItem('user'));

            // Fetch all admitted patients (in production, filter by assigned doctor)
            const response = await axios.get(
                `${API_URL}/ipd/admissions?status=admitted`,
                getAuthHeaders()
            );
            setPatients(response.data.data || []);
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatientCarePlans = async (patientId) => {
        try {
            const response = await carePlanService.getPatientCarePlans(patientId, 'all');
            setCarePlans(response.data || []);
        } catch (error) {
            console.error('Error fetching care plans:', error);
            setCarePlans([]);
        }
    };

    const fetchPatientVitals = async (patientId) => {
        try {
            const response = await axios.get(
                `${API_URL}/nursing/vitals/${patientId}?limit=50`,
                getAuthHeaders()
            );
            setVitals(response.data.data || []);
        } catch (error) {
            console.error('Error fetching vitals:', error);
            setVitals([]);
        }
    };

    const fetchNursingNotes = async (patientId, admissionId) => {
        try {
            const response = await axios.get(
                `${API_URL}/nursing/notes/${patientId}?admission=${admissionId}`,
                getAuthHeaders()
            );
            setNursingNotes(response.data.data || []);
        } catch (error) {
            console.error('Error fetching nursing notes:', error);
            setNursingNotes([]);
        }
    };
    const handleSelectPatient = async (admission) => {
        setSelectedPatient(admission);
        setShowCarePlanCreator(false);
        setSelectedCarePlan(null);
        setActiveTab('careplans');
        await fetchPatientCarePlans(admission.patient._id);
        await fetchPatientVitals(admission.patient._id);
        await fetchNursingNotes(admission.patient._id, admission._id);
    };

    // Filter patients
    const filteredPatients = patients.filter(p => {
        const patient = p.patient;
        const searchLower = searchTerm.toLowerCase();
        return (
            patient?.firstName?.toLowerCase().includes(searchLower) ||
            patient?.lastName?.toLowerCase().includes(searchLower) ||
            patient?.patientId?.toLowerCase().includes(searchLower) ||
            p.admissionNumber?.toLowerCase().includes(searchLower)
        );
    });

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            case 'discontinued': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Get priority color
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'low': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Stethoscope className="w-8 h-8" />
                            <div>
                                <h1 className="text-2xl font-bold">Doctor Rounds</h1>
                                <p className="text-indigo-100 text-sm">
                                    Manage admitted patients and care plans
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-white/20 rounded-lg">
                                <span className="text-sm">{patients.length} Admitted Patients</span>
                            </div>
                            <button
                                onClick={fetchAdmittedPatients}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Patient List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search patients..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-gray-500 text-sm">Loading patients...</p>
                                </div>
                            ) : filteredPatients.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p>No admitted patients found</p>
                                </div>
                            ) : (
                                filteredPatients.map((admission) => (
                                    <div
                                        key={admission._id}
                                        onClick={() => handleSelectPatient(admission)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedPatient?._id === admission._id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                                    {admission.patient?.firstName?.charAt(0) || 'P'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">
                                                        {admission.patient?.firstName} {admission.patient?.lastName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <Bed className="w-3 h-3" />
                                                        {admission.bed?.bedNumber || 'N/A'}
                                                        <span className="text-gray-300">•</span>
                                                        {admission.patient?.patientId}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            <span className="font-medium text-gray-600">Diagnosis:</span> {admission.diagnosis || 'Not specified'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Care Plans Section */}
                    <div className="lg:col-span-2">
                        {!selectedPatient ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                <Stethoscope className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h2 className="text-xl font-semibold text-gray-600 mb-2">Select a Patient</h2>
                                <p className="text-gray-400">
                                    Click on a patient from the list to view and manage their care plans
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Patient Header */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                                                {selectedPatient.patient?.firstName?.charAt(0)}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-800">
                                                    {selectedPatient.patient?.firstName} {selectedPatient.patient?.lastName}
                                                </h2>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span>{selectedPatient.patient?.patientId}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span>Bed: {selectedPatient.bed?.bedNumber || 'N/A'}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span>Ward: {selectedPatient.ward?.name || 'N/A'}</span>
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    <span className="font-medium">Diagnosis:</span> {selectedPatient.diagnosis || 'Not specified'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowCarePlanCreator(true);
                                                setSelectedCarePlan(null);
                                            }}
                                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            New Care Plan
                                        </button>
                                    </div>
                                </div>

                                {/* Care Plan Creator */}
                                <AnimatePresence>
                                    {showCarePlanCreator && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <CarePlanCreator
                                                patient={selectedPatient.patient}
                                                admission={selectedPatient}
                                                onSuccess={() => {
                                                    setShowCarePlanCreator(false);
                                                    fetchPatientCarePlans(selectedPatient.patient._id);
                                                }}
                                                onClose={() => setShowCarePlanCreator(false)}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Tab Navigation */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="flex border-b border-gray-100">
                                        <button
                                            onClick={() => setActiveTab('careplans')}
                                            className={`px-6 py-4 font-medium flex items-center gap-2 transition-colors ${
                                                activeTab === 'careplans'
                                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                                    : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                        >
                                            <ClipboardList className="w-5 h-5" />
                                            Care Plans
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('vitals')}
                                            className={`px-6 py-4 font-medium flex items-center gap-2 transition-colors ${
                                                activeTab === 'vitals'
                                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                                    : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                        >
                                            <Activity className="w-5 h-5" />
                                            Vitals ({vitals.length})
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('notes')}
                                            className={`px-6 py-4 font-medium flex items-center gap-2 transition-colors ${
                                                activeTab === 'notes'
                                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                                    : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                        >
                                            <FileText className="w-5 h-5" />
                                            Nursing Notes ({nursingNotes.length})
                                        </button>
                                    </div>

                                    {/* Care Plans Tab */}
                                    {activeTab === 'careplans' && (
                                        <div className="divide-y divide-gray-100">
                                            {carePlans.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">
                                                    <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                                    <p>No care plans created yet</p>
                                                    <button
                                                        onClick={() => setShowCarePlanCreator(true)}
                                                        className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                                    >
                                                        Create First Plan
                                                    </button>
                                                </div>
                                            ) : (
                                                carePlans.map((plan) => (
                                                    <div
                                                        key={plan._id}
                                                        onClick={() => setSelectedCarePlan(plan)}
                                                        className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                            selectedCarePlan?._id === plan._id ? 'bg-indigo-50' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h4 className="font-semibold text-gray-800">{plan.title}</h4>
                                                                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                                                                <div className="flex items-center gap-4 mt-3">
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                                        plan.status === 'active'
                                                                            ? 'bg-green-100 text-green-700'
                                                                            : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {plan.status}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        Created: {new Date(plan.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Vitals Tab */}
                                    {activeTab === 'vitals' && (
                                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                                            {vitals.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">
                                                    <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                                    <p>No vitals recorded yet</p>
                                                </div>
                                            ) : (
                                                vitals.map((vital) => (
                                                    <div key={vital._id} className="p-6 hover:bg-gray-50">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(vital.recordedAt).toLocaleString()}
                                                            </span>
                                                            {vital.isCritical && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Critical
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            {vital.bloodPressure && (
                                                                <div>
                                                                    <span className="text-gray-600">BP:</span>
                                                                    <span className="ml-2 font-medium">{vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic} mmHg</span>
                                                                </div>
                                                            )}
                                                            {vital.pulse?.rate && (
                                                                <div>
                                                                    <span className="text-gray-600">Pulse:</span>
                                                                    <span className="ml-2 font-medium">{vital.pulse.rate} bpm</span>
                                                                </div>
                                                            )}
                                                            {vital.temperature?.value && (
                                                                <div>
                                                                    <span className="text-gray-600">Temp:</span>
                                                                    <span className="ml-2 font-medium">{vital.temperature.value}°{vital.temperature.unit === 'celsius' ? 'C' : 'F'}</span>
                                                                </div>
                                                            )}
                                                            {vital.respiratoryRate?.rate && (
                                                                <div>
                                                                    <span className="text-gray-600">RR:</span>
                                                                    <span className="ml-2 font-medium">{vital.respiratoryRate.rate} /min</span>
                                                                </div>
                                                            )}
                                                            {vital.oxygenSaturation?.value && (
                                                                <div>
                                                                    <span className="text-gray-600">O2 Sat:</span>
                                                                    <span className="ml-2 font-medium">{vital.oxygenSaturation.value}%</span>
                                                                </div>
                                                            )}
                                                            {vital.painScore?.score !== undefined && (
                                                                <div>
                                                                    <span className="text-gray-600">Pain:</span>
                                                                    <span className="ml-2 font-medium">{vital.painScore.score}/10</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {vital.recordedBy && (
                                                            <div className="text-xs text-gray-400 mt-2">
                                                                Recorded by: {vital.recordedBy.profile?.firstName} {vital.recordedBy.profile?.lastName}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Nursing Notes Tab */}
                                    {activeTab === 'notes' && (
                                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                                            {nursingNotes.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">
                                                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                                    <p>No nursing notes recorded yet</p>
                                                </div>
                                            ) : (
                                                nursingNotes.map((note) => (
                                                    <div key={note._id} className="p-6 hover:bg-gray-50">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <span className="text-xs text-gray-500 font-medium uppercase">
                                                                {note.noteType}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(note.createdAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{note.content}</p>
                                                        {note.createdBy && (
                                                            <div className="text-xs text-gray-400">
                                                                By: {note.createdBy.profile?.firstName} {note.createdBy.profile?.lastName}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                <div>
                                    {carePlans.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <button
                                                onClick={() => setShowCarePlanCreator(true)}
                                                className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                            >
                                                Create First Care Plan
                                            </button>
                                        </div>
                                    ) : (
                                        carePlans.map((plan) => (
                                            <div key={plan._id} className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800">{plan.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(plan.status)}`}>
                                                                {plan.status}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                Created: {new Date(plan.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedCarePlan(selectedCarePlan?._id === plan._id ? null : plan)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                </div>

                                                {/* Expanded Care Plan Details */}
                                                <AnimatePresence>
                                                        {selectedCarePlan?._id === plan._id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-4 pt-4 border-t border-gray-100"
                                                            >
                                                                {/* Goals */}
                                                                <div className="mb-4">
                                                                    <h5 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                                                                        <Target className="w-4 h-4" />
                                                                        Goals
                                                                    </h5>
                                                                    <div className="space-y-2">
                                                                        {plan.goals?.map((goal, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                                                                <div className={`w-2 h-2 rounded-full ${goal.status === 'achieved' ? 'bg-green-500' :
                                                                                        goal.status === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                                                                                    }`} />
                                                                                <span className="text-sm text-gray-700 flex-1">{goal.description}</span>
                                                                                <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(goal.priority)}`}>
                                                                                    {goal.priority}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Interventions */}
                                                                <div>
                                                                    <h5 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                                                                        <Activity className="w-4 h-4" />
                                                                        Interventions
                                                                    </h5>
                                                                    <div className="space-y-2">
                                                                        {plan.interventions?.map((intervention, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                                                <span className="text-sm text-gray-700">{intervention.description}</span>
                                                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">
                                                                                    {intervention.frequency}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Flagged Issues */}
                                                                {plan.flaggedIssues?.filter(i => i.status === 'open').length > 0 && (
                                                                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                                                        <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                                                                            <AlertTriangle className="w-4 h-4" />
                                                                            Flagged Issues
                                                                        </h5>
                                                                        {plan.flaggedIssues.filter(i => i.status === 'open').map((issue, idx) => (
                                                                            <div key={idx} className="text-sm text-red-600">
                                                                                • {issue.description}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorRounds;
