import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    Search, Filter, Download, Calendar,
    FileText, User, Shield, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import './AdminPages.css';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user: '',
        action: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAuditLogs(filters);
            setLogs(response.data || []);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const applyFilters = (e) => {
        e.preventDefault();
        fetchLogs();
    };

    const getActionColor = (action) => {
        if (action.includes('DELETE') || action.includes('REVOKE')) return 'text-red-500 bg-red-50';
        if (action.includes('CREATE') || action.includes('GRANT')) return 'text-green-500 bg-green-50';
        if (action.includes('UPDATE')) return 'text-blue-500 bg-blue-50';
        return 'text-gray-500 bg-gray-50';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                        <FileText className="text-primary" />
                        Audit Logs
                    </h1>
                    <p className="text-secondary text-sm">Track and monitor all system activities and security events</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary flex items-center gap-2 text-sm">
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            name="user"
                            placeholder="Filter by User..."
                            value={filters.user}
                            onChange={handleFilterChange}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="relative">
                        <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            name="action"
                            placeholder="Filter by Action..."
                            value={filters.action}
                            onChange={handleFilterChange}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <button type="submit" className="btn-primary w-full md:w-auto">
                        Apply Filters
                    </button>
                </form>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading audit trail...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="flex justify-center mb-3">
                            <span className="p-3 bg-gray-50 rounded-full">
                                <FileText size={24} className="text-gray-400" />
                            </span>
                        </div>
                        <p>No audit logs found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-secondary-dark">Timestamp</th>
                                    <th className="px-6 py-4 font-semibold text-secondary-dark">User</th>
                                    <th className="px-6 py-4 font-semibold text-secondary-dark">Action</th>
                                    <th className="px-6 py-4 font-semibold text-secondary-dark">Entity</th>
                                    <th className="px-6 py-4 font-semibold text-secondary-dark">Details</th>
                                    <th className="px-6 py-4 font-semibold text-secondary-dark">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                    {log.user?.username?.[0] || '?'}
                                                </div>
                                                <span className="font-medium text-secondary-dark">
                                                    {log.user?.username || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {log.entity}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={log.description}>
                                            {log.description}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                                            {log.ipAddress || '--'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
