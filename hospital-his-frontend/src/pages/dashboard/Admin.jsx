import React, { useState, useEffect } from 'react';
import {
    Shield,
    Users,
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    FileText,
    Settings,
    Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('discounts');
    const [pendingDiscounts, setPendingDiscounts] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBills: 0,
        pendingDiscounts: 0,
        todayRevenue: 0
    });
    const [loading, setLoading] = useState(true);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [discountsRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/billing/pending-discounts`, getAuthHeaders()),
                axios.get(`${API_URL}/billing/dashboard`, getAuthHeaders())
            ]);
            setPendingDiscounts(discountsRes.data.data || []);
            setStats({
                ...stats,
                pendingDiscounts: discountsRes.data.count || 0,
                todayRevenue: statsRes.data.data?.todayCollection || 0,
                totalBills: statsRes.data.data?.todayBills || 0
            });
        } catch (error) {
            console.error('Error fetching admin data:', error);
            if (error.response?.status === 403) {
                toast.error('Access denied. Admin role required.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDiscount = async (billId) => {
        try {
            await axios.post(
                `${API_URL}/billing/bills/${billId}/approve-discount`,
                { isApproved: true },
                getAuthHeaders()
            );
            toast.success('Discount approved');
            fetchData();
        } catch (error) {
            toast.error('Failed to approve discount');
        }
    };

    const handleRejectDiscount = async (billId) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await axios.post(
                `${API_URL}/billing/bills/${billId}/approve-discount`,
                { isApproved: false, rejectionReason: reason },
                getAuthHeaders()
            );
            toast.success('Discount rejected');
            fetchData();
        } catch (error) {
            toast.error('Failed to reject discount');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500">System administration & approvals</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Discounts</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.pendingDiscounts}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Today's Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">₹{stats.todayRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Today's Bills</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Activity className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">System Status</p>
                            <p className="text-lg font-bold text-green-600">Healthy</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-4">
                    {[
                        { id: 'discounts', label: 'Discount Approvals', icon: DollarSign },
                        { id: 'system', label: 'System Settings', icon: Settings }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Discount Approvals Tab */}
            {activeTab === 'discounts' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-medium text-gray-900">Pending Discount Requests</h3>
                        <p className="text-sm text-gray-500">Review and approve discount requests from billing staff</p>
                    </div>

                    {pendingDiscounts.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                            <p className="font-medium">All caught up!</p>
                            <p className="text-sm">No pending discount requests</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingDiscounts.map((bill) => (
                                    <tr key={bill._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{bill.billNumber}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {bill.patient?.firstName} {bill.patient?.lastName}
                                            <div className="text-xs text-gray-400">{bill.patient?.patientId}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            ₹{(bill.grandTotal || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                                ₹{(bill.discountRequest?.amount || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
                                            {bill.discountRequest?.reason || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {bill.discountRequest?.requestedBy?.profile?.firstName || 'Staff'}
                                            <div className="text-xs text-gray-400">
                                                {bill.discountRequest?.requestedAt
                                                    ? new Date(bill.discountRequest.requestedAt).toLocaleDateString()
                                                    : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleApproveDiscount(bill._id)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectDiscount(bill._id)}
                                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'system' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-medium text-gray-900 mb-4">System Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <Shield className="w-5 h-5 text-blue-600" />
                                <h4 className="font-medium">Security</h4>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">Manage authentication and access control settings</p>
                            <button className="text-blue-600 text-sm font-medium hover:underline">Configure →</button>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <Users className="w-5 h-5 text-green-600" />
                                <h4 className="font-medium">User Management</h4>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">Add, edit, or deactivate system users</p>
                            <button className="text-blue-600 text-sm font-medium hover:underline">Manage Users →</button>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <DollarSign className="w-5 h-5 text-yellow-600" />
                                <h4 className="font-medium">Billing Settings</h4>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">Configure tariffs, taxes, and discount limits</p>
                            <button className="text-blue-600 text-sm font-medium hover:underline">Configure →</button>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                <h4 className="font-medium">Reports</h4>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">Generate and export system reports</p>
                            <button className="text-blue-600 text-sm font-medium hover:underline">View Reports →</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
