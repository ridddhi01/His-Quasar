import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Filter, Loader2, Plus, Edit2, Trash2,
    MoreVertical, FileText, Database
} from 'lucide-react';
import clinicalCodingService from '../../services/clinicalCoding.service';

const ProcedureCodes = () => {
    const [loading, setLoading] = useState(true);
    const [codes, setCodes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCodes();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, page]);

    const fetchCodes = async () => {
        try {
            setLoading(true);
            const response = await clinicalCodingService.getProcedureCodes({
                search: searchTerm,
                page,
                limit: 50
            });
            if (response.success) {
                setCodes(response.data || []);
                setTotalPages(response.pages);
            }
        } catch (error) {
            console.error('Error fetching procedure codes:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Procedure Codes</h1>
                    <p className="text-slate-500">Master database of CPT/ICD procedure codes</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <Plus size={18} />
                    Add New Code
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by code, description, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Codes Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-600">Code</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Description</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Category</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Base Rate</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : codes.length > 0 ? (
                                codes.map((code) => (
                                    <tr key={code._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                                            {code.code}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700">
                                            {code.shortDescription || code.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                {code.category || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            ₹{(code.baseRate || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <Database size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No procedure codes found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-slate-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProcedureCodes;
