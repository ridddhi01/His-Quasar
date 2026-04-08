import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Search, Filter, Loader2, ArrowRight,
    Calendar, User, FileCode, CheckCircle, Clock
} from 'lucide-react';
import clinicalCodingService from '../../services/clinicalCoding.service';
import { Link, useLocation } from 'react-router-dom';

const CodingQueue = () => {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const location = useLocation();

    // Determine default status based on URL path
    const getDefaultStatus = () => {
        if (location.pathname.includes('/review')) return 'pending-review';
        return 'awaiting-coding';
    };

    const [filters, setFilters] = useState({
        status: getDefaultStatus(),
        search: ''
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Status tabs
    const tabs = [
        { id: 'awaiting-coding', label: 'Awaiting Coding', icon: Clock },
        { id: 'in-progress', label: 'In Progress', icon: FileCode },
        { id: 'returned', label: 'Returned', icon: Activity },
        { id: 'approved', label: 'Completed', icon: CheckCircle },
    ];

    useEffect(() => {
        fetchRecords();
    }, [filters.status]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await clinicalCodingService.getCodingRecords({
                status: filters.status,
                // Add sort by oldest first for queue? or newest? Usually oldest first for work queues
                sort: 'createdAt:asc'
            });
            if (response.success) {
                setRecords(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching coding queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'awaiting-coding': 'bg-yellow-100 text-yellow-700',
            'in-progress': 'bg-blue-100 text-blue-700',
            'pending-review': 'bg-purple-100 text-purple-700',
            'approved': 'bg-green-100 text-green-700',
            'returned': 'bg-red-100 text-red-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Coding Queue</h1>
                    <p className="text-slate-500">Manage patient records requiring clinical coding</p>
                </div>
                <button
                    onClick={fetchRecords}
                    className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-200"
                    title="Refresh List"
                >
                    <Activity size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl overflow-hidden shadow-sm">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = filters.status === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setFilters({ ...filters, status: tab.id })}
                            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${isActive
                                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : records.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {records.map((record) => (
                            <div key={record._id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                            {record.patient?.firstName} {record.patient?.lastName}
                                            <span className={`px-2 py-0.5 rounded text-xs ml-2 ${getStatusColor(record.status)}`}>
                                                {record.status.replace('-', ' ')}
                                            </span>
                                        </h3>
                                        <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-4">
                                            <span className="flex items-center gap-1">
                                                <Activity size={14} /> {record.codingNumber}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} /> {new Date(record.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User size={14} /> Dr. {record.finalizingDoctor?.profile?.firstName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/dashboard/consultation/${record.encounter}`}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all font-medium text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                >
                                    Open Record <ArrowRight size={16} />
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400">
                        <FileCode size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No records found in this queue.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodingQueue;
