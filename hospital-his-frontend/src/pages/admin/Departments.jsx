import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    Building2, Plus, Users,
    Activity, MoreVertical, Search
} from 'lucide-react';
import './AdminPages.css';

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const response = await adminService.getDepartments();
            setDepartments(response.data || []);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                        <Building2 className="text-primary" />
                        Departments
                    </h1>
                    <p className="text-secondary text-sm">Manage hospital departments and their operational settings</p>
                </div>
                <button className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    Add Department
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search departments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
            </div>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    // Loading Skeletons
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse">
                            <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
                            <div className="h-4 w-3/4 bg-gray-100 rounded mb-2"></div>
                            <div className="h-4 w-1/4 bg-gray-100 rounded"></div>
                        </div>
                    ))
                ) : filteredDepartments.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                        <p>No departments found</p>
                    </div>
                ) : (
                    filteredDepartments.map((dept) => (
                        <div key={dept._id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative">
                            {/* Actions Dropdown Trigger (Placeholder) */}
                            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical size={18} />
                            </button>

                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-secondary-dark">{dept.name}</h3>
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {dept.code || 'NO-CODE'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-50">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Users size={16} /> Head
                                    </span>
                                    <span className="font-medium text-secondary-dark">
                                        {dept.head ? `${dept.head.profile?.firstName} ${dept.head.profile?.lastName}` : 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Activity size={16} /> Status
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dept.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {dept.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Departments;
