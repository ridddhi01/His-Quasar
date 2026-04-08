import React, { useState, useEffect } from 'react';
import {
    Pill,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    User,
    Shield,
    RefreshCw,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import * as nursingService from '../../services/nursing.service';

/**
 * MedicationAdministration Component
 * MAR interface with 5-Rights verification
 */
const MedicationAdministration = ({ patient, admission, onComplete }) => {
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMed, setSelectedMed] = useState(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Fetch medication schedule
    useEffect(() => {
        fetchMedications();
    }, [patient._id, selectedDate]);

    const fetchMedications = async () => {
        try {
            setLoading(true);
            const response = await nursingService.getMedicationSchedule(patient._id, selectedDate);
            setMedications(response.data || []);
        } catch (error) {
            console.error('Error fetching medications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'given': return 'bg-green-100 text-green-700 border-green-200';
            case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'skipped': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'delayed': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'refused': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Check if overdue
    const isOverdue = (scheduledTime) => {
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const gracePeriod = 30 * 60 * 1000; // 30 minutes
        return now > new Date(scheduled.getTime() + gracePeriod);
    };

    // Format time
    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group medications by time
    const groupedMedications = medications.reduce((acc, med) => {
        const hour = new Date(med.scheduledTime).getHours();
        const timeSlot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening/Night';
        if (!acc[timeSlot]) acc[timeSlot] = [];
        acc[timeSlot].push(med);
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Pill className="w-6 h-6" />
                        <div>
                            <h2 className="text-lg font-semibold">Medication Administration Record</h2>
                            <p className="text-purple-100 text-sm">
                                {patient?.firstName} {patient?.lastName} • {patient?.patientId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 text-sm"
                        />
                        <button
                            onClick={fetchMedications}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Allergy Alert */}
            {patient?.allergies?.length > 0 && (
                <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-700">Allergies: </span>
                    <span className="text-red-600">
                        {patient.allergies.map(a => a.allergen || a).join(', ')}
                    </span>
                </div>
            )}

            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading medications...</p>
                    </div>
                ) : medications.length === 0 ? (
                    <div className="text-center py-12">
                        <Pill className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">No medications scheduled for this date</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedMedications).map(([timeSlot, meds]) => (
                            <div key={timeSlot}>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    {timeSlot}
                                </h3>
                                <div className="space-y-3">
                                    {meds.map((med) => (
                                        <MedicationCard
                                            key={med._id}
                                            medication={med}
                                            isOverdue={med.status === 'scheduled' && isOverdue(med.scheduledTime)}
                                            getStatusColor={getStatusColor}
                                            formatTime={formatTime}
                                            onAdminister={() => {
                                                setSelectedMed(med);
                                                setShowAdminModal(true);
                                            }}
                                            onSkip={() => {
                                                setSelectedMed(med);
                                                setShowSkipModal(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Administration Modal */}
            {showAdminModal && selectedMed && (
                <AdministrationModal
                    medication={selectedMed}
                    patient={patient}
                    onClose={() => {
                        setShowAdminModal(false);
                        setSelectedMed(null);
                    }}
                    onSuccess={() => {
                        setShowAdminModal(false);
                        setSelectedMed(null);
                        fetchMedications();
                        if (onComplete) onComplete();
                    }}
                />
            )}

            {/* Skip Modal */}
            {showSkipModal && selectedMed && (
                <SkipModal
                    medication={selectedMed}
                    onClose={() => {
                        setShowSkipModal(false);
                        setSelectedMed(null);
                    }}
                    onSuccess={() => {
                        setShowSkipModal(false);
                        setSelectedMed(null);
                        fetchMedications();
                    }}
                />
            )}
        </div>
    );
};

// Medication Card Component
const MedicationCard = ({ medication, isOverdue, getStatusColor, formatTime, onAdminister, onSkip }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`border rounded-xl overflow-hidden ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}>
            <div
                className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Time */}
                <div className={`text-center ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                    <Clock className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm font-medium">{formatTime(medication.scheduledTime)}</span>
                </div>

                {/* Medication Info */}
                <div className="flex-1">
                    <div className="font-medium text-gray-800">
                        {medication.medication?.medicineName}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>{medication.medication?.dosage}</span>
                        <span>•</span>
                        <span className="capitalize">{medication.medication?.route}</span>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(medication.status)}`}>
                    {medication.status.charAt(0).toUpperCase() + medication.status.slice(1)}
                </div>

                {/* Overdue Badge */}
                {isOverdue && (
                    <div className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium animate-pulse">
                        OVERDUE
                    </div>
                )}

                {/* Actions */}
                {medication.status === 'scheduled' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAdminister();
                            }}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Give
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSkip();
                            }}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors flex items-center gap-1"
                        >
                            <XCircle className="w-4 h-4" />
                            Skip
                        </button>
                    </div>
                )}

                {/* Expand Arrow */}
                {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Frequency:</span>
                            <span className="ml-2 text-gray-800">{medication.medication?.frequency}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Instructions:</span>
                            <span className="ml-2 text-gray-800">{medication.medication?.instructions || 'None'}</span>
                        </div>
                        {medication.administeredAt && (
                            <>
                                <div>
                                    <span className="text-gray-500">Given at:</span>
                                    <span className="ml-2 text-gray-800">
                                        {new Date(medication.administeredAt).toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Given by:</span>
                                    <span className="ml-2 text-gray-800">
                                        {medication.administeredBy?.profile?.firstName} {medication.administeredBy?.profile?.lastName}
                                    </span>
                                </div>
                            </>
                        )}
                        {medication.skipReason && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Skip reason:</span>
                                <span className="ml-2 text-gray-800">{medication.skipReason}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Administration Modal
const AdministrationModal = ({ medication, patient, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [verification, setVerification] = useState({
        rightPatient: false,
        rightDrug: false,
        rightDose: false,
        rightRoute: false,
        rightTime: false
    });
    const [notes, setNotes] = useState('');
    const [witnessId, setWitnessId] = useState('');

    const allVerified = Object.values(verification).every(v => v);

    const handleAdminister = async () => {
        if (!allVerified) {
            alert('Please verify all 5 Rights before administering');
            return;
        }

        try {
            setLoading(true);
            await nursingService.administerMedication(medication._id, {
                verification,
                notes,
                witnessId: witnessId || undefined
            });
            onSuccess();
        } catch (error) {
            console.error('Error administering medication:', error);
            alert('Failed to administer: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6" />
                        <div>
                            <h2 className="text-lg font-semibold">5 Rights Verification</h2>
                            <p className="text-green-100 text-sm">Confirm before administering</p>
                        </div>
                    </div>
                </div>

                {/* Medication Info */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="font-semibold text-gray-800 text-lg">
                        {medication.medication?.medicineName}
                    </div>
                    <div className="text-gray-600">
                        {medication.medication?.dosage} • {medication.medication?.route}
                    </div>
                </div>

                {/* 5 Rights Checklist */}
                <div className="p-6 space-y-4">
                    {[
                        { key: 'rightPatient', label: 'Right Patient', description: `Verified: ${patient?.firstName} ${patient?.lastName} (${patient?.patientId})` },
                        { key: 'rightDrug', label: 'Right Drug', description: `Verified: ${medication.medication?.medicineName}` },
                        { key: 'rightDose', label: 'Right Dose', description: `Verified: ${medication.medication?.dosage}` },
                        { key: 'rightRoute', label: 'Right Route', description: `Verified: ${medication.medication?.route}` },
                        { key: 'rightTime', label: 'Right Time', description: `Scheduled: ${new Date(medication.scheduledTime).toLocaleTimeString()}` }
                    ].map((item) => (
                        <label
                            key={item.key}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${verification[item.key]
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={verification[item.key]}
                                onChange={(e) => setVerification(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                className="mt-1 h-5 w-5 text-green-500 rounded"
                            />
                            <div>
                                <div className="font-medium text-gray-800">{item.label}</div>
                                <div className="text-sm text-gray-500">{item.description}</div>
                            </div>
                        </label>
                    ))}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any observations..."
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdminister}
                        disabled={!allVerified || loading}
                        className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Administering...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Confirm Administration
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Skip Modal
const SkipModal = ({ medication, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [skipReason, setSkipReason] = useState('');
    const [skipDetails, setSkipDetails] = useState('');

    const skipReasons = [
        { value: 'patient_refused', label: 'Patient Refused' },
        { value: 'patient_npo', label: 'Patient NPO' },
        { value: 'patient_vomiting', label: 'Patient Vomiting' },
        { value: 'patient_away', label: 'Patient Away (Procedure/Test)' },
        { value: 'medication_unavailable', label: 'Medication Unavailable' },
        { value: 'vital_signs_abnormal', label: 'Vitals Abnormal - Held' },
        { value: 'doctor_hold', label: 'Doctor Ordered Hold' },
        { value: 'allergy_concern', label: 'Allergy Concern' },
        { value: 'adverse_reaction', label: 'Adverse Reaction' },
        { value: 'other', label: 'Other' }
    ];

    const handleSkip = async () => {
        if (!skipReason) {
            alert('Please select a reason');
            return;
        }

        try {
            setLoading(true);
            await nursingService.skipMedication(medication._id, {
                skipReason,
                skipDetails
            });
            onSuccess();
        } catch (error) {
            console.error('Error skipping medication:', error);
            alert('Failed to skip: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center gap-3">
                        <XCircle className="w-6 h-6" />
                        <div>
                            <h2 className="text-lg font-semibold">Skip Medication</h2>
                            <p className="text-orange-100 text-sm">{medication.medication?.medicineName}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Skipping <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={skipReason}
                            onChange={(e) => setSkipReason(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="">Select reason...</option>
                            {skipReasons.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Details
                        </label>
                        <textarea
                            value={skipDetails}
                            onChange={(e) => setSkipDetails(e.target.value)}
                            placeholder="Provide more context..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <strong>Note:</strong> Skipping a medication will generate an alert for review.
                                The attending physician will be notified.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSkip}
                        disabled={!skipReason || loading}
                        className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Skipping...
                            </>
                        ) : (
                            <>
                                <XCircle className="w-5 h-5" />
                                Confirm Skip
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MedicationAdministration;
