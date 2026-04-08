import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    FileCode, Plus, Trash2, Check, Search, X, Clock, Send,
    User, Calendar, Stethoscope, AlertCircle, CheckCircle, XCircle,
    Loader2, FileText, History, ChevronDown, ChevronUp, RotateCcw, Receipt
} from 'lucide-react';
import clinicalCodingService from '../../services/clinicalCoding.service';

const { CLINICAL_CODING_STATUS, STATUS_LABELS, STATUS_COLORS } = clinicalCodingService;

/**
 * ClinicalCodingTab - Displays clinical coding with status-driven workflow
 * 
 * Props:
 * - encounterId: The ID of the encounter (appointment/admission)
 * - encounterModel: 'Appointment' | 'Admission'
 * - encounterType: 'opd' | 'ipd'
 * - encounterData: Optional encounter data for display
 */
const ClinicalCodingTab = ({ encounterId, encounterModel, encounterType, encounterData }) => {
    const [loading, setLoading] = useState(true);
    const [codingRecord, setCodingRecord] = useState(null);
    const [allowedTransitions, setAllowedTransitions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const [selectedCode, setSelectedCode] = useState(null);
    const [returnReason, setReturnReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [codeFormData, setCodeFormData] = useState({
        quantity: 1,
        modifier: '',
        notes: ''
    });

    // Get current user and check permissions
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isCoder = ['coder', 'senior_coder'].includes(user.role);
    const isSeniorCoder = ['admin', 'senior_coder'].includes(user.role);
    const canEdit = ['admin', 'senior_coder', 'coder'].includes(user.role);
    const canApprove = isSeniorCoder;

    useEffect(() => {
        fetchCodingRecord();
    }, [encounterId, encounterModel]);

    const fetchCodingRecord = async () => {
        try {
            setLoading(true);
            const response = await clinicalCodingService.getCodingByEncounter(encounterId, encounterModel);
            setCodingRecord(response.data);
            setAllowedTransitions(response.allowedTransitions || []);
        } catch (err) {
            console.error('Failed to fetch coding record:', err);
        } finally {
            setLoading(false);
        }
    };

    const searchProcedureCodes = async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            setSearching(true);
            const response = await clinicalCodingService.getProcedureCodes({ search: query, limit: 10 });
            setSearchResults(response.data || []);
        } catch (err) {
            console.error('Failed to search procedure codes:', err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchProcedureCodes(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Check if record is in editable state
    const isEditable = codingRecord && [
        CLINICAL_CODING_STATUS.AWAITING_CODING,
        CLINICAL_CODING_STATUS.IN_PROGRESS,
        CLINICAL_CODING_STATUS.RETURNED,
    ].includes(codingRecord.status);

    // ═══════════════════════════════════════════════════════════════════════════════
    // ACTION HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════

    const handleAddCode = async () => {
        if (!selectedCode) return;

        try {
            setActionLoading(true);
            await clinicalCodingService.addCodesToRecord(codingRecord._id, [{
                codeId: selectedCode._id,
                quantity: codeFormData.quantity,
                modifier: codeFormData.modifier,
                notes: codeFormData.notes,
                amount: selectedCode.baseRate || 0
            }]);
            toast.success(`Added code: ${selectedCode.code}`);
            setShowAddModal(false);
            setSelectedCode(null);
            setCodeFormData({ quantity: 1, modifier: '', notes: '' });
            setSearchQuery('');
            fetchCodingRecord();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add code');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveCode = async (assignedCodeId) => {
        if (!confirm('Remove this procedure code?')) return;

        try {
            setActionLoading(true);
            await clinicalCodingService.removeCodeFromRecord(codingRecord._id, assignedCodeId);
            toast.success('Code removed');
            fetchCodingRecord();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove code');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartCoding = async () => {
        try {
            setActionLoading(true);
            await clinicalCodingService.startCoding(codingRecord._id);
            toast.success('Coding started');
            fetchCodingRecord();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start coding');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmitForReview = async () => {
        try {
            setActionLoading(true);
            await clinicalCodingService.submitForReview(codingRecord._id);
            toast.success('Submitted for review');
            fetchCodingRecord();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            setActionLoading(true);
            await clinicalCodingService.approveCoding(codingRecord._id);
            toast.success('Coding approved for billing');
            fetchCodingRecord();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReturn = async () => {
        if (!returnReason.trim()) {
            toast.error('Return reason is required');
            return;
        }

        try {
            setActionLoading(true);
            await clinicalCodingService.returnForCorrection(codingRecord._id, returnReason);
            toast.success('Returned for correction');
            setShowReturnModal(false);
            setReturnReason('');
            fetchCodingRecord();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to return');
        } finally {
            setActionLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════

    const getStatusBadge = (status) => {
        const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
        const label = STATUS_LABELS[status] || status;

        const icons = {
            'awaiting-coding': <Clock size={12} />,
            'in-progress': <FileCode size={12} />,
            'pending-review': <AlertCircle size={12} />,
            'approved': <CheckCircle size={12} />,
            'returned': <XCircle size={12} />,
        };

        return (
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border}`}>
                {icons[status]}
                {label}
            </span>
        );
    };

    const isActionAllowed = (action) => {
        const actionToStatus = {
            'start': CLINICAL_CODING_STATUS.IN_PROGRESS,
            'submit': CLINICAL_CODING_STATUS.PENDING_REVIEW,
            'approve': CLINICAL_CODING_STATUS.APPROVED,
            'return': CLINICAL_CODING_STATUS.RETURNED,
        };
        return allowedTransitions.includes(actionToStatus[action]);
    };

    const getActionBlockedReason = (action) => {
        const reasons = {
            'start': 'Record is not in "Awaiting Coding" status',
            'submit': 'Record must be "In Progress" or "Returned" to submit for review',
            'approve': 'Only records in "Pending Review" can be approved',
            'return': 'Only records in "Pending Review" can be returned',
        };
        return reasons[action] || 'Action not allowed in current status';
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-500">Loading clinical coding...</span>
            </div>
        );
    }

    if (!codingRecord) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8">
                <div className="text-center text-gray-500">
                    <FileCode className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No coding record found</p>
                    <p className="text-sm mt-1">A coding record will be created when the encounter is finalized.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <FileCode size={20} />
                            Clinical Coding
                        </h3>
                        <p className="text-indigo-100 text-sm mt-1">{codingRecord.codingNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(codingRecord.status)}
                    </div>
                </div>
            </div>

            {/* Billing Linkage Status */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Billing Status:</span>
                    {codingRecord.linkedBill ? (
                        <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                            <CheckCircle size={12} /> Synced (Bill #{typeof codingRecord.linkedBill === 'object' ? codingRecord.linkedBill.billNumber : 'Linked'})
                        </span>
                    ) : (
                        <span className="text-sm text-gray-500 italic">Not generated yet</span>
                    )}
                </div>

                {/* Manual Sync Button (only if Approved) */}
                {codingRecord.status === CLINICAL_CODING_STATUS.APPROVED && (
                    <button
                        onClick={async () => {
                            try {
                                setActionLoading(true);
                                await clinicalCodingService.syncToBilling(codingRecord._id);
                                toast.success('Synced with Billing');
                                fetchCodingRecord();
                            } catch (err) {
                                toast.error('Failed to sync to billing');
                            } finally {
                                setActionLoading(false);
                            }
                        }}
                        disabled={actionLoading}
                        className="text-xs flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                        <RotateCcw size={12} />
                        {codingRecord.linkedBill ? 'Re-Sync Bill' : 'Generate Bill'}
                    </button>
                )}
            </div>

            {/* Return Reason Alert (for returned records) */}
            {codingRecord.status === CLINICAL_CODING_STATUS.RETURNED && codingRecord.currentReturnReason && (
                <div className="px-5 pt-5">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-red-700">Returned for Correction</h4>
                            <p className="text-sm text-red-600 mt-1">{codingRecord.currentReturnReason}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Encounter Summary */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                            {codingRecord.patient?.firstName} {codingRecord.patient?.lastName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                            {new Date(codingRecord.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Stethoscope size={16} className="text-gray-400" />
                        <span className="text-gray-600 capitalize">{encounterType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                            Dr. {codingRecord.finalizingDoctor?.profile?.firstName || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Assigned Codes List */}
            <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">Assigned Procedure Codes</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-600 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <History size={16} /> History
                            {showHistoryPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {canEdit && isEditable && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                            >
                                <Plus size={16} /> Add Code
                            </button>
                        )}
                    </div>
                </div>

                {codingRecord.assignedCodes?.length > 0 ? (
                    <div className="space-y-2">
                        {codingRecord.assignedCodes.map((item, idx) => (
                            <div
                                key={item._id || idx}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-indigo-600">
                                            {item.code?.code || 'N/A'}
                                        </span>
                                        {item.modifier && (
                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                                -{item.modifier}
                                            </span>
                                        )}
                                        <span className="text-gray-600 text-sm">
                                            x{item.quantity}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {item.code?.description || item.code?.shortDescription || 'No description'}
                                    </p>
                                    {item.notes && (
                                        <p className="text-xs text-gray-400 mt-1 italic">Note: {item.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">
                                        ₹{(item.amount || 0).toLocaleString()}
                                    </span>
                                    {canEdit && isEditable && (
                                        <button
                                            onClick={() => handleRemoveCode(item._id)}
                                            disabled={actionLoading}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Total Amount */}
                        <div className="flex justify-end pt-3 border-t border-gray-200">
                            <div className="text-right">
                                <span className="text-sm text-gray-500">Total Coded Amount:</span>
                                <span className="ml-2 text-lg font-bold text-slate-800">
                                    ₹{codingRecord.assignedCodes.reduce((sum, c) => sum + ((c.amount || 0) * (c.quantity || 1)), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No procedure codes assigned yet</p>
                        {canEdit && isEditable && (
                            <p className="text-sm mt-1">Click "Add Code" to assign procedure codes</p>
                        )}
                    </div>
                )}
            </div>

            {/* History Panel (Collapsible) */}
            <AnimatePresence>
                {showHistoryPanel && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 overflow-hidden"
                    >
                        <div className="p-5 bg-slate-50">
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <History size={16} /> Change History
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {codingRecord.auditTrail?.length > 0 ? (
                                    codingRecord.auditTrail.slice().reverse().map((entry, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-sm p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></div>
                                            <div className="flex-1">
                                                <div className="font-medium text-slate-700 capitalize flex justify-between">
                                                    <span>{entry.action.replace(/_/g, ' ')}</span>
                                                    <span className="text-xs text-gray-400 font-normal">
                                                        {new Date(entry.performedAt).toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Status Change */}
                                                {entry.previousStatus && entry.newStatus && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 bg-gray-50 p-1.5 rounded">
                                                        <span className="capitalize">{entry.previousStatus}</span>
                                                        <span>→</span>
                                                        <span className="capitalize font-medium text-indigo-600">{entry.newStatus}</span>
                                                    </div>
                                                )}

                                                {/* Added Codes Details */}
                                                {entry.details?.codes && entry.details.codes.length > 0 && (
                                                    <div className="mt-2 text-xs bg-green-50 text-green-700 p-2 rounded border border-green-100">
                                                        <span className="font-semibold">Added:</span>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {entry.details.codes.map((c, i) => (
                                                                <li key={i}>{c.codeId?.code || 'Code'} (x{c.quantity})</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Removed Code Details */}
                                                {entry.details?.removedCodeId && (
                                                    <div className="mt-1 text-xs text-red-500">
                                                        Removed code ID: {entry.details.removedCodeId}
                                                    </div>
                                                )}

                                                {/* Reason/Notes */}
                                                {entry.details?.reason && (
                                                    <div className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded border border-red-100">
                                                        <span className="font-semibold">Reason:</span> {entry.details.reason}
                                                    </div>
                                                )}

                                                {/* User Info */}
                                                <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                    <User size={10} />
                                                    {entry.performedBy?.profile?.firstName || 'User'}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-sm">No history available</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Workflow Action Buttons */}
            <div className="px-5 pb-5 flex flex-wrap gap-2">
                {/* Start Coding Button */}
                {codingRecord.status === CLINICAL_CODING_STATUS.AWAITING_CODING && canEdit && (
                    <button
                        onClick={handleStartCoding}
                        disabled={actionLoading || !isActionAllowed('start')}
                        title={!isActionAllowed('start') ? getActionBlockedReason('start') : ''}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <FileCode size={16} />}
                        Start Coding
                    </button>
                )}

                {/* Submit for Review Button (Standard Coders) */}
                {(codingRecord.status === CLINICAL_CODING_STATUS.IN_PROGRESS ||
                    codingRecord.status === CLINICAL_CODING_STATUS.RETURNED) && canEdit && !isSeniorCoder && (
                        <button
                            onClick={handleSubmitForReview}
                            disabled={actionLoading || !codingRecord.assignedCodes?.length}
                            title={!codingRecord.assignedCodes?.length ? 'Add codes before submitting' : ''}
                            className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Submit for Review
                        </button>
                    )}

                {/* Approve Button (Senior Coder / Admin Only) */}
                {(codingRecord.status === CLINICAL_CODING_STATUS.PENDING_REVIEW ||
                    (codingRecord.status === CLINICAL_CODING_STATUS.IN_PROGRESS && canApprove)) && (
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading || !canApprove || (codingRecord.status === CLINICAL_CODING_STATUS.IN_PROGRESS && !codingRecord.assignedCodes?.length)}
                            title={!canApprove ? 'Only senior coders or admins can approve' : ''}
                            className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Approve
                        </button>
                    )}

                {/* Return Button (Senior Coder / Admin Only) */}
                {codingRecord.status === CLINICAL_CODING_STATUS.PENDING_REVIEW && (
                    <button
                        onClick={() => setShowReturnModal(true)}
                        disabled={actionLoading || !canApprove}
                        title={!canApprove ? 'Only senior coders or admins can return' : ''}
                        className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <RotateCcw size={16} />
                        Return for Correction
                    </button>
                )}

                {/* Approved Status Indicator */}
                {codingRecord.status === CLINICAL_CODING_STATUS.APPROVED && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Approved for Billing</span>
                        {codingRecord.approvedAt && (
                            <span className="text-xs text-green-500">
                                on {new Date(codingRecord.approvedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Add Code Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
                        >
                            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
                                <h2 className="text-lg font-bold">Add Procedure Code</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="hover:bg-white/20 p-2 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Search Procedure Code
                                    </label>
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                            placeholder="Type to search..."
                                        />
                                        {searching && (
                                            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                                        )}
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                                            {searchResults.map((code) => (
                                                <button
                                                    key={code._id}
                                                    onClick={() => {
                                                        setSelectedCode(code);
                                                        setSearchResults([]);
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full p-2 text-left hover:bg-indigo-50 border-b border-gray-50 last:border-b-0"
                                                >
                                                    <div className="font-mono font-bold text-indigo-600">{code.code}</div>
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {code.shortDescription || code.description}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Selected Code Display */}
                                {selectedCode && (
                                    <>
                                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-mono font-bold text-indigo-700">{selectedCode.code}</span>
                                                    <span className="ml-2 text-xs text-indigo-500 uppercase">{selectedCode.codeType}</span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">
                                                    ₹{(selectedCode.baseRate || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{selectedCode.description}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={codeFormData.quantity}
                                                    onChange={(e) => setCodeFormData({ ...codeFormData, quantity: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Modifier</label>
                                                <input
                                                    type="text"
                                                    value={codeFormData.modifier}
                                                    onChange={(e) => setCodeFormData({ ...codeFormData, modifier: e.target.value })}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                                    placeholder="e.g., 25, 59"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                            <textarea
                                                value={codeFormData.notes}
                                                onChange={(e) => setCodeFormData({ ...codeFormData, notes: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                                rows="2"
                                                placeholder="Optional notes..."
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddCode}
                                            disabled={actionLoading}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                            Add Code
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Return Reason Modal */}
            <AnimatePresence>
                {showReturnModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setShowReturnModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
                        >
                            <div className="bg-red-500 p-5 text-white flex justify-between items-center">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <RotateCcw size={20} />
                                    Return for Correction
                                </h2>
                                <button
                                    onClick={() => setShowReturnModal(false)}
                                    className="hover:bg-white/20 p-2 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Return Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-red-500"
                                        rows="4"
                                        placeholder="Please explain why this coding is being returned..."
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        This reason will be shown to the coder for correction.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowReturnModal(false)}
                                        className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReturn}
                                        disabled={actionLoading || !returnReason.trim()}
                                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                                        Return
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClinicalCodingTab;
