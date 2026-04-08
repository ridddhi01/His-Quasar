import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    AlertTriangle, Shield, Activity,
    FileWarning, Zap, CheckCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import './AdminPages.css';

const Incidents = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await adminService.getIncidentMetrics();
                setMetrics(response.data);
            } catch (error) {
                console.error('Failed to load incident metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (loading) return <div className="p-12 text-center text-gray-500">Loading safety metrics...</div>;
    if (!metrics) return <div className="p-12 text-center text-gray-500">No data available.</div>;

    const { summary, breakdown, trend, alerts } = metrics;

    // Transform breakdown object to array for PieChart
    const breakdownData = Object.entries(breakdown || {}).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value
    }));

    const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#FF6B6B'];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                    <AlertTriangle className="text-primary" />
                    Incidents & Safety
                </h1>
                <p className="text-secondary text-sm">Monitor clinical incidents, near-misses, and security alerts</p>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Total Incidents</span>
                        <FileWarning size={16} className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">{summary?.totalIncidents || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Break-Glass</span>
                        <Zap size={16} className="text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">{summary?.breakGlassUsage || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Security Alerts</span>
                        <Shield size={16} className="text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-secondary-dark">{summary?.securityIncidents || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-500 text-xs uppercase font-semibold">Days Incident Free</span>
                        <Activity size={16} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{summary?.daysSinceLastIncident || 0}</div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Incident Trend */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-secondary-dark mb-6">Incident Trend (6 Months)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trend}>
                                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Incident Types Breakdown */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-secondary-dark mb-6">Incident Categories</h3>
                    <div className="flex">
                        <div className="flex justify-center items-center w-1/2">
                            <PieChart width={200} height={200}>
                                <Pie
                                    data={breakdownData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {breakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </div>
                        <div className="w-1/2 flex flex-col justify-center gap-3">
                            {breakdownData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-gray-600 capitalize">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-secondary-dark">{entry.value}</span>
                                </div>
                            ))}
                            {breakdownData.length === 0 && (
                                <div className="text-center text-gray-500 italic">No categorized incidents this month.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Alerts List */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-red-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Active Safety Alerts
                    </h3>
                    <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-1 rounded">
                        {alerts?.length || 0} Priority Items
                    </span>
                </div>
                <div className="divide-y divide-slate-100">
                    {alerts && alerts.length > 0 ? (
                        alerts.map((alert, idx) => (
                            <div key={idx} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50">
                                <span className="p-2 bg-red-100 text-red-500 rounded-lg mt-1">
                                    <AlertTriangle size={18} />
                                </span>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm capitalize">
                                        {alert.type.replace(/_/g, ' ')}
                                    </h4>
                                    <p className="text-gray-600 text-sm mt-1">{alert.message}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-gray-500 flex flex-col items-center gap-2">
                            <CheckCircle size={32} className="text-green-500 bg-green-50 p-1 rounded-full" />
                            <p>No active safety alerts at this time.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Incidents;
