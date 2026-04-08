import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, CheckCircle2, Clock, XCircle, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const PostOpOrders = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        orderType: 'medication',
        description: '',
        frequency: '',
        duration: ''
    });

    useEffect(() => {
        fetchOrders();
    }, [surgeryId]);

    const fetchOrders = async () => {
        try {
            const res = await surgeryService.getPostOpOrders(surgeryId);
            setOrders(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrder = async () => {
        if (!form.description.trim()) {
            toast.error('Enter order description');
            return;
        }
        try {
            await surgeryService.addPostOpOrder(surgeryId, form);
            toast.success('Order Added');
            setForm({ orderType: 'medication', description: '', frequency: '', duration: '' });
            fetchOrders();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to add order');
        }
    };

    const handleUpdateStatus = async (index, status) => {
        try {
            await surgeryService.updatePostOpOrderStatus(surgeryId, index, status);
            toast.success('Status Updated');
            fetchOrders();
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'pending': 'bg-yellow-100 text-yellow-700',
            'executed': 'bg-green-100 text-green-700',
            'cancelled': 'bg-red-100 text-red-700'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status]}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <ClipboardList className="text-primary" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Post-Operative Orders</h3>
            </div>

            {/* Add Order Form */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        value={form.orderType}
                        onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                    >
                        <option value="medication">Medication</option>
                        <option value="investigation">Investigation</option>
                        <option value="diet">Diet</option>
                        <option value="activity">Activity</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="other">Other</option>
                    </select>
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg md:col-span-2"
                        placeholder="Description *"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <button
                        onClick={handleAddOrder}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium"
                    >
                        <Plus size={16} /> Add Order
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Frequency (e.g., TDS, BD)"
                        value={form.frequency}
                        onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    />
                    <input
                        type="text"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                        placeholder="Duration (e.g., 5 days)"
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
                {orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No orders added</div>
                ) : (
                    orders.map((order, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                        {order.orderType}
                                    </span>
                                    {getStatusBadge(order.status)}
                                </div>
                                <p className="font-medium text-slate-700">{order.description}</p>
                                <p className="text-sm text-gray-500">
                                    {order.frequency && `${order.frequency}`}
                                    {order.duration && ` • ${order.duration}`}
                                </p>
                            </div>
                            {order.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateStatus(i, 'executed')}
                                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                        title="Mark Executed"
                                    >
                                        <CheckCircle2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(i, 'cancelled')}
                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                        title="Cancel"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PostOpOrders;
