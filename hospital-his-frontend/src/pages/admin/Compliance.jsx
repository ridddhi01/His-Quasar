import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    ClipboardCheck, Users, ShieldAlert,
    FileText, CheckCircle, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminPages.css';

const Compliance = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchComplianceReports();
    }, []);

    const fetchComplianceReports = async () => {
        try {
            setLoading(true);
            const response = await adminService.getComplianceReports();
            setReport(response.data);
        } catch (error) {
            console.error('Failed to fetch compliance reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading compliance data...</div>;
    }

    if (!report) {
        return <div className="p-12 text-center text-gray-500">No compliance data available.</div>;
    }

    // Safely extract values with defaults to prevent crashes
    const activeUsers = report?.users?.active || 0;
    const inactiveUsers = report?.users?.inactive || 0;
    const totalLogs = report?.audit?.totalLogs || 0;
    const breakGlassEvents = report?.audit?.breakGlassLast30Days || 0;

    const userStats = [
        { name: 'Active', value: activeUsers, color: '#10B981' },
        { name: 'Inactive', value: inactiveUsers, color: '#EF4444' },
    ];

    const auditStats = [
        { name: 'Regular Logs', value: Math.max(0, totalLogs - breakGlassEvents), color: '#3B82F6' },
        { name: 'Break-Glass', value: breakGlassEvents, color: '#F59E0B' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                        <ClipboardCheck className="text-primary" />
                        Compliance Reports
                    </h1>
                    <p className="text-secondary text-sm">Regulatory compliance and system governance overview</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                    <CheckCircle size={16} className="text-green-500" />
                    <span>System Status: Compliant</span>
                </div>
            </div>

            {/* Compliance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* User Governance */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-secondary-dark mb-4 flex items-center gap-2">
                        <Users size={20} className="text-blue-500" />
                        User Governance
                    </h3>
                    <div className="flex items-center">
                        <div className="flex justify-center items-center w-1/2">
                            <PieChart width={200} height={160}>
                                <Pie
                                    data={userStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {userStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </div>
                        <div className="w-1/2 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Total Users</span>
                                <span className="font-bold text-secondary-dark">{activeUsers + inactiveUsers}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                                </span>
                                <span className="font-bold text-secondary-dark">{activeUsers}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Inactive
                                </span>
                                <span className="font-bold text-secondary-dark">{inactiveUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit & Security */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-secondary-dark mb-4 flex items-center gap-2">
                        <ShieldAlert size={20} className="text-orange-500" />
                        Audit & Security (30 Days)
                    </h3>
                    <div className="flex items-center">
                        <div className="flex justify-center items-center w-1/2">
                            <PieChart width={200} height={160}>
                                <Pie
                                    data={auditStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {auditStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </div>
                        <div className="w-1/2 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Total Logs</span>
                                <span className="font-bold text-secondary-dark">{totalLogs}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Break-Glass
                                </span>
                                <span className="font-bold text-orange-600">{breakGlassEvents}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Standard Compliance Checklist (Static for Demo) */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-secondary-dark mb-4">Regulatory Checklist (HIPAA/GDPR)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        "Database Encryption Enabled",
                        "Audit Logging Active",
                        "Role-Based Access Control Enforced",
                        "Regular Backup Schedule",
                        "Inactive Session Timeout",
                        "Strong Password Policy"
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <CheckCircle size={18} className="text-green-500" />
                            <span className="text-sm font-medium text-secondary-dark">{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Compliance;
