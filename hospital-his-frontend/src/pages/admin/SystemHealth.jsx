import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    Activity, Server, Database,
    Wifi, Cpu, Clock, RefreshCw
} from 'lucide-react';
import './AdminPages.css';

const SystemHealth = () => {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30s
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchHealth = async () => {
        try {
            const response = await adminService.getSystemHealth();
            setHealth(response.data);
        } catch (error) {
            console.error('Failed to fetch system health:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !health) {
        return <div className="p-12 text-center text-gray-500">Connecting to system...</div>;
    }

    const getStatusColor = (status) => {
        return status === 'healthy' || status === 'operational'
            ? 'text-green-500 bg-green-50 border-green-100'
            : 'text-red-500 bg-red-50 border-red-100';
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                        <Activity className="text-primary" />
                        System Health
                    </h1>
                    <p className="text-secondary text-sm">Real-time infrastructure monitoring</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchHealth(); }}
                    className="btn-secondary flex items-center gap-2"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Main Status */}
            <div className={`p-6 rounded-xl border flex items-center gap-4 ${health?.status === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`p-3 rounded-full ${health?.status === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <Server size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        System is {health?.status === 'healthy' ? 'Operational' : 'Degraded'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Last check: {new Date(health?.lastUpdated).toLocaleTimeString()}
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Uptime */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <h3 className="font-semibold text-gray-700">System Uptime</h3>
                    </div>
                    <div className="text-3xl font-mono text-secondary-dark">
                        {health?.uptime?.formatted?.split(' ')[0]}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        {health?.uptime?.formatted}
                    </div>
                </div>

                {/* Database */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-50 text-purple-500 rounded-lg">
                            <Database size={20} />
                        </div>
                        <h3 className="font-semibold text-gray-700">Database</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(health?.database)}`}>
                        {health?.database?.toUpperCase()}
                    </span>
                    <div className="mt-4 flex justify-between text-sm text-gray-500 border-t border-gray-50 pt-3">
                        <span>Latency</span>
                        <span>12ms</span>
                    </div>
                </div>

                {/* Memory */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                            <Cpu size={20} />
                        </div>
                        <h3 className="font-semibold text-gray-700">Memory Usage</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-secondary-dark">{health?.memory?.used}</span>
                        <span className="text-gray-500 mb-1">/ {health?.memory?.total} MB</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-orange-500 h-full transition-all duration-500"
                            style={{ width: `${(health?.memory?.used / health?.memory?.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Services List */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 font-semibold text-gray-700">
                    Component Status
                </div>
                <div className="divide-y divide-slate-100">
                    {Object.entries(health?.services || {}).map(([service, status]) => (
                        <div key={service} className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Wifi size={18} className="text-gray-400" />
                                <span className="capitalize text-gray-700">{service}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status === 'operational' || status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm font-medium text-gray-600 capitalize">{status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;
