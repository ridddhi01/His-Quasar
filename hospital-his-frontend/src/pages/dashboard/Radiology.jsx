import React, { useState, useEffect } from 'react';
import radiologyService from '../../services/radiology.service';
import {
    Scan, Clock, CheckCircle, AlertCircle,
    Calendar, FileText, Eye, Plus, X,
    Activity, Image, Search, Filter
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Status badge colors
const STATUS_COLORS = {
    ordered: 'bg-blue-100 text-blue-700 border-blue-200',
    scheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'in-progress': 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

// Modality icons/colors
const MODALITY_CONFIG = {
    xray: { label: 'X-Ray', color: '#3B82F6' },
    ct: { label: 'CT Scan', color: '#8B5CF6' },
    mri: { label: 'MRI', color: '#EC4899' },
    ultrasound: { label: 'Ultrasound', color: '#10B981' },
    pet: { label: 'PET Scan', color: '#F59E0B' },
    mammography: { label: 'Mammography', color: '#EF4444' },
    fluoroscopy: { label: 'Fluoroscopy', color: '#06B6D4' },
    other: { label: 'Other', color: '#6B7280' },
};

const Radiology = () => {
    const [activeTab, setActiveTab] = useState('queue');
    const [orders, setOrders] = useState([]);
    const [queue, setQueue] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, queueRes, dashRes, testsRes] = await Promise.all([
                radiologyService.getOrders(),
                radiologyService.getQueue(),
                radiologyService.getDashboard(),
                radiologyService.getTests()
            ]);
            setOrders(ordersRes.data || []);
            setQueue(queueRes.data || []);
            setDashboard(dashRes.data || {});
            setTests(testsRes.data || []);
        } catch (error) {
            console.error('Failed to load radiology data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Schedule a test
    const handleSchedule = async (orderId, scheduledAt) => {
        try {
            await radiologyService.scheduleTest(orderId, scheduledAt);
            setShowScheduleModal(false);
            setSelectedOrder(null);
            fetchData();
        } catch (error) {
            alert('Failed to schedule: ' + (error.response?.data?.message || error.message));
        }
    };

    // Submit report
    const handleReportSubmit = async (orderId, reportData) => {
        try {
            await radiologyService.enterReport(orderId, reportData);
            setShowReportModal(false);
            setSelectedOrder(null);
            fetchData();
        } catch (error) {
            alert('Failed to submit report: ' + (error.response?.data?.message || error.message));
        }
    };

    // Filter orders
    const filteredOrders = orders.filter(o =>
        statusFilter === 'all' ? true : o.status === statusFilter
    );

    // Prepare modality chart data
    const modalityChartData = dashboard?.modalityBreakdown
        ? Object.entries(dashboard.modalityBreakdown).map(([key, value]) => ({
            name: MODALITY_CONFIG[key]?.label || key,
            value,
            color: MODALITY_CONFIG[key]?.color || '#6B7280'
        }))
        : [];

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading Radiology Module...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Scan className="text-primary" />
                        Radiology & Imaging
                    </h1>
                    <p className="text-gray-500 text-sm">Manage imaging orders, scheduling, and reports</p>
                </div>
            </div>

            {/* Dashboard KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Pending Orders</span>
                        <Clock size={16} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">{dashboard?.pending || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Completed Today</span>
                        <CheckCircle size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{dashboard?.completedToday || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">In Queue</span>
                        <Activity size={16} className="text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{queue.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Available Tests</span>
                        <Image size={16} className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{tests.length}</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Orders/Queue List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        {[
                            { id: 'queue', label: 'Work Queue', icon: Activity },
                            { id: 'orders', label: 'All Orders', icon: FileText },
                            { id: 'tests', label: 'Test Catalog', icon: Scan },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Queue Tab */}
                    {activeTab === 'queue' && (
                        <div className="divide-y divide-slate-100">
                            {queue.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
                                    <p>No pending items in the queue</p>
                                </div>
                            ) : (
                                queue.map(item => (
                                    <div key={item._id} className="p-4 hover:bg-slate-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}
                                                style={{ backgroundColor: MODALITY_CONFIG[item.test?.modality]?.color || '#6B7280' }}>
                                                {item.test?.modality?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {item.patient?.firstName} {item.patient?.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {item.test?.testName} • {item.testNumber}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[item.status]}`}>
                                                {item.status?.toUpperCase()}
                                            </span>
                                            {item.status === 'ordered' && (
                                                <button
                                                    onClick={() => { setSelectedOrder(item); setShowScheduleModal(true); }}
                                                    className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                                                >
                                                    Schedule
                                                </button>
                                            )}
                                            {item.status === 'scheduled' && (
                                                <button
                                                    onClick={() => { setSelectedOrder(item); setShowReportModal(true); }}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                                                >
                                                    Enter Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* All Orders Tab */}
                    {activeTab === 'orders' && (
                        <>
                            {/* Filter Bar */}
                            <div className="p-4 border-b border-gray-100 flex gap-2">
                                {['all', 'ordered', 'scheduled', 'in-progress', 'completed'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {status.replace('-', ' ').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-gray-600">Test #</th>
                                            <th className="px-4 py-3 text-gray-600">Patient</th>
                                            <th className="px-4 py-3 text-gray-600">Test</th>
                                            <th className="px-4 py-3 text-gray-600">Modality</th>
                                            <th className="px-4 py-3 text-gray-600">Status</th>
                                            <th className="px-4 py-3 text-gray-600">Date</th>
                                            <th className="px-4 py-3 text-gray-600 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                                    No orders found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOrders.map(order => (
                                                <tr key={order._id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-mono text-xs">{order.testNumber}</td>
                                                    <td className="px-4 py-3">
                                                        {order.patient?.firstName} {order.patient?.lastName}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{order.test?.testName}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded text-xs text-white"
                                                            style={{ backgroundColor: MODALITY_CONFIG[order.test?.modality]?.color }}>
                                                            {MODALITY_CONFIG[order.test?.modality]?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                                                            {order.status?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {order.status === 'completed' && (
                                                            <button
                                                                onClick={() => setSelectedOrder(order)}
                                                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                                                                title="View Report"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Test Catalog Tab */}
                    {activeTab === 'tests' && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tests.map(test => (
                                <div key={test._id} className="p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">{test.testName}</h4>
                                            <p className="text-sm text-gray-500">{test.testCode} • {test.bodyPart}</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-xs text-white"
                                            style={{ backgroundColor: MODALITY_CONFIG[test.modality]?.color }}>
                                            {MODALITY_CONFIG[test.modality]?.label}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center text-sm">
                                        <span className="text-gray-500">
                                            <Clock size={14} className="inline mr-1" />
                                            {test.duration} min
                                        </span>
                                        <span className="font-bold text-green-600">₹{test.price}</span>
                                    </div>
                                    {test.contrastRequired && (
                                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                                            <AlertCircle size={12} className="inline mr-1" />
                                            Contrast Required
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Modality Chart & Selected Order Details */}
                <div className="space-y-6">
                    {/* Modality Breakdown Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-gray-700 mb-4">Modality Distribution</h3>
                        {modalityChartData.length > 0 ? (
                            <>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={modalityChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {modalityChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {modalityChartData.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                <span className="text-gray-600">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 py-8">No data available</div>
                        )}
                    </div>

                    {/* Selected Order Details */}
                    {selectedOrder && selectedOrder.status === 'completed' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-gray-700">Report Details</h3>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Test:</span>
                                    <p className="font-medium text-gray-800">{selectedOrder.test?.testName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Patient:</span>
                                    <p className="font-medium text-gray-800">
                                        {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Findings:</span>
                                    <p className="text-gray-700 bg-slate-50 p-2 rounded mt-1">
                                        {selectedOrder.findings || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Impression:</span>
                                    <p className="text-gray-700 bg-slate-50 p-2 rounded mt-1">
                                        {selectedOrder.impression || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Recommendations:</span>
                                    <p className="text-gray-700 bg-slate-50 p-2 rounded mt-1">
                                        {selectedOrder.recommendations || 'N/A'}
                                    </p>
                                </div>
                                {selectedOrder.images?.length > 0 && (
                                    <div>
                                        <span className="text-gray-500">Images:</span>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {selectedOrder.images.map((img, idx) => (
                                                <a
                                                    key={idx}
                                                    href={img}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 hover:bg-gray-300"
                                                >
                                                    <Image size={24} />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Schedule Test</h3>
                            <button onClick={() => { setShowScheduleModal(false); setSelectedOrder(null); }}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                Test: <span className="font-medium">{selectedOrder.test?.testName}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Patient: <span className="font-medium">{selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</span>
                            </p>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const scheduledAt = e.target.scheduledAt.value;
                            handleSchedule(selectedOrder._id, scheduledAt);
                        }}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label>
                            <input
                                type="datetime-local"
                                name="scheduledAt"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowScheduleModal(false); setSelectedOrder(null); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                                    Confirm Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Report Entry Modal */}
            {showReportModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Enter Radiology Report</h3>
                            <button onClick={() => { setShowReportModal(false); setSelectedOrder(null); }}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">{selectedOrder.test?.testName}</span> for{' '}
                                <span className="font-medium">{selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</span>
                            </p>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            handleReportSubmit(selectedOrder._id, {
                                findings: formData.get('findings'),
                                impression: formData.get('impression'),
                                recommendations: formData.get('recommendations'),
                            });
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Findings *</label>
                                    <textarea
                                        name="findings"
                                        rows="4"
                                        required
                                        placeholder="Enter detailed findings..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Impression *</label>
                                    <textarea
                                        name="impression"
                                        rows="3"
                                        required
                                        placeholder="Enter clinical impression..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                                    <textarea
                                        name="recommendations"
                                        rows="2"
                                        placeholder="Any follow-up recommendations..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowReportModal(false); setSelectedOrder(null); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                    Submit Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Radiology;
