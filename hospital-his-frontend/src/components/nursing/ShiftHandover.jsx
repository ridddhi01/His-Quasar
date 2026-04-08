import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRightLeft,
    User,
    Bed,
    AlertTriangle,
    Clock,
    ClipboardList,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronRight,
    Pill,
    Activity,
    MessageSquare,
    Send,
    FileText,
    Bell,
    Save,
    AlertCircle
} from 'lucide-react';
import * as nursingService from '../../services/nursing.service';

/**
 * ShiftHandover Component
 * For outgoing nurses to create and submit shift handover
 */
const ShiftHandover = ({ shift, patients, onSubmit, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [expandedPatient, setExpandedPatient] = useState(null);

    // Handover form state
    const [handoverData, setHandoverData] = useState({
        patientHandovers: patients.map(p => ({
            patientId: p.patient?._id || p._id,
            patientName: `${p.patient?.firstName || p.firstName} ${p.patient?.lastName || p.lastName}`,
            bedNumber: p.bed?.bedNumber || 'N/A',
            admissionId: p.admission?._id || p._id,
            currentCondition: 'stable',
            conditionTrend: 'stable',
            keyFindings: '',
            pendingActions: '',
            specialInstructions: '',
            criticalAlerts: [],
            vitalsLastRecorded: '',
            medicationNotes: '',
            ivFluids: '',
            painLevel: '',
            mobilityStatus: '',
            dietaryNotes: '',
            familyCommunication: ''
        })),
        generalNotes: '',
        wardIssues: '',
        equipmentIssues: '',
        staffingNotes: '',
        urgentFollowups: ''
    });

    // Condition options
    const conditionOptions = [
        { value: 'stable', label: 'Stable', color: 'text-green-600 bg-green-100' },
        { value: 'improving', label: 'Improving', color: 'text-blue-600 bg-blue-100' },
        { value: 'deteriorating', label: 'Deteriorating', color: 'text-orange-600 bg-orange-100' },
        { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-100' },
        { value: 'observation', label: 'Close Observation', color: 'text-yellow-600 bg-yellow-100' }
    ];

    // Trend options
    const trendOptions = [
        { value: 'improving', label: '↑ Improving', color: 'text-green-600' },
        { value: 'stable', label: '→ Stable', color: 'text-blue-600' },
        { value: 'declining', label: '↓ Declining', color: 'text-red-600' }
    ];

    // Update patient handover data
    const updatePatientHandover = (patientId, field, value) => {
        setHandoverData(prev => ({
            ...prev,
            patientHandovers: prev.patientHandovers.map(ph =>
                ph.patientId === patientId ? { ...ph, [field]: value } : ph
            )
        }));
    };

    // Add critical alert
    const addCriticalAlert = (patientId, alert) => {
        setHandoverData(prev => ({
            ...prev,
            patientHandovers: prev.patientHandovers.map(ph =>
                ph.patientId === patientId
                    ? { ...ph, criticalAlerts: [...ph.criticalAlerts, alert] }
                    : ph
            )
        }));
    };

    // Remove critical alert
    const removeCriticalAlert = (patientId, index) => {
        setHandoverData(prev => ({
            ...prev,
            patientHandovers: prev.patientHandovers.map(ph =>
                ph.patientId === patientId
                    ? { ...ph, criticalAlerts: ph.criticalAlerts.filter((_, i) => i !== index) }
                    : ph
            )
        }));
    };

    // Validate handover
    const validateHandover = () => {
        const criticalPatients = handoverData.patientHandovers.filter(
            ph => ph.currentCondition === 'critical' || ph.currentCondition === 'deteriorating'
        );

        for (const cp of criticalPatients) {
            if (!cp.keyFindings || !cp.specialInstructions) {
                alert(`Please provide key findings and special instructions for critical/deteriorating patient: ${cp.patientName}`);
                return false;
            }
        }
        return true;
    };

    // Submit handover
    const handleSubmit = async () => {
        if (!validateHandover()) return;

        try {
            setLoading(true);
            await onSubmit(handoverData);
        } catch (error) {
            console.error('Error submitting handover:', error);
            alert('Failed to submit handover');
        } finally {
            setLoading(false);
        }
    };

    // Get condition color
    const getConditionColor = (condition) => {
        return conditionOptions.find(c => c.value === condition)?.color || 'text-gray-600 bg-gray-100';
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4">
                <div className="flex items-center gap-3">
                    <ArrowRightLeft className="w-6 h-6" />
                    <div>
                        <h2 className="text-xl font-bold">Shift Handover Form</h2>
                        <p className="text-orange-100 text-sm">
                            Complete handover for {patients.length} patient(s)
                        </p>
                    </div>
                </div>
            </div>

            {/* Patient-by-Patient Handover */}
            <div className="p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    Patient Status Handover
                </h3>

                <div className="space-y-4">
                    {handoverData.patientHandovers.map((ph, index) => (
                        <div
                            key={ph.patientId}
                            className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                            {/* Patient Header */}
                            <div
                                className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => setExpandedPatient(expandedPatient === ph.patientId ? null : ph.patientId)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-800">{ph.patientName}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Bed className="w-3 h-3" />
                                            Bed {ph.bedNumber}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(ph.currentCondition)}`}>
                                        {conditionOptions.find(c => c.value === ph.currentCondition)?.label}
                                    </span>
                                    {expandedPatient === ph.patientId ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Form */}
                            <AnimatePresence>
                                {expandedPatient === ph.patientId && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-200"
                                    >
                                        <div className="p-4 space-y-4">
                                            {/* Current Condition & Trend */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        Current Condition *
                                                    </label>
                                                    <select
                                                        value={ph.currentCondition}
                                                        onChange={(e) => updatePatientHandover(ph.patientId, 'currentCondition', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                                    >
                                                        {conditionOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        Condition Trend
                                                    </label>
                                                    <select
                                                        value={ph.conditionTrend}
                                                        onChange={(e) => updatePatientHandover(ph.patientId, 'conditionTrend', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                                    >
                                                        {trendOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Key Findings */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    Key Findings & Observations
                                                    {(ph.currentCondition === 'critical' || ph.currentCondition === 'deteriorating') && (
                                                        <span className="text-red-500 ml-1">*</span>
                                                    )}
                                                </label>
                                                <textarea
                                                    value={ph.keyFindings}
                                                    onChange={(e) => updatePatientHandover(ph.patientId, 'keyFindings', e.target.value)}
                                                    placeholder="Significant observations, test results, changes in condition..."
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                                                    rows={3}
                                                />
                                            </div>

                                            {/* Clinical Status Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Pain Level (0-10)</label>
                                                    <input
                                                        type="text"
                                                        value={ph.painLevel}
                                                        onChange={(e) => updatePatientHandover(ph.patientId, 'painLevel', e.target.value)}
                                                        placeholder="e.g., 4/10"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Mobility</label>
                                                    <input
                                                        type="text"
                                                        value={ph.mobilityStatus}
                                                        onChange={(e) => updatePatientHandover(ph.patientId, 'mobilityStatus', e.target.value)}
                                                        placeholder="e.g., Bed-bound"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">IV/Fluids</label>
                                                    <input
                                                        type="text"
                                                        value={ph.ivFluids}
                                                        onChange={(e) => updatePatientHandover(ph.patientId, 'ivFluids', e.target.value)}
                                                        placeholder="e.g., NS @ 100ml/hr"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Diet</label>
                                                    <input
                                                        type="text"
                                                        value={ph.dietaryNotes}
                                                        onChange={(e) => updatePatientHandover(ph.patientId, 'dietaryNotes', e.target.value)}
                                                        placeholder="e.g., NPO, Soft diet"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Medication Notes */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                                                    <Pill className="w-4 h-4 text-purple-500" />
                                                    Medication Notes
                                                </label>
                                                <textarea
                                                    value={ph.medicationNotes}
                                                    onChange={(e) => updatePatientHandover(ph.patientId, 'medicationNotes', e.target.value)}
                                                    placeholder="New medications, dosage changes, PRN given, missed doses..."
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* Pending Actions */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                                                    <ClipboardList className="w-4 h-4 text-blue-500" />
                                                    Pending Actions / Tasks
                                                </label>
                                                <textarea
                                                    value={ph.pendingActions}
                                                    onChange={(e) => updatePatientHandover(ph.patientId, 'pendingActions', e.target.value)}
                                                    placeholder="Labs pending, procedures scheduled, doctor rounds expected..."
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* Special Instructions */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                                    Special Instructions
                                                    {(ph.currentCondition === 'critical' || ph.currentCondition === 'deteriorating') && (
                                                        <span className="text-red-500 ml-1">*</span>
                                                    )}
                                                </label>
                                                <textarea
                                                    value={ph.specialInstructions}
                                                    onChange={(e) => updatePatientHandover(ph.patientId, 'specialInstructions', e.target.value)}
                                                    placeholder="Isolation precautions, fall risk, allergies to watch, specific monitoring..."
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* Family Communication */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                                                    <MessageSquare className="w-4 h-4 text-green-500" />
                                                    Family Communication
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ph.familyCommunication}
                                                    onChange={(e) => updatePatientHandover(ph.patientId, 'familyCommunication', e.target.value)}
                                                    placeholder="Family visit expected, concerns raised, updates given..."
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>

                                            {/* Critical Alerts */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                                                    <Bell className="w-4 h-4 text-red-500" />
                                                    Critical Alerts
                                                </label>
                                                <div className="flex gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        id={`alert-input-${ph.patientId}`}
                                                        placeholder="Add critical alert..."
                                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                                addCriticalAlert(ph.patientId, e.target.value.trim());
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById(`alert-input-${ph.patientId}`);
                                                            if (input && input.value.trim()) {
                                                                addCriticalAlert(ph.patientId, input.value.trim());
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                                {ph.criticalAlerts.length > 0 && (
                                                    <div className="space-y-1">
                                                        {ph.criticalAlerts.map((alert, idx) => (
                                                            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                                                                <span className="text-sm text-red-700">⚠️ {alert}</span>
                                                                <button
                                                                    onClick={() => removeCriticalAlert(ph.patientId, idx)}
                                                                    className="text-red-400 hover:text-red-600"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* General Ward Notes */}
                <div className="mt-8 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-500" />
                        General Notes
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Ward Issues</label>
                            <textarea
                                value={handoverData.wardIssues}
                                onChange={(e) => setHandoverData(prev => ({ ...prev, wardIssues: e.target.value }))}
                                placeholder="Any ward-level concerns..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Equipment Issues</label>
                            <textarea
                                value={handoverData.equipmentIssues}
                                onChange={(e) => setHandoverData(prev => ({ ...prev, equipmentIssues: e.target.value }))}
                                placeholder="Equipment needs repair, missing items..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Urgent Follow-ups</label>
                        <textarea
                            value={handoverData.urgentFollowups}
                            onChange={(e) => setHandoverData(prev => ({ ...prev, urgentFollowups: e.target.value }))}
                            placeholder="Items requiring immediate attention in next shift..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none"
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Additional Notes</label>
                        <textarea
                            value={handoverData.generalNotes}
                            onChange={(e) => setHandoverData(prev => ({ ...prev, generalNotes: e.target.value }))}
                            placeholder="Any other information for incoming nurse..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    Handover will be sent to incoming nurse for acknowledgment
                </p>
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Submit Handover
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShiftHandover;
