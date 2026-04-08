import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Clock, CheckCircle, AlertCircle, AlertTriangle, User, TestTube, X, Check, Loader } from 'lucide-react';
import labService from '../../services/lab.service';

const Laboratory = () => {
    const [activeTab, setActiveTab] = useState('queue');
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ pending: 0, completedToday: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultData, setResultData] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [queueRes, dashRes] = await Promise.all([
                labService.getQueue(),
                labService.getDashboard()
            ]);
            setQueue(queueRes.data || []);
            setStats(dashRes.data || { pending: 0, completedToday: 0 });
        } catch (error) {
            console.error("Error fetching lab data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCollectSample = async (orderId) => {
        try {
            await labService.collectSample(orderId);
            fetchData(); // Refresh queue
        } catch (error) {
            console.error("Error collecting sample", error);
            alert("Failed to collect sample");
        }
    };

    const openResultEntry = async (order) => {
        try {
            const res = await labService.getOrderById(order._id);
            setSelectedOrder(res.data);
            // Initialize result fields from test parameters
            const params = res.data.test?.parameters || [];
            setResultData(params.map(p => ({
                parameter: p.name,
                value: '',
                unit: p.unit || '',
                normalRange: p.normalRange || '',
                criticalLow: p.criticalLow,
                criticalHigh: p.criticalHigh,
                isAbnormal: false,
                isCritical: false
            })));
            setRemarks('');
            setShowResultModal(true);
        } catch (error) {
            console.error("Error fetching order details", error);
        }
    };

    const handleResultChange = (index, value) => {
        const updated = [...resultData];
        updated[index].value = value;

        // Auto-detect status
        const range = updated[index].normalRange;
        const critLow = updated[index].criticalLow;
        const critHigh = updated[index].criticalHigh;

        if (value) {
            const numVal = parseFloat(value);

            // Check Critical
            if ((critLow !== undefined && numVal < critLow) || (critHigh !== undefined && numVal > critHigh)) {
                updated[index].isCritical = true;
                updated[index].isAbnormal = true; // Critical is also abnormal
            } else {
                updated[index].isCritical = false;

                // Check Abnormal (Standard)
                if (range) {
                    const parts = range.split('-').map(s => parseFloat(s.trim()));
                    if (parts.length === 2) {
                        updated[index].isAbnormal = numVal < parts[0] || numVal > parts[1];
                    }
                }
            }
        } else {
            updated[index].isCritical = false;
            updated[index].isAbnormal = false;
        }

        setResultData(updated);
    };

    const handleSubmitResults = async () => {
        if (!selectedOrder) return;

        // Check for critical values
        const criticalCount = resultData.filter(r => r.isCritical).length;
        if (criticalCount > 0) {
            const confirm = window.confirm(
                `⚠️ CRITICAL ALERT ⚠️\n\n${criticalCount} value(s) are in the CRITICAL RANGE.\nThis indicates a potentially life-threatening situation.\n\nAre you sure you want to save these results?`
            );
            if (!confirm) return;
        }

        setSubmitting(true);
        try {
            await labService.enterResults(selectedOrder._id, resultData, remarks);
            alert("Results saved successfully!");
            setShowResultModal(false);
            setPdfFile(null);
            fetchData();
        } catch (error) {
            console.error("Error saving results", error);
            alert("Failed to save results");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadPdf = async () => {
        if (!selectedOrder || !pdfFile) return;
        setUploading(true);
        try {
            await labService.uploadReport(selectedOrder._id, pdfFile);
            alert("PDF uploaded and AI summary generated!");
            setPdfFile(null);
        } catch (error) {
            console.error("Error uploading PDF", error);
            alert("Failed to upload PDF");
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'ordered': 'bg-blue-50 text-blue-600 border-blue-100',
            'sample-collected': 'bg-amber-50 text-amber-600 border-amber-100',
            'in-progress': 'bg-purple-50 text-purple-600 border-purple-100',
            'completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        };
        const labels = {
            'ordered': 'Ordered',
            'sample-collected': 'Sample Collected',
            'in-progress': 'In Progress',
            'completed': 'Completed',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                        <FlaskConical size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Laboratory</h1>
                        <p className="text-gray-500 text-sm">Lab Test Management</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Clock size={20} /></div>
                        <div>
                            <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
                            <div className="text-xs text-gray-500">Pending Tests</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500"><CheckCircle size={20} /></div>
                        <div>
                            <div className="text-2xl font-bold text-slate-800">{stats.completedToday}</div>
                            <div className="text-xs text-gray-500">Completed Today</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-500"><AlertCircle size={20} /></div>
                        <div>
                            <div className="text-2xl font-bold text-slate-800">{queue.filter(q => q.status === 'ordered').length}</div>
                            <div className="text-xs text-gray-500">Awaiting Sample</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Queue Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800">Work Queue</h2>
                    <button onClick={fetchData} className="text-sm text-gray-500 hover:text-primary">Refresh</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Test #</th>
                                <th className="px-6 py-4">Patient</th>
                                <th className="px-6 py-4">Test Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Ordered</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-10 text-gray-400">Loading queue...</td></tr>
                            ) : queue.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-10 text-gray-400">No pending tests in queue.</td></tr>
                            ) : (
                                queue.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{order.testNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {order.patient?.firstName?.[0]}{order.patient?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-700">{order.patient?.firstName} {order.patient?.lastName}</div>
                                                    <div className="text-xs text-gray-400">{order.patient?.patientId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{order.test?.testName || 'Unknown Test'}</td>
                                        <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            {order.status === 'ordered' && (
                                                <button
                                                    onClick={() => handleCollectSample(order._id)}
                                                    className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                                                >
                                                    Collect Sample
                                                </button>
                                            )}
                                            {order.status === 'sample-collected' && (
                                                <button
                                                    onClick={() => openResultEntry(order)}
                                                    className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition-colors"
                                                >
                                                    Enter Results
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Result Entry Modal */}
            <AnimatePresence>
                {showResultModal && selectedOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResultModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="bg-purple-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <TestTube size={24} /> Enter Lab Results
                                    </h2>
                                    <p className="text-purple-200 text-sm mt-1">{selectedOrder.test?.testName} • {selectedOrder.testNumber}</p>
                                </div>
                                <button onClick={() => setShowResultModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Patient Info */}
                                <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                        {selectedOrder.patient?.firstName?.[0]}{selectedOrder.patient?.lastName?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}</div>
                                        <div className="text-sm text-gray-500">{selectedOrder.patient?.patientId}</div>
                                    </div>
                                </div>

                                {/* Parameters Form */}
                                <div className="space-y-4 mb-6">
                                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Test Parameters</h3>
                                    {resultData.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No parameters defined for this test. Please add manually.</p>
                                    ) : (
                                        resultData.map((param, idx) => (
                                            <div key={idx} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg border transition-all duration-300 ${param.isCritical ? 'bg-red-100 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                                    param.isAbnormal ? 'bg-amber-50 border-amber-200' :
                                                        'bg-gray-50 border-gray-100'
                                                }`}>
                                                <div className="col-span-4">
                                                    <div className={`font-medium ${param.isCritical ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                                                        {param.parameter}
                                                    </div>
                                                    <div className="text-xs text-gray-400">Normal: {param.normalRange || 'N/A'}</div>
                                                    {(param.criticalLow || param.criticalHigh) && (
                                                        <div className="text-[10px] text-red-500 font-bold">
                                                            Critical: {param.criticalLow ? `<${param.criticalLow}` : ''} {param.criticalHigh ? `>${param.criticalHigh}` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-5">
                                                    <input
                                                        type="text"
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${param.isCritical ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-700 font-bold' :
                                                                'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                                                            }`}
                                                        placeholder="Enter value"
                                                        value={param.value}
                                                        onChange={(e) => handleResultChange(idx, e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 text-sm text-gray-500">{param.unit}</div>
                                                <div className="col-span-1 flex justify-center">
                                                    {param.isCritical ? (
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                                            className="text-red-600 bg-white rounded-full p-1 shadow-sm"
                                                            title="Critical Value!"
                                                        >
                                                            <AlertTriangle size={20} fill="#fee2e2" />
                                                        </motion.div>
                                                    ) : param.isAbnormal ? (
                                                        <span className="text-amber-500" title="Abnormal"><AlertCircle size={20} /></span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Remarks */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                        rows="3"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Any additional observations..."
                                    ></textarea>
                                </div>

                                {/* PDF Upload Section */}
                                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h3 className="font-bold text-blue-800 text-sm uppercase tracking-wider mb-3">📄 Upload Report PDF</h3>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setPdfFile(e.target.files[0])}
                                            className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:font-medium hover:file:bg-blue-600 file:cursor-pointer"
                                        />
                                        <button
                                            onClick={handleUploadPdf}
                                            disabled={!pdfFile || uploading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {uploading ? <Loader size={16} className="animate-spin" /> : null}
                                            {uploading ? 'Uploading...' : 'Upload & Summarize'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2">AI will extract key findings and generate a clinical summary.</p>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowResultModal(false)}
                                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitResults}
                                        disabled={submitting}
                                        className="px-8 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                                        Save Results
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

export default Laboratory;
