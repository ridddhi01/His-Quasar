import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Clock, FileCode, CheckSquare, AlertCircle,
    CheckCircle, XCircle, Search, Filter, Loader2, ArrowRight
} from 'lucide-react';
import clinicalCodingService from '../../services/clinicalCoding.service';
import { Link } from 'react-router-dom';

const CodingDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        awaitingCoding: 0,
        inProgress: 0,
        pendingReview: 0,
        approved: 0,
        returned: 0,
        todayRecords: 0
    });
    const [recentAwaiting, setRecentAwaiting] = useState([]);
    const [recentPendingReview, setRecentPendingReview] = useState([]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSeniorCoder = ['admin', 'senior_coder'].includes(user.role);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await clinicalCodingService.getDashboard();
            if (response.success) {
                setStats(response.data.stats);
                setRecentAwaiting(response.data.recentAwaiting || []);
                setRecentPendingReview(response.data.recentPendingReview || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{value}</h3>
                    {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
        </motion.div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 size={40} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Clinical Coding Dashboard</h1>
                    <p className="text-slate-500">Overview of coding activities and status</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchDashboardData}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Activity size={20} />
                    </button>
                    <Link
                        to="/dashboard/coding/queue"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <FileCode size={18} />
                        View Queue
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Awaiting Coding"
                    value={stats.awaitingCoding}
                    icon={Clock}
                    color="bg-yellow-500"
                    subtext="Records ready for coding"
                />
                <StatCard
                    title="In Progress"
                    value={stats.inProgress}
                    icon={FileCode}
                    color="bg-blue-500"
                    subtext="Currently being coded"
                />
                <StatCard
                    title="Pending Review"
                    value={stats.pendingReview}
                    icon={AlertCircle}
                    color="bg-purple-500"
                    subtext="Waiting for approval"
                />
                <StatCard
                    title="Approved Today"
                    value={stats.approved}
                    icon={CheckCircle}
                    color="bg-green-500"
                    subtext={`${stats.todayRecords} new records today`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Awaiting (For Coders) */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={20} className="text-yellow-500" />
                            Awaiting Coding
                        </h2>
                        <Link to="/dashboard/coding/queue" className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentAwaiting.length > 0 ? (
                            recentAwaiting.map((record) => (
                                <div key={record._id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-slate-800">
                                            {record.patient?.firstName} {record.patient?.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {record.codingNumber} • Dr. {record.finalizingDoctor?.profile?.firstName}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono text-slate-400">
                                            {new Date(record.createdAt).toLocaleDateString()}
                                        </div>
                                        <Link
                                            to={`/dashboard/consultation/${record.encounter}`}
                                            className="text-xs text-indigo-600 font-medium mt-1 inline-block"
                                        >
                                            Start Coding
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400">No records awaiting coding</div>
                        )}
                    </div>
                </div>

                {/* Pending Review (For Senior Coders) */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <CheckSquare size={20} className="text-purple-500" />
                            Pending Review
                        </h2>
                        {isSeniorCoder && (
                            <Link to="/dashboard/coding/review" className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                                Review Queue <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentPendingReview.length > 0 ? (
                            recentPendingReview.map((record) => (
                                <div key={record._id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-slate-800">
                                            {record.patient?.firstName} {record.patient?.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Coded by: {record.codedBy?.profile?.firstName || 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                            Pending Review
                                        </span>
                                        <Link
                                            to={`/dashboard/consultation/${record.encounter}`}
                                            className="text-xs text-indigo-600 font-medium mt-1 inline-block"
                                        >
                                            Review
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400">No records pending review</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodingDashboard;
