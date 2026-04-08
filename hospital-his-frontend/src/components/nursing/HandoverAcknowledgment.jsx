import React, { useState } from 'react';
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
    Bell,
    Check,
    AlertCircle,
    FileText
} from 'lucide-react';
import * as nursingService from '../../services/nursing.service';

/**
 * HandoverAcknowledgment Component
 * For incoming nurses to review and acknowledge handover
 */
const HandoverAcknowledgment = ({ handover, onAcknowledge, onRequestClarification }) => {
    const [loading, setLoading] = useState(false);
    const [expandedPatient, setExpandedPatient] = useState(null);
    const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');
    const [clarificationRequest, setClarificationRequest] = useState('');
    const [showClarificationModal, setShowClarificationModal] = useState(false);
    const [checkedPatients, setCheckedPatients] = useState([]);

    // Get condition color
    const getConditionColor = (condition) => {
        const colors = {
            stable: 'text-green-600 bg-green-100',
            improving: 'text-blue-600 bg-blue-100',
            deteriorating: 'text-orange-600 bg-orange-100',
            critical: 'text-red-600 bg-red-100',
            observation: 'text-yellow-600 bg-yellow-100'
        };
        return colors[condition] || 'text-gray-600 bg-gray-100';
    };

    // Get trend icon
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'improving': return '↑';
            case 'declining': return '↓';
            default: return '→';
        }
    };

    // Toggle patient checked
    const togglePatientChecked = (patientId) => {
        setCheckedPatients(prev =>
            prev.includes(patientId)
                ? prev.filter(id => id !== patientId)
                : [...prev, patientId]
        );
    };

    // Check if all patients are reviewed
    const allPatientsReviewed = () => {
        return handover.patientHandovers?.every(ph =>
            checkedPatients.includes(ph.patientId)
        );
    };

    // Handle acknowledgment
    const handleAcknowledge = async () => {
        if (!allPatientsReviewed()) {
            alert('Please review and check all patients before acknowledging');
            return;
        }

        try {
            setLoading(true);
            await onAcknowledge({
                acknowledgmentNotes,
                reviewedPatients: checkedPatients
            });
        } catch (error) {
            console.error('Error acknowledging handover:', error);
            alert('Failed to acknowledge handover');
        } finally {
            setLoading(false);
        }
    };

    // Handle clarification request
    const handleRequestClarification = async () => {
        if (!clarificationRequest.trim()) {
            alert('Please enter your clarification request');
            return;
        }

        try {
            setLoading(true);
            await onRequestClarification(clarificationRequest);
            setShowClarificationModal(false);
            setClarificationRequest('');
        } catch (error) {
            console.error('Error requesting clarification:', error);
        } finally {
            setLoading(false);
        }
    };

    // Format timestamp
    const formatTime = (date) => {
        return new Date(date).toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ArrowRightLeft className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-bold">Incoming Shift Handover</h2>
                            <p className="text-teal-100 text-sm">
                                From: {handover.handoverFrom?.nurse?.profile?.firstName} {handover.handoverFrom?.nurse?.profile?.lastName}
                                <span className="mx-2">•</span>
                                {handover.handoverFrom?.shiftType?.charAt(0).toUpperCase() + handover.handoverFrom?.shiftType?.slice(1)} Shift
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-teal-100">Submitted</div>
                        <div className="font-medium">{formatTime(handover.handoverTime)}</div>
                    </div>
                </div>
            </div>

            {/* Critical Alerts Banner */}
            {handover.patientHandovers?.some(ph => ph.criticalAlerts?.length > 0 || ph.currentCondition === 'critical') && (
                <div className="bg-red-50 border-b border-red-100 px-6 py-3">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Critical Alerts Present - Review Required</span>
                    </div>
                </div>
            )}

            {/* Patient Reviews */}
            <div className="p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <User className="w-5 h-5 text-teal-500" />
                        Patient Status ({handover.patientHandovers?.length || 0})
                    </span>
                    <span className="text-sm font-normal text-gray-500">
                        {checkedPatients.length} of {handover.patientHandovers?.length || 0} reviewed
                    </span>
                </h3>

                <div className="space-y-3">
                    {handover.patientHandovers?.map((ph, index) => (
                        <div
                            key={ph.patientId}
                            className={`border rounded-xl overflow-hidden transition-all ${checkedPatients.includes(ph.patientId)
                                    ? 'border-green-300 bg-green-50/50'
                                    : ph.currentCondition === 'critical' || ph.currentCondition === 'deteriorating'
                                        ? 'border-red-200'
                                        : 'border-gray-200'
                                }`}
                        >
                            {/* Patient Header */}
                            <div
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedPatient(expandedPatient === ph.patientId ? null : ph.patientId)}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Review Checkbox */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePatientChecked(ph.patientId);
                                        }}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checkedPatients.includes(ph.patientId)
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 hover:border-teal-500'
                                            }`}
                                    >
                                        {checkedPatients.includes(ph.patientId) && <Check className="w-4 h-4" />}
                                    </button>

                                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-semibold">
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
                                        {getTrendIcon(ph.conditionTrend)} {ph.currentCondition?.charAt(0).toUpperCase() + ph.currentCondition?.slice(1)}
                                    </span>
                                    {ph.criticalAlerts?.length > 0 && (
                                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                                            {ph.criticalAlerts.length} Alert(s)
                                        </span>
                                    )}
                                    {expandedPatient === ph.patientId ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {expandedPatient === ph.patientId && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-200"
                                    >
                                        <div className="p-4 space-y-4 bg-gray-50/50">
                                            {/* Critical Alerts */}
                                            {ph.criticalAlerts?.length > 0 && (
                                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                                    <h4 className="font-medium text-red-700 flex items-center gap-1 mb-2">
                                                        <Bell className="w-4 h-4" />
                                                        Critical Alerts
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {ph.criticalAlerts.map((alert, idx) => (
                                                            <div key={idx} className="text-sm text-red-600 flex items-start gap-1">
                                                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                {alert}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Key Findings */}
                                            {ph.keyFindings && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                        <Activity className="w-4 h-4 text-blue-500" />
                                                        Key Findings
                                                    </h4>
                                                    <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
                                                        {ph.keyFindings}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Clinical Status Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {ph.painLevel && (
                                                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500">Pain</div>
                                                        <div className="font-medium text-gray-800">{ph.painLevel}</div>
                                                    </div>
                                                )}
                                                {ph.mobilityStatus && (
                                                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500">Mobility</div>
                                                        <div className="font-medium text-gray-800">{ph.mobilityStatus}</div>
                                                    </div>
                                                )}
                                                {ph.ivFluids && (
                                                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500">IV/Fluids</div>
                                                        <div className="font-medium text-gray-800">{ph.ivFluids}</div>
                                                    </div>
                                                )}
                                                {ph.dietaryNotes && (
                                                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500">Diet</div>
                                                        <div className="font-medium text-gray-800">{ph.dietaryNotes}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Medication Notes */}
                                            {ph.medicationNotes && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                        <Pill className="w-4 h-4 text-purple-500" />
                                                        Medication Notes
                                                    </h4>
                                                    <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
                                                        {ph.medicationNotes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Pending Actions */}
                                            {ph.pendingActions && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                        <ClipboardList className="w-4 h-4 text-orange-500" />
                                                        Pending Actions
                                                    </h4>
                                                    <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                                        {ph.pendingActions}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Special Instructions */}
                                            {ph.specialInstructions && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                                        Special Instructions
                                                    </h4>
                                                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                                        {ph.specialInstructions}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Family Communication */}
                                            {ph.familyCommunication && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4 text-green-500" />
                                                        Family Communication
                                                    </h4>
                                                    <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
                                                        {ph.familyCommunication}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* General Notes */}
                {(handover.wardIssues || handover.equipmentIssues || handover.urgentFollowups || handover.generalNotes) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-500" />
                            General Notes
                        </h3>
                        <div className="space-y-3">
                            {handover.urgentFollowups && (
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <div className="text-xs font-medium text-orange-600 mb-1">URGENT FOLLOW-UPS</div>
                                    <p className="text-sm text-gray-700">{handover.urgentFollowups}</p>
                                </div>
                            )}
                            {handover.wardIssues && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Ward Issues</div>
                                    <p className="text-sm text-gray-700">{handover.wardIssues}</p>
                                </div>
                            )}
                            {handover.equipmentIssues && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Equipment Issues</div>
                                    <p className="text-sm text-gray-700">{handover.equipmentIssues}</p>
                                </div>
                            )}
                            {handover.generalNotes && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Additional Notes</div>
                                    <p className="text-sm text-gray-700">{handover.generalNotes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Acknowledgment Notes */}
                <div className="mt-6">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Acknowledgment Notes (Optional)
                    </label>
                    <textarea
                        value={acknowledgmentNotes}
                        onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                        placeholder="Any clarifications received, notes for documentation..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 resize-none"
                        rows={2}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <button
                    onClick={() => setShowClarificationModal(true)}
                    className="px-4 py-2.5 border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors flex items-center gap-2"
                >
                    <MessageSquare className="w-4 h-4" />
                    Request Clarification
                </button>
                <button
                    onClick={handleAcknowledge}
                    disabled={loading || !allPatientsReviewed()}
                    className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Acknowledge Handover
                        </>
                    )}
                </button>
            </div>

            {/* Clarification Modal */}
            <AnimatePresence>
                {showClarificationModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowClarificationModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Request Clarification</h3>
                            <textarea
                                value={clarificationRequest}
                                onChange={(e) => setClarificationRequest(e.target.value)}
                                placeholder="What would you like the outgoing nurse to clarify?"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none"
                                rows={4}
                            />
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setShowClarificationModal(false)}
                                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRequestClarification}
                                    disabled={loading}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                >
                                    Send Request
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HandoverAcknowledgment;
