import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    TrendingUp, AlertTriangle, CheckCircle,
    XCircle, Search, Filter, MoreHorizontal,
    DollarSign, Activity
} from 'lucide-react';
import './AdminPages.css';

const RevenueAnomalies = () => {
    const [anomalies, setAnomalies] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [listData, summaryData] = await Promise.all([
                adminService.getRevenueAnomalies(),
                adminService.getAnomalySummary()
            ]);
            setAnomalies(listData.data || []);
            setSummary(summaryData.data || {
                totalPending: 0,
                highSeverity: 0,
                potentialLoss: 0,
                recoveredAmount: 0
            });
        } catch (error) {
            console.error('Failed to load revenue anomalies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        const notes = prompt(`Enter notes for ${action}:`);
        if (!notes) return;

        try {
            if (action === 'false-positive') {
                await adminService.markAnomalyFalsePositive(id, 'Admin Review', notes);
            } else if (action === 'escalate') {
                await adminService.escalateAnomaly(id, notes);
            }
            fetchAllData(); // Refresh
        } catch (error) {
            alert('Action failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredAnomalies = anomalies.filter(item =>
        statusFilter === 'all' ? true : item.status === statusFilter
    );

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'text-red-600 bg-red-50 border-red-100';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading AI Analysis...</div>;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                        <TrendingUp className="text-primary" />
                        Revenue Anomalies (AI Detected)
                    </h1>
                    <p className="text-secondary text-sm">Review potential billing discrepancies and leakage detected by AI</p>
                </div>
                <button
                    onClick={async () => {
                        if (confirm('Run full AI analysis? This may take a moment.')) {
                            setLoading(true);
                            try {
                                await adminService.runRevenueAnomalyScan();
                                fetchAllData();
                            } catch (e) {
                                alert('Scan failed: ' + e.message);
                                setLoading(false);
                            }
                        }
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Activity size={16} />
                    Run AI Scan
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Total Pending</span>
                        <Activity size={16} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">{summary?.totalPending || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">High Severity</span>
                        <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">{summary?.highSeverity || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Potential Loss</span>
                        <DollarSign size={16} className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">
                        ₹{(summary?.potentialLoss || 0).toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Recovered (MTD)</span>
                        <CheckCircle size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        ₹{(summary?.recoveredAmount || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex gap-2">
                        {['all', 'detected', 'review', 'resolved', 'false_positive'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {status.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search ID..."
                            className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600">ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Anomaly Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Severity</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Detected</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Est. Value</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAnomalies.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No anomalies found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredAnomalies.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.anomalyCode || item._id.substr(-6)}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-secondary-dark">{item.type?.replace(/_/g, ' ')}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(item.severity)}`}>
                                                {item.severity?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(item.detectedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-700">
                                            ₹{(item.estimatedValue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                                                {item.status?.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.status === 'detected' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(item._id, 'escalate')}
                                                        className="p-1 hover:bg-red-50 text-red-600 rounded"
                                                        title="Escalate"
                                                    >
                                                        <AlertTriangle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(item._id, 'false-positive')}
                                                        className="p-1 hover:bg-gray-100 text-gray-500 rounded"
                                                        title="Mark as False Positive"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RevenueAnomalies;
