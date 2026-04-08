import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, Package2, Users, Bell, Check, X,
    Search, Filter, ChevronDown, Clock, FileWarning,
    Mail, Phone, CheckCircle2, XCircle
} from 'lucide-react';
import pharmacyService from '../../services/pharmacy.service';

/**
 * RecallManagement Component
 * 
 * Full Drug Recall Dashboard:
 * - View active/resolved recalls
 * - Initiate new recalls
 * - View affected patients
 * - Send notifications
 */

const RecallManagement = () => {
    const [recalls, setRecalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('active');
    const [selectedRecall, setSelectedRecall] = useState(null);
    const [showNewRecallModal, setShowNewRecallModal] = useState(false);
    const [affectedPatients, setAffectedPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);

    // Fetch recalls
    const fetchRecalls = async () => {
        setLoading(true);
        try {
            const res = await pharmacyService.getRecalls(statusFilter);
            setRecalls(res.data || []);
        } catch (error) {
            console.error('Error fetching recalls:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecalls();
    }, [statusFilter]);

    // Fetch affected patients when recall selected
    const handleSelectRecall = async (recall) => {
        setSelectedRecall(recall);
        setLoadingPatients(true);
        try {
            const res = await pharmacyService.getAffectedPatients(recall._id);
            setAffectedPatients(res.data || []);
        } catch (error) {
            console.error('Error fetching affected patients:', error);
        } finally {
            setLoadingPatients(false);
        }
    };

    // Send notifications
    const handleSendNotifications = async () => {
        if (!selectedRecall) return;
        try {
            await pharmacyService.notifyRecallPatients(selectedRecall._id);
            alert('Notifications sent successfully!');
            handleSelectRecall(selectedRecall); // Refresh data
        } catch (error) {
            console.error('Error sending notifications:', error);
            alert('Failed to send notifications');
        }
    };

    // Resolve recall
    const handleResolveRecall = async (notes) => {
        if (!selectedRecall) return;
        try {
            await pharmacyService.resolveRecall(selectedRecall._id, notes);
            alert('Recall resolved!');
            setSelectedRecall(null);
            fetchRecalls();
        } catch (error) {
            console.error('Error resolving recall:', error);
            alert('Failed to resolve recall');
        }
    };

    const getClassBadge = (recallClass) => {
        const badges = {
            'class-i': 'bg-red-100 text-red-700 border-red-200',
            'class-ii': 'bg-orange-100 text-orange-700 border-orange-200',
            'class-iii': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };
        return badges[recallClass] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileWarning className="text-red-500" />
                        Drug Recall Management
                    </h2>
                    <p className="text-gray-500">Manage drug recalls and notify affected patients</p>
                </div>
                <button
                    onClick={() => setShowNewRecallModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <AlertTriangle size={18} />
                    Initiate Recall
                </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {['active', 'resolved', 'all'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${statusFilter === status
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recalls List */}
                <div className="lg:col-span-1 space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading recalls...</div>
                    ) : recalls.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                            <CheckCircle2 size={48} className="mx-auto text-green-300 mb-4" />
                            <p className="text-gray-500">No {statusFilter} recalls</p>
                        </div>
                    ) : (
                        recalls.map((recall) => (
                            <motion.div
                                key={recall._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleSelectRecall(recall)}
                                className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${selectedRecall?._id === recall._id
                                    ? 'border-red-400 shadow-md'
                                    : 'border-gray-100'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getClassBadge(recall.recallClass)}`}>
                                        {recall.recallClass?.replace('-', ' ').toUpperCase() || 'RECALL'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(recall.recallDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 mb-1">
                                    {recall.medicine?.name || 'Unknown Medicine'}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{recall.reason}</p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Package2 size={14} />
                                        {recall.recalledBatches?.length || 0} batches
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users size={14} />
                                        {recall.affectedPatients?.length || 0} patients
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Recall Details + Affected Patients */}
                <div className="lg:col-span-2">
                    {selectedRecall ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Detail Header */}
                            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">
                                            {selectedRecall.medicine?.name}
                                        </h3>
                                        <p className="text-red-100">
                                            Recall #{selectedRecall.recallNumber}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedRecall.status === 'active'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-green-400 text-green-900'
                                        }`}>
                                        {selectedRecall.status}
                                    </span>
                                </div>
                            </div>

                            {/* Batches */}
                            <div className="p-6 border-b border-gray-100">
                                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Package2 size={18} />
                                    Recalled Batches
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRecall.recalledBatches?.map((batch, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100"
                                        >
                                            {batch.batchNumber}
                                            <span className="text-red-400 ml-2">
                                                ({batch.quantityAtRecall} units)
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="p-6 border-b border-gray-100">
                                <h4 className="font-bold text-gray-700 mb-2">Recall Reason</h4>
                                <p className="text-gray-600">{selectedRecall.reason}</p>
                                {selectedRecall.regulatoryReference && (
                                    <p className="text-sm text-gray-400 mt-2">
                                        Regulatory Ref: {selectedRecall.regulatoryReference}
                                    </p>
                                )}
                            </div>

                            {/* Affected Patients */}
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                        <Users size={18} />
                                        Affected Patients ({affectedPatients.length})
                                    </h4>
                                    {selectedRecall.status === 'active' && (
                                        <button
                                            onClick={handleSendNotifications}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            <Bell size={16} />
                                            Send Notifications
                                        </button>
                                    )}
                                </div>

                                {loadingPatients ? (
                                    <div className="text-center py-8 text-gray-400">Loading patients...</div>
                                ) : affectedPatients.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                                        No patients affected by this recall
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {affectedPatients.map((ap, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {ap.patient?.firstName} {ap.patient?.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {ap.patient?.patientId} • Batch: {ap.batchNumber}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {ap.notified ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-sm">
                                                            <CheckCircle2 size={16} />
                                                            Notified
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                                                            <Clock size={16} />
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {selectedRecall.status === 'active' && (
                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={() => {
                                            const notes = prompt('Enter resolution notes:');
                                            if (notes) handleResolveRecall(notes);
                                        }}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <Check size={18} />
                                        Resolve Recall
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <div className="text-center p-12">
                                <FileWarning size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-400">Select a recall to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Recall Modal */}
            <AnimatePresence>
                {showNewRecallModal && (
                    <NewRecallModal
                        onClose={() => setShowNewRecallModal(false)}
                        onSuccess={() => {
                            setShowNewRecallModal(false);
                            fetchRecalls();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * New Recall Modal Component
 */
const NewRecallModal = ({ onClose, onSuccess }) => {
    const [medicines, setMedicines] = useState([]);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [batches, setBatches] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [reason, setReason] = useState('');
    const [recallClass, setRecallClass] = useState('class-ii');
    const [regulatoryRef, setRegulatoryRef] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Search medicines
    useEffect(() => {
        const searchMedicines = async () => {
            if (searchTerm.length < 2) return;
            try {
                const res = await pharmacyService.getInventory(searchTerm);
                // Group by medicine
                const uniqueMeds = {};
                res.data?.forEach(item => {
                    if (!uniqueMeds[item.medicine._id]) {
                        uniqueMeds[item.medicine._id] = item.medicine;
                    }
                });
                setMedicines(Object.values(uniqueMeds));
            } catch (error) {
                console.error('Error searching medicines:', error);
            }
        };
        const debounce = setTimeout(searchMedicines, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

    // Fetch batches when medicine selected
    useEffect(() => {
        const fetchBatches = async () => {
            if (!selectedMedicine) {
                setBatches([]);
                return;
            }
            try {
                const res = await pharmacyService.getInventory();
                const filtered = res.data?.filter(b => b.medicine?._id === selectedMedicine) || [];
                setBatches(filtered);
            } catch (error) {
                console.error('Error fetching batches:', error);
            }
        };
        fetchBatches();
    }, [selectedMedicine]);

    const toggleBatch = (batchNumber) => {
        setSelectedBatches(prev =>
            prev.includes(batchNumber)
                ? prev.filter(b => b !== batchNumber)
                : [...prev, batchNumber]
        );
    };

    const handleSubmit = async () => {
        if (!selectedMedicine || selectedBatches.length === 0 || !reason) {
            alert('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            await pharmacyService.initiateRecall({
                medicineId: selectedMedicine,
                batches: selectedBatches.map(b => ({ batchNumber: b })),
                reason,
                recallClass,
                regulatoryReference: regulatoryRef,
            });
            onSuccess();
        } catch (error) {
            console.error('Error initiating recall:', error);
            alert('Failed to initiate recall');
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle />
                        Initiate Drug Recall
                    </h2>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Medicine Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Medicine *
                        </label>
                        <input
                            type="text"
                            placeholder="Search medicine..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                        {medicines.length > 0 && (
                            <div className="mt-2 border border-gray-100 rounded-lg max-h-32 overflow-y-auto">
                                {medicines.map((med) => (
                                    <div
                                        key={med._id}
                                        onClick={() => {
                                            setSelectedMedicine(med._id);
                                            setSearchTerm(med.name);
                                            setMedicines([]);
                                        }}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${selectedMedicine === med._id ? 'bg-red-50 text-red-700' : ''
                                            }`}
                                    >
                                        {med.name} <span className="text-gray-400">({med.genericName})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Batch Selection */}
                    {batches.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Batches to Recall *
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {batches.map((batch) => (
                                    <button
                                        key={batch._id}
                                        onClick={() => toggleBatch(batch.batchNumber)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedBatches.includes(batch.batchNumber)
                                            ? 'bg-red-100 text-red-700 border-red-300'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        {batch.batchNumber}
                                        <span className="text-xs text-gray-400 ml-1">
                                            (Qty: {batch.quantity})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recall Class */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recall Classification
                        </label>
                        <select
                            value={recallClass}
                            onChange={(e) => setRecallClass(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        >
                            <option value="class-i">Class I - Serious Health Hazard</option>
                            <option value="class-ii">Class II - Temporary Health Problems</option>
                            <option value="class-iii">Class III - Low Risk</option>
                        </select>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recall Reason *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe the reason for this recall..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                    </div>

                    {/* Regulatory Reference */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Regulatory Reference (Optional)
                        </label>
                        <input
                            type="text"
                            value={regulatoryRef}
                            onChange={(e) => setRegulatoryRef(e.target.value)}
                            placeholder="FDA/CDSCO reference number"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                        disabled={loading || selectedBatches.length === 0}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <AlertTriangle size={18} />
                                Initiate Recall
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default RecallManagement;
