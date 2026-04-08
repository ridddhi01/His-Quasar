import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package2, Calendar, AlertTriangle, Check, X, Clock } from 'lucide-react';
import pharmacyService from '../../services/pharmacy.service';

/**
 * BatchSelector Component
 * 
 * FEFO (First Expire First Out) batch selection modal.
 * Shows available batches sorted by expiry date.
 * Warns about expiring/low stock batches.
 */

const BatchSelector = ({
    medicineId,
    medicineName,
    quantityNeeded,
    onSelect,
    onClose
}) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [totalSelected, setTotalSelected] = useState(0);

    useEffect(() => {
        const fetchBatches = async () => {
            setLoading(true);
            try {
                const res = await pharmacyService.getBatchesFEFO(medicineId, quantityNeeded);
                setBatches(res.data?.batches || []);

                // Auto-select recommended batches
                if (res.data?.batches) {
                    const autoSelected = res.data.batches.map(b => ({
                        batchId: b.batchId,
                        batchNumber: b.batchNumber,
                        quantity: b.quantityToDispense,
                        expiryDate: b.expiryDate,
                    }));
                    setSelectedBatches(autoSelected);
                    setTotalSelected(autoSelected.reduce((sum, b) => sum + b.quantity, 0));
                }
            } catch (error) {
                console.error('Error fetching batches:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, [medicineId, quantityNeeded]);

    const handleQuantityChange = (batch, newQty) => {
        const qty = Math.min(Math.max(0, parseInt(newQty) || 0), batch.availableQuantity);

        setSelectedBatches(prev => {
            const existing = prev.find(b => b.batchId === batch.batchId);
            if (existing) {
                if (qty === 0) {
                    return prev.filter(b => b.batchId !== batch.batchId);
                }
                return prev.map(b =>
                    b.batchId === batch.batchId
                        ? { ...b, quantity: qty }
                        : b
                );
            } else if (qty > 0) {
                return [...prev, {
                    batchId: batch.batchId,
                    batchNumber: batch.batchNumber,
                    quantity: qty,
                    expiryDate: batch.expiryDate,
                }];
            }
            return prev;
        });
    };

    useEffect(() => {
        setTotalSelected(selectedBatches.reduce((sum, b) => sum + b.quantity, 0));
    }, [selectedBatches]);

    const handleConfirm = () => {
        if (totalSelected < quantityNeeded) {
            if (!confirm(`Only ${totalSelected} of ${quantityNeeded} selected. Continue with partial dispensing?`)) {
                return;
            }
        }
        onSelect(selectedBatches);
    };

    const isExpiringSoon = (date) => {
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        return new Date(date) <= thirtyDays;
    };

    const isLowStock = (qty) => qty < 10;

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Package2 />
                        Select Batches - FEFO
                    </h2>
                    <p className="text-blue-100 mt-1">
                        {medicineName} • Need: {quantityNeeded} units
                    </p>
                </div>

                {/* Batches List */}
                <div className="p-6 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading batches...</div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
                            <AlertTriangle size={48} className="mx-auto text-red-300 mb-4" />
                            <p className="text-red-600 font-medium">No eligible batches available</p>
                            <p className="text-red-400 text-sm">Check for expired or recalled stock</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                <Clock size={16} />
                                Batches sorted by expiry date (FEFO)
                            </div>

                            {batches.map((batch) => {
                                const selected = selectedBatches.find(b => b.batchId === batch.batchId);
                                const expiringSoon = isExpiringSoon(batch.expiryDate);
                                const lowStock = isLowStock(batch.availableQuantity);

                                return (
                                    <div
                                        key={batch.batchId}
                                        className={`p-4 rounded-xl border-2 transition-all ${selected?.quantity > 0
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-800 font-mono">
                                                        {batch.batchNumber}
                                                    </span>
                                                    {expiringSoon && (
                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                            Expiring Soon
                                                        </span>
                                                    )}
                                                    {lowStock && (
                                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                                            Low Stock
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={14} />
                                                        Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                                                    </span>
                                                    <span>
                                                        Available: <b className="text-gray-700">{batch.availableQuantity}</b>
                                                    </span>
                                                    {batch.supplier && (
                                                        <span className="text-gray-400">
                                                            {batch.supplier}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantity Input */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => handleQuantityChange(batch, (selected?.quantity || 0) - 1)}
                                                        className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={batch.availableQuantity}
                                                        value={selected?.quantity || 0}
                                                        onChange={(e) => handleQuantityChange(batch, e.target.value)}
                                                        className="w-16 text-center py-2 border-0 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => handleQuantityChange(batch, (selected?.quantity || 0) + 1)}
                                                        className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Summary Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <span className="text-gray-500">Total Selected:</span>
                            <span className={`ml-2 text-2xl font-bold ${totalSelected >= quantityNeeded
                                    ? 'text-green-600'
                                    : 'text-orange-600'
                                }`}>
                                {totalSelected}
                            </span>
                            <span className="text-gray-400 ml-1">/ {quantityNeeded}</span>
                        </div>

                        {totalSelected < quantityNeeded && (
                            <span className="text-orange-600 text-sm flex items-center gap-1">
                                <AlertTriangle size={16} />
                                Shortfall: {quantityNeeded - totalSelected}
                            </span>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={totalSelected === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check size={18} />
                            Confirm Selection
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default BatchSelector;
