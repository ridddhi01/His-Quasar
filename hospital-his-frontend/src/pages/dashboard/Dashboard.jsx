import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getExecutiveStats, getClinicalStats, resetAnalytics } from '../../features/analytics/analyticsSlice';
import { Activity, Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
    >
        <div className="flex items-start justify-between mb-4">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
                <Icon size={22} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
        <div className="flex items-center text-xs">
            <TrendingUp size={14} className="text-green-500 mr-1" />
            <span className="text-green-500 font-semibold mr-1">12%</span>
            <span className="text-gray-400">{subtext}</span>
        </div>
    </motion.div>
);

const Dashboard = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { data, isLoading, isError, message } = useSelector((state) => state.analytics);

    useEffect(() => {
        if (user?.role === 'admin') {
            dispatch(getExecutiveStats());
        } else if (['doctor', 'nurse'].includes(user?.role)) {
            dispatch(getClinicalStats());
        }
        // Other roles (pharmacist, receptionist, etc.) don't need analytics on dashboard

        return () => {
            dispatch(resetAnalytics());
        }
    }, [user, dispatch]);

    // Render logic based on Role and Data
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>
                    ))}
                </div>
            );
        }

        if (isError) {
            return <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error loading dashboard: {message}</div>;
        }

        if (!data) return null;

        // Admin View
        if (user?.role === 'admin') {
            return (
                <>
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Executive Overview</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="OPD Patients (Today)"
                            value={data.opdToday}
                            subtext="vs yesterday"
                            icon={Users}
                            color="bg-blue-500"
                        />
                        <StatCard
                            title="IPD Admissions"
                            value={data.ipdCurrent}
                            subtext="Currently admitted"
                            icon={Activity}
                            color="bg-purple-500"
                        />
                        <StatCard
                            title="Revenue (Today)"
                            value={`₹${data.revenueToday?.toLocaleString()}`}
                            subtext="vs yesterday"
                            icon={DollarSign}
                            color="bg-emerald-500"
                        />
                        <StatCard
                            title="Revenue (Month)"
                            value={`₹${data.revenueMonth?.toLocaleString()}`}
                            subtext="vs last month"
                            icon={Calendar}
                            color="bg-amber-500"
                        />
                    </div>
                </>
            );
        }

        // Doctor/Clinical View
        if (['doctor', 'nurse'].includes(user?.role)) {
            // Helper to safe access counts
            const getStatusCount = (arr, status) => arr?.find(i => i._id === status)?.count || 0;
            const opdTotal = data.opd?.reduce((acc, curr) => acc + curr.count, 0) || 0;
            const ipdAdmitted = getStatusCount(data.ipd, 'admitted');

            return (
                <>
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Clinical Overview</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="My Appointments"
                            value={opdTotal}
                            subtext="Total Scheduled"
                            icon={Calendar}
                            color="bg-blue-500"
                        />
                        <StatCard
                            title="Admitted Patients"
                            value={ipdAdmitted}
                            subtext="In your wards"
                            icon={Activity}
                            color="bg-purple-500"
                        />
                        {/* Placeholders for now using generic data points as backend returns strict structures */}
                        <StatCard
                            title="Lab Reports"
                            value={data.lab?.length || 0}
                            subtext="Pending review"
                            icon={Activity}
                            color="bg-orange-500"
                        />
                        <StatCard
                            title="Critical Alerts"
                            value="0"
                            subtext="Requires attention"
                            icon={Activity}
                            color="bg-red-500"
                        />
                    </div>
                </>
            );
        }

        // Pharmacist View
        if (user?.role === 'pharmacist') {
            return (
                <>
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Pharmacy Dashboard</h1>
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <div className="text-6xl mb-4">💊</div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">Welcome, Pharmacist!</h2>
                        <p className="text-gray-500 mb-6">Manage prescriptions and inventory from the Pharmacy section.</p>
                        <a href="/pharmacy" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
                            Go to Pharmacy →
                        </a>
                    </div>
                </>
            );
        }

        // Receptionist View
        if (user?.role === 'receptionist') {
            return (
                <>
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Reception Dashboard</h1>
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <div className="text-6xl mb-4">🏥</div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">Welcome, Receptionist!</h2>
                        <p className="text-gray-500 mb-6">Manage patient registrations and appointments.</p>
                        <div className="flex justify-center gap-4">
                            <a href="/patients" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                                Patients
                            </a>
                            <a href="/appointments" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
                                Appointments
                            </a>
                        </div>
                    </div>
                </>
            );
        }
        // Lab Tech View
        if (user?.role === 'lab_tech') {
            return (
                <>
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Laboratory Dashboard</h1>
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <div className="text-6xl mb-4">🧪</div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">Welcome, Lab Technician!</h2>
                        <p className="text-gray-500 mb-6">Process lab orders and enter test results.</p>
                        <a href="/dashboard/lab" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
                            Go to Laboratory →
                        </a>
                    </div>
                </>
            );
        }

        return <div>Welcome to your dashboard</div>;
    };

    return (
        <div className="min-h-screen">
            {renderContent()}

            {/* Placeholder for Recent Activity Widget - Shared across roles for now */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Patient Traffic</h3>
                    <div className="h-64 flex items-center justify-center text-gray-400 bg-slate-50 rounded-xl">
                        Chart Placeholder (Recharts)
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Recent Notifications</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3 items-start p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                                <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">New Lab Result Available</p>
                                    <p className="text-xs text-slate-500">Patient John Doe • 10 mins ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
