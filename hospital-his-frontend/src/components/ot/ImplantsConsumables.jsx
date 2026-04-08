import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const ImplantsConsumables = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        itemType: 'implant',
        itemName: '',
        batchNumber: '',
        serialNumber: '',
        quantity: 1,
        unitCost: 0,
        manufacturer: '',
        expiryDate: ''
    });

    useEffect(() => {
        fetchItems();
    }, [surgeryId]);

    const fetchItems = async () => {
        try {
            const res = await surgeryService.getImplantsConsumables(surgeryId);
            setItems(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!form.itemName) {
            toast.error('Enter item name');
            return;
        }
        try {
            await surgeryService.addImplantConsumable(surgeryId, form);
            toast.success('Item Added');
            setForm({
                itemType: 'implant',
                itemName: '',
                batchNumber: '',
                serialNumber: '',
                quantity: 1,
                unitCost: 0,
                manufacturer: '',
                expiryDate: ''
            });
            fetchItems();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to add item');
        }
    };

    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Package className="text-primary" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Implants & Consumables</h3>
            </div>

            {/* Add Form */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-700 mb-3">Add Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        value={form.itemType}
                        onChange={(e) => setForm({ ...form, itemType: e.target.value })}
                    >
                        <option value="implant">Implant</option>
                        <option value="consumable">Consumable</option>
                    </select>
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Item Name *"
                        value={form.itemName}
                        onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                    />
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Batch Number"
                        value={form.batchNumber}
                        onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    />
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Serial Number"
                        value={form.serialNumber}
                        onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                    <input
                        type="number"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Quantity"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                    />
                    <input
                        type="number"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Unit Cost (₹)"
                        value={form.unitCost}
                        onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                    />
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Manufacturer"
                        value={form.manufacturer}
                        onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    />
                    <button
                        onClick={handleAdd}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Item</th>
                            <th className="px-4 py-3 text-left">Batch/Serial</th>
                            <th className="px-4 py-3 text-left">Qty</th>
                            <th className="px-4 py-3 text-left">Unit Cost</th>
                            <th className="px-4 py-3 text-left">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.length === 0 ? (
                            <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-400">No items added</td></tr>
                        ) : (
                            items.map((item, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.itemType === 'implant' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {item.itemType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{item.itemName}</td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {item.batchNumber || '-'} / {item.serialNumber || '-'}
                                    </td>
                                    <td className="px-4 py-3">{item.quantity}</td>
                                    <td className="px-4 py-3">₹{item.unitCost?.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-medium">₹{(item.quantity * item.unitCost).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan="5" className="px-4 py-3 text-right font-semibold">Total:</td>
                                <td className="px-4 py-3 font-bold text-primary">₹{totalCost.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default ImplantsConsumables;
