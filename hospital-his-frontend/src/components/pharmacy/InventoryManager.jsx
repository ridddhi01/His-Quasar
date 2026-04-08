import React, { useEffect, useState } from 'react';
import { Plus, Search, Package, AlertTriangle, Calendar, DollarSign, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import pharmacyService from '../../services/pharmacy.service';

const InventoryManager = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        genericName: '',
        category: 'Tablet',
        batchNumber: '',
        expiryDate: '',
        quantity: '',
        purchaseRate: '',
        sellingRate: '',
        medicineCode: ''
    });

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await pharmacyService.getInventory(searchTerm);
            setInventory(res.data || []);
        } catch (error) {
            console.error("Error fetching inventory", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchInventory();
        }, 500); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await pharmacyService.addInventory(newItem);
            alert("Inventory Added Successfully!");
            setShowAddModal(false);
            setNewItem({
                name: '', genericName: '', category: 'Tablet', batchNumber: '',
                expiryDate: '', quantity: '', purchaseRate: '', sellingRate: '', medicineCode: ''
            });
            fetchInventory();
        } catch (error) {
            console.error("Error adding inventory", error);
            alert("Failed to add inventory. Check console.");
        }
    };

    const getStatusColor = (status, quantity) => {
        if (status === 'Expired') return 'bg-red-100 text-red-700 border-red-200';
        if (quantity === 0 || status === 'Out of Stock') return 'bg-gray-100 text-gray-700 border-gray-200';
        if (quantity < 10 || status === 'Low Stock') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search medicines, generic names, or batches..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-200"
                >
                    <Plus size={20} /> Add Stock
                </button>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Medicine Name</th>
                            <th className="px-6 py-4">Batch / Expiry</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-right">Price (MRP)</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-10 text-gray-400">Loading inventory...</td></tr>
                        ) : inventory.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-10 text-gray-400">No inventory found.</td></tr>
                        ) : (
                            inventory.map((item) => (
                                <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{item.medicine?.name}</div>
                                        <div className="text-xs text-gray-500">{item.medicine?.genericName} • {item.medicine?.category}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm font-mono text-slate-600">
                                            <Package size={14} className="text-gray-400" /> {item.batchNumber}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Calendar size={12} /> {new Date(item.expiryDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-slate-700">{item.quantity}</span>
                                        <span className="text-xs text-gray-400 ml-1">{item.medicine?.unit || 'units'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                                        ₹{item.sellingRate}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status, item.quantity)}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            {item.status || (item.quantity === 0 ? 'Out of Stock' : 'Active')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-emerald-600 transition-colors">
                                            <Filter size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Stock Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Plus className="bg-white/20 p-1 rounded-lg" size={32} /> Add New Stock
                                </h2>
                                <button onClick={() => setShowAddModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                                    <AlertTriangle size={20} className="rotate-45" /> {/* Close Icon substitute */}
                                </button>
                            </div>

                            <form onSubmit={handleAddItem} className="p-8 space-y-6">
                                {/* Medicine Details Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Medicine Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
                                            <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.genericName} onChange={e => setNewItem({ ...newItem, genericName: e.target.value })} placeholder="e.g. Acetaminophen" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                                <option>Tablet</option>
                                                <option>Syrup</option>
                                                <option>Injection</option>
                                                <option>Capsule</option>
                                                <option>Cream</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Batch Details Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                                        <Package size={16} /> Batch Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                                            <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                                                value={newItem.batchNumber} onChange={e => setNewItem({ ...newItem, batchNumber: e.target.value })} placeholder="BATCH-001" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                            <input type="date" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.expiryDate} onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                            <input type="number" required min="1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} placeholder="0" />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
                                        <DollarSign size={16} /> Pricing
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Rate</label>
                                            <input type="number" required min="0" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.purchaseRate} onChange={e => setNewItem({ ...newItem, purchaseRate: e.target.value })} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (MRP)</label>
                                            <input type="number" required min="0" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newItem.sellingRate} onChange={e => setNewItem({ ...newItem, sellingRate: e.target.value })} placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all">
                                        Save Inventory
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InventoryManager;
