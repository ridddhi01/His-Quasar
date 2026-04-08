import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Clock, MapPin, Building, User, AlertTriangle,
    FileText, CheckCircle, XCircle, Play, Archive, MessageSquare, History
} from 'lucide-react';
import incidentService from '../../services/incident.service';
import toast from 'react-hot-toast';

const IncidentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [pendingStatus, setPendingStatus] = useState(null);

    useEffect(() => {
        fetchIncident();
    }, [id]);

    const fetchIncident = async () => {
        setLoading(true);
        try {
            const response = await incidentService.getIncidentById(id);
            setIncident(response.data);
            setPermissions(response.permissions || {});
            setReviewNotes(response.data.reviewNotes || '');
        } catch (error) {
            console.error('Error fetching incident:', error);
            toast.error(error.response?.data?.message || 'Failed to load incident details');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setPendingStatus(newStatus);
        setShowNotesModal(true);
    };

    const confirmStatusChange = async () => {
        if (!pendingStatus) return;
        setActionLoading(true);
        try {
            await incidentService.updateStatus(id, pendingStatus, reviewNotes);
            toast.success(`Status updated to ${pendingStatus.replace('_', ' ')}`);
            setShowNotesModal(false);
            setPendingStatus(null);
            fetchIncident();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        setActionLoading(true);
        try {
            await incidentService.addReviewNotes(id, reviewNotes);
            toast.success('Notes saved');
            fetchIncident();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save notes');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            submitted: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: 'Submitted' },
            in_review: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'In Review' },
            closed: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: 'Closed' },
        };
        return styles[status] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: status };
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getReporterName = (reporter) => {
        if (!reporter?.profile) return 'Unknown';
        return `${reporter.profile.firstName} ${reporter.profile.lastName}`;
    };

    const getNextStatusOptions = () => {
        if (!incident) return [];
        switch (incident.status) {
            case 'submitted': return [{ value: 'in_review', label: 'Start Review', icon: <Play size={16} /> }];
            case 'in_review': return [{ value: 'closed', label: 'Close Incident', icon: <Archive size={16} /> }];
            default: return [];
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading incident...</p>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="p-6 text-center">
                <p className="text-slate-500">Incident not found</p>
            </div>
        );
    }

    const statusInfo = getStatusBadge(incident.status);
    const nextStatusOptions = getNextStatusOptions();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-6"
            >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Back to List</span>
            </button>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
                {/* Status Banner */}
                <div className={`px-8 py-4 ${statusInfo.bg} border-b ${statusInfo.border}`}>
                    <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-2 font-bold ${statusInfo.text}`}>
                            <FileText size={18} />
                            Incident Report
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                            {statusInfo.label}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {/* Meta Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Occurred At</p>
                                <p className="text-sm font-medium text-slate-700">{formatDate(incident.occurredAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Location</p>
                                <p className="text-sm font-medium text-slate-700">{incident.location}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <Building size={20} />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Department</p>
                                <p className="text-sm font-medium text-slate-700">{incident.department?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Reporter & Harm Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Reported By</p>
                                <p className="text-sm font-medium text-slate-700">{getReporterName(incident.reporterId)}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Submitted {formatDate(incident.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${incident.wasHarm ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                {incident.wasHarm ? <XCircle size={20} /> : <CheckCircle size={20} />}
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Harm Occurred?</p>
                                <p className={`text-sm font-bold ${incident.wasHarm ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {incident.wasHarm ? 'Yes, harm was reported' : 'No harm reported'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Assigned To */}
                    {incident.assignedTo && (
                        <div className="pt-6 border-t border-slate-100">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Assigned To</p>
                                    <p className="text-sm font-medium text-slate-700">{getReporterName(incident.assignedTo)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description Sections */}
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                What Happened
                            </h3>
                            <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-600 leading-relaxed">
                                {incident.whatHappened}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-rose-500" />
                                What Could Have Gone Wrong
                            </h3>
                            <div className="bg-rose-50/50 rounded-xl p-5 text-sm text-slate-600 leading-relaxed border border-rose-100">
                                {incident.whatCouldHaveGoneWrong}
                            </div>
                        </div>
                    </div>

                    {/* Review Notes Section */}
                    {permissions.canAddNotes && (
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <MessageSquare size={16} className="text-blue-500" />
                                Review Notes
                            </h3>
                            <textarea
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={3}
                                placeholder="Add notes about investigation, findings, or follow-up actions..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                            />
                            <button
                                onClick={handleSaveNotes}
                                disabled={actionLoading}
                                className="mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : 'Save Notes'}
                            </button>
                        </div>
                    )}

                    {/* View-only Review Notes for non-authorized users */}
                    {!permissions.canAddNotes && incident.reviewNotes && (
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <MessageSquare size={16} className="text-blue-500" />
                                Review Notes
                            </h3>
                            <div className="bg-blue-50/50 rounded-xl p-5 text-sm text-slate-600 leading-relaxed border border-blue-100">
                                {incident.reviewNotes}
                            </div>
                        </div>
                    )}

                    {/* Activity Log */}
                    {incident.activityLog && incident.activityLog.length > 0 && (
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <History size={16} className="text-slate-500" />
                                Activity History
                            </h3>
                            <div className="space-y-3">
                                {incident.activityLog.slice().reverse().map((log, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 mt-2"></div>
                                        <div>
                                            <span className="font-medium text-slate-700">
                                                {log.action.replace('_', ' ').charAt(0).toUpperCase() + log.action.replace('_', ' ').slice(1)}
                                            </span>
                                            {log.details?.fromStatus && log.details?.toStatus && (
                                                <span className="text-slate-500"> from {log.details.fromStatus} to {log.details.toStatus}</span>
                                            )}
                                            <span className="text-slate-400"> · {formatDate(log.timestamp)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons (RBAC-aware) */}
                    {permissions.canChangeStatus && nextStatusOptions.length > 0 && (
                        <div className="pt-6 border-t border-slate-100 flex gap-3">
                            {nextStatusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleStatusChange(option.value)}
                                    disabled={actionLoading}
                                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Notes Modal for Status Change */}
            {showNotesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setShowNotesModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6"
                    >
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Update Status</h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Changing status to <span className="font-bold">{pendingStatus?.replace('_', ' ')}</span>. Add optional notes about this action.
                        </p>
                        <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            placeholder="Add notes (optional)..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNotesModal(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmStatusChange}
                                disabled={actionLoading}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50"
                            >
                                {actionLoading ? 'Updating...' : 'Confirm'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default IncidentDetail;
