import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pill, Clock, Check, X, AlertTriangle, User,
    Calendar, Activity, Stethoscope, ChevronDown,
    PlayCircle, PauseCircle, XCircle, CheckCircle2,
    AlertCircle, Shield
} from 'lucide-react';
import nursingService from '../../services/nursing.service';

/**
 * NursingMAR Component
 * 
 * Medication Administration Record for nurses:
 * - View scheduled medications by admission
 * - Perform pre-admin safety checks
 * - Record administration with witnessing
 * - Handle holds and refusals
 */

const NursingMAR = ({ admissionId, patientInfo }) => {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedMed, setSelectedMed] = useState(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [safetyCheck, setSafetyCheck] = useState(null);
    const [checkingId, setCheckingId] = useState(null);

    // Fetch MAR schedule
    const fetchSchedule = async () => {
        if (!admissionId) return;
        setLoading(true);
        try {
            const res = await nursingService.getMARSchedule(admissionId, {
                date: selectedDate,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
            setSchedule(res.data || []);
        } catch (error) {
            console.error('Error fetching MAR schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
        // Refresh every minute
        const interval = setInterval(fetchSchedule, 60000);
        return () => clearInterval(interval);
    }, [admissionId, selectedDate, statusFilter]);

    // Run pre-admin safety check
    const runSafetyCheck = async (marId) => {
        setCheckingId(marId);
        try {
            const res = await nursingService.preAdminSafetyCheck(marId);
            setSafetyCheck(res.data);
            return res.data;
        } catch (error) {
            console.error('Error running safety check:', error);
            return null;
        } finally {
            setCheckingId(null);
        }
    };

    // Handle admin button click
    const handleAdminClick = async (med) => {
        setSelectedMed(med);
        const check = await runSafetyCheck(med._id);
        if (check?.safe !== false) {
            setShowAdminModal(true);
        } else {
            // Show blocker alert
            alert(`Cannot administer: ${check.blockers.map(b => b.message).join(', ')}`);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            'scheduled': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Scheduled' },
            'given': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Given' },
            'held': { icon: PauseCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Held' },
            'refused': { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Refused' },
            'missed': { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Missed' },
        };
        return configs[status] || configs['scheduled'];
    };

    const isOverdue = (med) => {
        if (med.status !== 'scheduled') return false;
        return new Date(med.dueWindow?.late) < new Date();
    };

    // Group by hour
    const groupedSchedule = schedule.reduce((acc, med) => {
        const hour = new Date(med.scheduledTime).getHours();
        const key = hour.toString().padStart(2, '0') + ':00';
        if (!acc[key]) acc[key] = [];
        acc[key].push(med);
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Pill />
                            Medication Administration Record
                        </h2>
                        {patientInfo && (
                            <p className="text-violet-200 mt-1">
                                {patientInfo.firstName} {patientInfo.lastName} • {patientInfo.patientId}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-violet-200">Admission</div>
                        <div className="font-mono font-bold">{admissionId?.slice(-8)}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                {/* Date Picker */}
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-1">
                    {['all', 'scheduled', 'given', 'held', 'refused'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${statusFilter === status
                                    ? 'bg-violet-100 text-violet-700'
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Overdue Alert */}
                {schedule.some(m => isOverdue(m)) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                        <AlertTriangle size={16} />
                        Overdue medications
                    </div>
                )}
            </div>

            {/* Schedule Timeline */}
            <div className="p-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading schedule...</div>
                ) : Object.keys(groupedSchedule).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Pill size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No medications scheduled for this date</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedSchedule)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([hour, meds]) => (
                                <div key={hour} className="flex gap-4">
                                    {/* Time Column */}
                                    <div className="w-16 flex-shrink-0 text-right">
                                        <span className="text-lg font-bold text-gray-700">{hour}</span>
                                    </div>

                                    {/* Medications */}
                                    <div className="flex-1 space-y-2">
                                        {meds.map((med) => {
                                            const statusConfig = getStatusConfig(med.status);
                                            const StatusIcon = statusConfig.icon;
                                            const overdue = isOverdue(med);

                                            return (
                                                <motion.div
                                                    key={med._id}
                                                    layout
                                                    className={`p-4 rounded-xl border-2 transition-all ${overdue
                                                            ? 'border-red-300 bg-red-50'
                                                            : `border-gray-100 ${statusConfig.bg}`
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bg}`}>
                                                                <StatusIcon size={20} className={statusConfig.color} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-800">
                                                                    {med.medicineName || med.medicine?.name}
                                                                </h4>
                                                                <p className="text-sm text-gray-500">
                                                                    {med.dose} • {med.route}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {/* Batch info */}
                                                            <span className="text-xs text-gray-400 font-mono">
                                                                Batch: {med.batch?.batchNumber}
                                                            </span>

                                                            {/* Action Buttons */}
                                                            {med.status === 'scheduled' && (
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => handleAdminClick(med)}
                                                                        disabled={checkingId === med._id}
                                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                                                    >
                                                                        {checkingId === med._id ? (
                                                                            'Checking...'
                                                                        ) : (
                                                                            <>
                                                                                <Check size={14} /> Give
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleHold(med)}
                                                                        className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200"
                                                                    >
                                                                        Hold
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRefuse(med)}
                                                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                                                                    >
                                                                        Refused
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {med.status !== 'scheduled' && (
                                                                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                                                    {statusConfig.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Safety warnings */}
                                                    {safetyCheck && selectedMed?._id === med._id && safetyCheck.warnings?.length > 0 && (
                                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                            <p className="text-sm text-yellow-800 flex items-center gap-1">
                                                                <AlertTriangle size={14} />
                                                                {safetyCheck.warnings.map(w => w.message).join('; ')}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Given details */}
                                                    {med.status === 'given' && (
                                                        <p className="text-xs text-gray-400 mt-2">
                                                            Given at {new Date(med.administeredTime).toLocaleTimeString()}
                                                            by {med.administeredBy?.profile?.firstName}
                                                        </p>
                                                    )}

                                                    {/* Hold reason */}
                                                    {med.status === 'held' && med.holdReason && (
                                                        <p className="text-xs text-orange-600 mt-2">
                                                            Held: {med.holdReason.replace('_', ' ')} - {med.holdDetails}
                                                        </p>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Admin Modal */}
            <AnimatePresence>
                {showAdminModal && selectedMed && (
                    <AdministerModal
                        med={selectedMed}
                        safetyCheck={safetyCheck}
                        onClose={() => {
                            setShowAdminModal(false);
                            setSelectedMed(null);
                            setSafetyCheck(null);
                        }}
                        onSuccess={() => {
                            setShowAdminModal(false);
                            setSelectedMed(null);
                            setSafetyCheck(null);
                            fetchSchedule();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );

    // Hold and Refuse handlers
    async function handleHold(med) {
        const reason = prompt('Select hold reason:\n- npo\n- patient_not_available\n- vital_signs\n- lab_values\n- doctor_order\n- other');
        if (!reason) return;
        const details = prompt('Additional details (optional):');

        try {
            await nursingService.holdMedication(med._id, reason.toLowerCase().replace(' ', '_'), details);
            fetchSchedule();
        } catch (error) {
            console.error('Error holding medication:', error);
            alert('Failed to hold medication');
        }
    }

    async function handleRefuse(med) {
        const reason = prompt('Enter refusal reason:');
        if (!reason) return;

        try {
            await nursingService.recordRefusal(med._id, reason);
            fetchSchedule();
        } catch (error) {
            console.error('Error recording refusal:', error);
            alert('Failed to record refusal');
        }
    }
};

/**
 * Administer Medication Modal
 */
const AdministerModal = ({ med, safetyCheck, onClose, onSuccess }) => {
    const [notes, setNotes] = useState('');
    const [site, setSite] = useState('');
    const [vitals, setVitals] = useState({
        bloodPressure: '',
        pulse: '',
        temperature: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await nursingService.recordAdministration(med._id, {
                notes,
                site,
                vitalsAtAdmin: vitals.bloodPressure ? vitals : undefined,
            });
            onSuccess();
        } catch (error) {
            console.error('Error recording administration:', error);
            alert('Failed to record administration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Check />
                        Administer Medication
                    </h2>
                    <p className="text-green-100 mt-1">
                        {med.medicineName || med.medicine?.name} - {med.dose}
                    </p>
                </div>

                {/* Safety Check Status */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Safety Check Passed</span>
                    </div>
                    {safetyCheck?.warnings?.length > 0 && (
                        <div className="mt-2 text-sm text-yellow-600">
                            ⚠️ Warnings: {safetyCheck.warnings.map(w => w.message).join(', ')}
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-4">
                    {/* Medication Details */}
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-500">Route:</span>
                                <span className="ml-2 font-medium">{med.route}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Batch:</span>
                                <span className="ml-2 font-mono">{med.batch?.batchNumber}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Scheduled:</span>
                                <span className="ml-2 font-medium">
                                    {new Date(med.scheduledTime).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Site (for injections) */}
                    {['iv', 'im', 'sc'].includes(med.route) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Injection Site
                            </label>
                            <input
                                type="text"
                                value={site}
                                onChange={(e) => setSite(e.target.value)}
                                placeholder="e.g., Left deltoid, Right gluteal"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    )}

                    {/* Vitals (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vitals at Administration (Optional)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                value={vitals.bloodPressure}
                                onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                                placeholder="BP"
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <input
                                type="number"
                                value={vitals.pulse}
                                onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                                placeholder="Pulse"
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <input
                                type="number"
                                step="0.1"
                                value={vitals.temperature}
                                onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                                placeholder="Temp"
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any observations or comments..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? 'Recording...' : (
                            <>
                                <CheckCircle2 size={18} />
                                Confirm Administration
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default NursingMAR;
