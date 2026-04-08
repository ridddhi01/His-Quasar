import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pill, CheckCircle, Clock, User, FileText, X, Check, Package,
    AlertTriangle, Shield, FileWarning, Calendar
} from 'lucide-react';
import pharmacyService from '../../services/pharmacy.service';
import InventoryManager from '../../components/pharmacy/InventoryManager';
import RecallManagement from '../../components/pharmacy/RecallManagement';
import BatchSelector from '../../components/pharmacy/BatchSelector';
import { SafetyAlerts, OverrideModal } from '../../components/pharmacy/SafetyAlerts';

const Pharmacy = () => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'queue';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Enhanced dispense state
    const [safetyResult, setSafetyResult] = useState(null);
    const [checkingSafety, setCheckingSafety] = useState(false);
    const [selectedBatches, setSelectedBatches] = useState({});
    const [showBatchSelector, setShowBatchSelector] = useState(null);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideComplete, setOverrideComplete] = useState(false);
    const [dispensing, setDispensing] = useState(false);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await pharmacyService.getPendingPrescriptions();
            setQueue(res.data || []);
        } catch (error) {
            console.error("Error fetching pharmacy queue", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'queue') {
            fetchQueue();
            const interval = setInterval(fetchQueue, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    // Run safety check when prescription selected
    const handleSelectPrescription = async (prescription) => {
        setSelectedPrescription(prescription);
        setSafetyResult(null);
        setSelectedBatches({});
        setOverrideComplete(false);
        setCheckingSafety(true);

        try {
            // Run safety validation
            const result = await pharmacyService.validatePrescriptionSafety(prescription._id);
            setSafetyResult(result.data?.safetyResult);

            // Check if override is already complete
            if (result.data?.prescription?.safetyStatus?.overrideComplete) {
                setOverrideComplete(true);
            }
        } catch (error) {
            console.error("Error checking safety:", error);
        } finally {
            setCheckingSafety(false);
        }
    };

    // Handle batch selection for a medicine
    const handleBatchSelected = (medicineId, batches) => {
        setSelectedBatches(prev => ({
            ...prev,
            [medicineId]: batches
        }));
        setShowBatchSelector(null);
    };

    // Handle override submission
    const handleOverride = async (reason) => {
        try {
            await pharmacyService.overrideInteraction(selectedPrescription._id, null, reason);
            setOverrideComplete(true);
            setShowOverrideModal(false);
            alert('Override recorded successfully');
        } catch (error) {
            console.error("Error recording override:", error);
            alert('Failed to record override');
        }
    };

    // Check if ready to dispense
    const canDispense = () => {
        if (!selectedPrescription) return false;
        if (checkingSafety) return false;

        // Check safety
        if (safetyResult?.requiresOverride && !overrideComplete) return false;

        // Check all medicines have batch selected
        const medicines = selectedPrescription.medicines || [];
        for (const med of medicines) {
            const medicineId = med.medicine?._id || med.medicine;
            if (!selectedBatches[medicineId] || selectedBatches[medicineId].length === 0) {
                return false;
            }
        }

        return true;
    };

    // Dispense with safety
    const handleDispense = async () => {
        if (!canDispense()) return;

        setDispensing(true);
        try {
            // Build items array
            const items = [];
            for (const med of selectedPrescription.medicines) {
                const medicineId = med.medicine?._id || med.medicine;
                const batches = selectedBatches[medicineId] || [];

                for (const batch of batches) {
                    items.push({
                        medicineId,
                        batchId: batch.batchId,
                        dispensedQuantity: batch.quantity
                    });
                }
            }

            await pharmacyService.dispensePrescription(selectedPrescription._id, items);
            alert("Medicines Dispensed Successfully!");
            setSelectedPrescription(null);
            setSafetyResult(null);
            setSelectedBatches({});
            fetchQueue();
        } catch (error) {
            console.error("Error dispensing:", error);
            alert(error.response?.data?.error || "Failed to dispense");
        } finally {
            setDispensing(false);
        }
    };

    const filteredQueue = queue.filter(item => {
        const fullName = `${item.patient?.firstName} ${item.patient?.lastName}`.toLowerCase();
        const id = item.patient?.patientId?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || id.includes(search);
    });

    const tabs = [
        { id: 'queue', label: 'Dispensing Queue', icon: Clock },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'recalls', label: 'Recalls', icon: FileWarning },
    ];

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Pill className="text-emerald-500" size={32} /> Pharmacy
                    </h1>
                    <p className="text-gray-500 mt-1">Dispensing, Inventory & Safety Management</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-xl">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Queue Tab */}
            {activeTab === 'queue' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-none">
                                <input
                                    type="text"
                                    placeholder="Search Patient Name or ID..."
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <FileText size={18} className="absolute left-3 top-2.5 text-gray-400" />
                            </div>

                            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg text-emerald-700 font-medium whitespace-nowrap">
                                <Clock size={18} />
                                <span>Pending: {filteredQueue.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading && queue.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-400">Loading queue...</div>
                        ) : filteredQueue.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <CheckCircle size={48} className="mx-auto text-emerald-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">
                                    {searchTerm ? 'No matches found.' : 'All Clear!'}
                                </h3>
                                <p className="text-gray-400">
                                    {searchTerm ? 'Try a different search term.' : 'No pending prescriptions at the moment.'}
                                </p>
                            </div>
                        ) : (
                            filteredQueue.map((item) => (
                                <motion.div
                                    key={item._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    layout
                                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    onClick={() => handleSelectPrescription(item)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {item.prescriptionNumber || `Rx #${item._id.slice(-6)}`}
                                        </span>
                                        {item.safetyStatus?.hasMajorInteractions && (
                                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                <AlertTriangle size={12} /> Alert
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
                                        <User size={18} className="text-gray-400" />
                                        {item.patient?.firstName} {item.patient?.lastName}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 pl-6">{item.patient?.patientId}</p>

                                    <div className="border-t border-gray-50 pt-4 flex justify-between items-center">
                                        <div className="text-xs text-gray-500">
                                            {item.medicines?.length || 0} medicine(s)
                                        </div>
                                        <button className="text-emerald-500 font-medium text-sm group-hover:underline flex items-center gap-1">
                                            Dispense <Pill size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <InventoryManager />
                </div>
            )}

            {/* Recalls Tab */}
            {activeTab === 'recalls' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <RecallManagement />
                </div>
            )}

            {/* Enhanced Dispensing Modal */}
            <AnimatePresence>
                {selectedPrescription && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPrescription(null)}></div>

                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-emerald-600 p-6 text-white flex-shrink-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Pill className="text-emerald-200" /> Dispense Medicines
                                        </h2>
                                        <p className="text-emerald-100 mt-1">
                                            {selectedPrescription.patient?.firstName} {selectedPrescription.patient?.lastName}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedPrescription(null)} className="p-2 bg-emerald-700/50 rounded-full hover:bg-emerald-700 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {/* Safety Alerts Section */}
                                {checkingSafety ? (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                                        <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                        <span className="text-gray-600">Running safety checks...</span>
                                    </div>
                                ) : safetyResult && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Shield size={16} />
                                            Safety Check Results
                                        </h3>
                                        <SafetyAlerts
                                            interactions={safetyResult.interactions || []}
                                            allergyConflicts={safetyResult.allergyConflicts || []}
                                            hasMajor={safetyResult.hasMajor}
                                            showOverrideButton={true}
                                            overrideComplete={overrideComplete}
                                            onOverride={() => setShowOverrideModal(true)}
                                        />
                                    </div>
                                )}

                                {/* Medicines List with Batch Selection */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Medicines & Batch Selection
                                    </h3>

                                    <div className="space-y-3">
                                        {(selectedPrescription.medicines || []).map((med, idx) => {
                                            const medicineId = med.medicine?._id || med.medicine;
                                            const medicineName = med.medicine?.name || 'Unknown';
                                            const batches = selectedBatches[medicineId] || [];
                                            const totalSelected = batches.reduce((sum, b) => sum + b.quantity, 0);

                                            return (
                                                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold text-slate-800">{medicineName}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {med.dosage} • {med.frequency} • {med.duration}
                                                            </div>
                                                            <div className="text-sm text-emerald-600 font-medium mt-1">
                                                                Need: {med.quantity} units
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <button
                                                                onClick={() => setShowBatchSelector({ medicineId, medicineName, quantity: med.quantity })}
                                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${totalSelected >= med.quantity
                                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                                        : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                                                                    }`}
                                                            >
                                                                {totalSelected > 0 ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Check size={14} />
                                                                        {totalSelected} selected
                                                                    </span>
                                                                ) : (
                                                                    'Select Batches'
                                                                )}
                                                            </button>
                                                            {batches.length > 0 && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {batches.map(b => b.batchNumber).join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
                                <div className="text-sm text-gray-500">
                                    {safetyResult?.requiresOverride && !overrideComplete && (
                                        <span className="text-red-600 flex items-center gap-1">
                                            <AlertTriangle size={16} />
                                            Override required before dispensing
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedPrescription(null)}
                                        className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDispense}
                                        disabled={!canDispense() || dispensing}
                                        className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {dispensing ? (
                                            'Dispensing...'
                                        ) : (
                                            <>
                                                <Check size={20} /> Dispense
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Batch Selector Modal */}
            <AnimatePresence>
                {showBatchSelector && (
                    <BatchSelector
                        medicineId={showBatchSelector.medicineId}
                        medicineName={showBatchSelector.medicineName}
                        quantityNeeded={showBatchSelector.quantity}
                        onSelect={(batches) => handleBatchSelected(showBatchSelector.medicineId, batches)}
                        onClose={() => setShowBatchSelector(null)}
                    />
                )}
            </AnimatePresence>

            {/* Override Modal */}
            <AnimatePresence>
                {showOverrideModal && (
                    <OverrideModal
                        onSubmit={handleOverride}
                        onClose={() => setShowOverrideModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Pharmacy;
