import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    FileText,
    Plus,
    Search,
    AlertCircle,
    Printer,
    Lock,
    X,
    CheckCircle,
    Clock,
    CreditCard,
    Percent,
    TrendingUp,
    Eye,
    Receipt,
    History,
    User,
    Shield
} from 'lucide-react';
import billingService from '../../services/billing.service';
import patientService from '../../services/patients.service';
import { toast } from 'react-hot-toast';

const Billing = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        todayCollection: 0,
        pendingAmount: 0,
        todayBills: 0,
        totalRevenue: 0
    });
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    // Bill Generation State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState([]);
    const [billItems, setBillItems] = useState([
        { itemType: 'consultation', description: '', quantity: 1, rate: 0, amount: 0 }
    ]);

    // View/Edit Bill State
    const [selectedBill, setSelectedBill] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditTrail, setAuditTrail] = useState([]);

    // Payment State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');

    // Discount State
    const [discountAmount, setDiscountAmount] = useState('');
    const [discountReason, setDiscountReason] = useState('');

    const itemTypes = [
        { value: 'consultation', label: 'Consultation' },
        { value: 'procedure', label: 'Procedure' },
        { value: 'lab', label: 'Lab Test' },
        { value: 'radiology', label: 'Radiology' },
        { value: 'medicine', label: 'Medicine' },
        { value: 'bed', label: 'Bed Charges' },
        { value: 'surgery', label: 'Surgery' },
        { value: 'nursing', label: 'Nursing' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        fetchDashboardData();
    }, [statusFilter]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, billsData] = await Promise.all([
                billingService.getDashboardStats(),
                billingService.getAllBills({ limit: 50, status: statusFilter !== 'all' ? statusFilter : undefined })
            ]);
            setStats(statsData.data || {});
            setBills(billsData.data || []);
        } catch (error) {
            console.error('Error fetching billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Patient Search
    const handleSearchPatient = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 2) {
            try {
                const results = await patientService.searchPatients(query);
                setPatients(results.data || []);
            } catch (error) {
                console.error(error);
            }
        } else {
            setPatients([]);
        }
    };

    const selectPatient = (patient) => {
        setSelectedPatient(patient);
        setPatients([]);
        setSearchQuery('');
    };

    // Item Management
    const addBillItem = () => {
        setBillItems([...billItems, { itemType: 'other', description: '', quantity: 1, rate: 0, amount: 0 }]);
    };

    const removeBillItem = (index) => {
        if (billItems.length === 1) return;
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...billItems];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
        }
        setBillItems(newItems);
    };

    const calculateTotal = () => billItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Submit Bill
    const handleSubmitBill = async () => {
        if (!selectedPatient) return toast.error('Please select a patient');
        if (billItems.some(item => !item.description || item.rate <= 0)) {
            return toast.error('Please fill all item details');
        }
        const totalAmount = calculateTotal();
        if (totalAmount <= 0) return toast.error('Bill amount must be greater than 0');

        try {
            const billData = {
                patient: selectedPatient._id,
                visitType: 'opd',
                visitModel: 'Appointment',
                items: billItems.map(item => ({
                    itemType: item.itemType,
                    description: item.description,
                    quantity: Number(item.quantity),
                    rate: Number(item.rate),
                    amount: Number(item.amount),
                    netAmount: Number(item.amount),
                    isSystemGenerated: false
                })),
                subtotal: totalAmount,
                grandTotal: totalAmount,
                status: 'draft'
            };

            await billingService.generateBill(billData);
            toast.success('Bill created successfully');
            setActiveTab('overview');
            fetchDashboardData();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create bill');
        }
    };

    const resetForm = () => {
        setSelectedPatient(null);
        setBillItems([{ itemType: 'consultation', description: '', quantity: 1, rate: 0, amount: 0 }]);
    };

    // Bill Actions
    const openBillDetails = async (bill) => {
        setSelectedBill({ ...bill });
        setIsEditMode(false);
    };

    const handleFinalizeBill = async () => {
        if (!selectedBill) return;
        try {
            await billingService.finalizeBill(selectedBill._id);
            toast.success('Bill finalized successfully');
            setSelectedBill(null);
            fetchDashboardData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to finalize bill');
        }
    };

    const handleUpdateBill = async () => {
        try {
            await billingService.updateBill(selectedBill._id, { items: selectedBill.items });
            toast.success('Bill updated');
            const updated = await billingService.getBillById(selectedBill._id);
            setSelectedBill(updated.data);
            fetchDashboardData();
            setIsEditMode(false);
        } catch (error) {
            toast.error('Failed to update bill');
        }
    };

    // Payment Collection
    const handleCollectPayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            return toast.error('Enter valid payment amount');
        }
        try {
            await billingService.recordPayment(selectedBill._id, {
                amount: parseFloat(paymentAmount),
                mode: paymentMode
            });
            toast.success(`Payment of ₹${parseFloat(paymentAmount).toLocaleString()} collected`);
            setShowPaymentModal(false);
            setPaymentAmount('');
            const updated = await billingService.getBillById(selectedBill._id);
            setSelectedBill(updated.data);
            fetchDashboardData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to collect payment');
        }
    };

    // Discount Request
    const handleRequestDiscount = async () => {
        if (!discountAmount || parseFloat(discountAmount) <= 0) {
            return toast.error('Enter valid discount amount');
        }
        try {
            await billingService.requestDiscount(selectedBill._id, parseFloat(discountAmount), discountReason);
            toast.success('Discount request submitted');
            setShowDiscountModal(false);
            setDiscountAmount('');
            setDiscountReason('');
            const updated = await billingService.getBillById(selectedBill._id);
            setSelectedBill(updated.data);
        } catch (error) {
            toast.error('Failed to request discount');
        }
    };

    const handleApproveDiscount = async () => {
        try {
            await billingService.approveDiscount(selectedBill._id, true);
            toast.success('Discount approved');
            const updated = await billingService.getBillById(selectedBill._id);
            setSelectedBill(updated.data);
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed to approve discount');
        }
    };

    const handleSetResponsibility = async (responsibilityData) => {
        try {
            await billingService.setPaymentResponsibility(selectedBill._id, responsibilityData);
            toast.success('Payment responsibility updated');
            const updated = await billingService.getBillById(selectedBill._id);
            setSelectedBill(updated.data);
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed to set responsibility');
        }
    };

    const handleRecordPayment = async (amount, mode) => {
        try {
            await billingService.recordPayment(selectedBill._id, { amount, mode });
            toast.success('Payment recorded');
            const updated = await billingService.getBillById(selectedBill._id);
            setSelectedBill(updated.data);
            fetchDashboardData();
            setShowPaymentModal(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        }
    };

    // Audit Trail
    const handleViewAudit = async () => {
        try {
            const result = await billingService.getBillAudit(selectedBill._id);
            setAuditTrail(result.data || []);
            setShowAuditModal(true);
        } catch (error) {
            toast.error('Failed to load audit trail');
        }
    };

    const getStatusBadge = (status, paymentStatus) => {
        if (status === 'cancelled') return 'bg-red-100 text-red-700';
        if (status === 'finalized' && paymentStatus === 'paid') return 'bg-green-100 text-green-700';
        if (status === 'finalized') return 'bg-blue-100 text-blue-700';
        return 'bg-yellow-100 text-yellow-700';
    };

    if (loading && bills.length === 0) {
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
                    <h1 className="text-2xl font-bold text-gray-900">Billing & Finance</h1>
                    <p className="text-gray-500">Manage bills, payments, and revenue</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'create'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <Plus className="w-5 h-5" />
                        New Bill
                    </button>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'overview'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <FileText className="w-5 h-5" />
                        Ledger
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Today's Collection</p>
                                <p className="text-2xl font-bold text-gray-900">₹{(stats.todayCollection || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Amount</p>
                                <p className="text-2xl font-bold text-gray-900">₹{(stats.pendingAmount || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Receipt className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Today's Bills</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.todayBills || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Bill Form */}
            {activeTab === 'create' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Create New Bill</h2>

                    {/* Patient Search */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Patient *</label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div>
                                    <p className="font-medium text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                    <p className="text-sm text-gray-500">{selectedPatient.patientId} • {selectedPatient.phone}</p>
                                </div>
                                <button onClick={() => setSelectedPatient(null)} className="text-red-500 hover:text-red-700">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchPatient}
                                    placeholder="Search patient by name or ID..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                {patients.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {patients.map((patient) => (
                                            <div
                                                key={patient._id}
                                                onClick={() => selectPatient(patient)}
                                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                            >
                                                <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                                                <p className="text-sm text-gray-500">{patient.patientId}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bill Items */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Bill Items</label>

                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-3 mb-2 px-4 text-xs font-medium text-gray-500 uppercase">
                            <div className="col-span-2">Type</div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2">Qty</div>
                            <div className="col-span-2">Amount (₹)</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-3">
                            {billItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 rounded-lg">
                                    <select
                                        value={item.itemType}
                                        onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        {itemTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        placeholder="Enter description..."
                                        className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        min="1"
                                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                                    />
                                    <input
                                        type="number"
                                        value={item.amount || ''}
                                        onChange={(e) => {
                                            const newItems = [...billItems];
                                            newItems[index].amount = Number(e.target.value);
                                            newItems[index].rate = Number(e.target.value) / (newItems[index].quantity || 1);
                                            setBillItems(newItems);
                                        }}
                                        placeholder="0"
                                        min="0"
                                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-medium"
                                    />
                                    <button
                                        onClick={() => removeBillItem(index)}
                                        className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg flex justify-center"
                                        disabled={billItems.length === 1}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addBillItem}
                            className="mt-3 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                    </div>

                    {/* Total & Submit */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-lg font-bold text-gray-900">
                            Total: ₹{calculateTotal().toLocaleString()}
                        </div>
                        <button
                            onClick={handleSubmitBill}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Create Bill
                        </button>
                    </div>
                </div>
            )}

            {/* Bills Ledger */}
            {activeTab === 'overview' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-gray-200 flex gap-2">
                        {['all', 'draft', 'finalized', 'cancelled'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusFilter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bills.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No bills found
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{bill.billNumber}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {bill.patient?.firstName} {bill.patient?.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {new Date(bill.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ₹{(bill.grandTotal || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-medium">
                                            ₹{(bill.paidAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(bill.status, bill.paymentStatus)}`}>
                                                {bill.status?.toUpperCase()}
                                                {bill.paymentStatus === 'paid' && ' • PAID'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openBillDetails(bill)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bill Details Modal */}
            {selectedBill && (
                <BillDetailsModal
                    bill={selectedBill}
                    setBill={setSelectedBill}
                    isEditMode={isEditMode}
                    setIsEditMode={setIsEditMode}
                    onClose={() => setSelectedBill(null)}
                    onFinalize={handleFinalizeBill}
                    onUpdate={handleUpdateBill}
                    onCollectPayment={() => setShowPaymentModal(true)}
                    onRequestDiscount={() => setShowDiscountModal(true)}
                    onApproveDiscount={handleApproveDiscount}
                    onViewAudit={handleViewAudit}
                    onSetResponsibility={handleSetResponsibility}
                    onRecordPayment={handleRecordPayment}
                    navigate={navigate}
                />
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4 p-6">
                        <h3 className="text-lg font-bold mb-4">Collect Payment</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Balance Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ₹{((selectedBill.grandTotal || 0) - (selectedBill.paidAmount || 0)).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    max={(selectedBill.grandTotal || 0) - (selectedBill.paidAmount || 0)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                                <select
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="upi">UPI</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCollectPayment}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Collect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Discount Modal */}
            {showDiscountModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4 p-6">
                        <h3 className="text-lg font-bold mb-4">Request Discount</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <textarea
                                    value={discountReason}
                                    onChange={(e) => setDiscountReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows="3"
                                    placeholder="Senior citizen, Staff discount, etc."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDiscountModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRequestDiscount}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Modal */}
            {showAuditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full m-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Audit Trail</h3>
                            <button onClick={() => setShowAuditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {auditTrail.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No audit records found</p>
                            ) : (
                                auditTrail.map((entry, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <div>
                                            <p className="font-medium text-gray-900">{entry.action}</p>
                                            <p className="text-sm text-gray-500">{entry.details}</p>
                                            <p className="text-xs text-gray-400">{new Date(entry.performedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BillDetailsModal = ({
    bill,
    onClose,
    onFinalize,
    onCollectPayment,
    onRequestDiscount,
    onApproveDiscount,
    onViewAudit,
    onSetResponsibility,
    navigate
}) => {
    const balance = (bill.grandTotal || 0) - (bill.paidAmount || 0);
    const hasDiscount = bill.discountRequest?.status === 'pending';
    const discountApproved = bill.discountRequest?.status === 'approved';
    const [responsibilityMode, setResponsibilityMode] = useState('patient'); // patient, insurance, split
    const [splitUnsaved, setSplitUnsaved] = useState({ patient: 0, insurance: 0 });

    const handleSaveResponsibility = async () => {
        let payload = { patientAmount: 0, insuranceAmount: 0 };
        if (responsibilityMode === 'patient') {
            payload.patientAmount = bill.grandTotal;
        } else if (responsibilityMode === 'insurance') {
            payload.insuranceAmount = bill.grandTotal;
        } else {
            payload.patientAmount = Number(splitUnsaved.patient);
            payload.insuranceAmount = Number(splitUnsaved.insurance);
        }

        if (payload.patientAmount + payload.insuranceAmount !== bill.grandTotal) {
            return toast.error(`Total must equal bill amount (₹${bill.grandTotal})`);
        }

        await onSetResponsibility(payload);

        // If insurance pays fully, redirect immediately to insurance claim creation
        if (responsibilityMode === 'insurance' && navigate) {
            onClose();
            navigate('/dashboard/insurance', {
                state: {
                    prefillPatient: bill.patient,
                    prefillClaimAmount: bill.grandTotal,
                    billId: bill._id,
                    billNumber: bill.billNumber
                }
            });
        }
    };

    // Navigate to insurance for split payment after patient share is fully paid
    const handleNavigateToInsuranceClaim = () => {
        if (navigate) {
            const insuranceAmount = bill.paymentResponsibility?.insuranceAmount || 0;
            onClose();
            navigate('/dashboard/insurance', {
                state: {
                    prefillPatient: bill.patient,
                    prefillClaimAmount: insuranceAmount,
                    billId: bill._id,
                    billNumber: bill.billNumber
                }
            });
        }
    };

    // Calculate Paid Status
    // Assume all paidAmount goes to Patient share first for now (simplified)
    const patientPaid = bill.paidAmount || 0;
    const patientDue = (bill.paymentResponsibility?.patientAmount || 0) - patientPaid;

    const showResponsibilitySetup = bill.status === 'finalized' &&
        (!bill.paymentResponsibility || (bill.paymentResponsibility.patientAmount === 0 && bill.paymentResponsibility.insuranceAmount === 0));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{bill.billNumber}</h2>
                        <span className={`text-xs px-2 py-1 rounded-full ${bill.status === 'finalized' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                            {bill.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onViewAudit} className="p-2 hover:bg-gray-100 rounded-full"><History size={20} /></button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Items Table (Simplified view) */}
                    <div className="mb-6 border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Item</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.items.map((item, i) => (
                                    <tr key={i} className="border-t border-gray-100">
                                        <td className="px-4 py-2">{item.description}</td>
                                        <td className="px-4 py-2 text-right">₹{item.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex justify-between mb-2"><span>Total</span><span className="font-bold">₹{bill.grandTotal}</span></div>
                        <div className="flex justify-between mb-2 text-green-600"><span>Paid</span><span>-₹{bill.paidAmount}</span></div>
                        <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                            <span>Balance Due</span>
                            <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>₹{balance}</span>
                        </div>
                    </div>

                    {/* Payment Responsibility Section */}
                    {showResponsibilitySetup && (
                        <div className="border-t pt-4">
                            <h3 className="font-bold text-gray-800 mb-3 block">Who is paying?</h3>
                            <div className="flex gap-2 mb-4">
                                {['patient', 'insurance', 'split'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setResponsibilityMode(mode)}
                                        className={`px-4 py-2 rounded-lg capitalize border ${responsibilityMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                    >
                                        {mode} Pay
                                    </button>
                                ))}
                            </div>

                            {responsibilityMode === 'split' && (
                                <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-lg">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Patient Share</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded"
                                            placeholder="0"
                                            onChange={e => setSplitUnsaved({ ...splitUnsaved, patient: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Insurance Share</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded"
                                            placeholder="0"
                                            onChange={e => setSplitUnsaved({ ...splitUnsaved, insurance: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {responsibilityMode === 'insurance' && (
                                <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg">
                                    Full amount (₹{bill.grandTotal}) will be assigned to Insurance.
                                </div>
                            )}

                            <button onClick={handleSaveResponsibility} className="w-full py-2 bg-slate-800 text-white rounded-lg font-medium">
                                Confirm Responsibility Plan
                            </button>
                        </div>
                    )}

                    {/* Active Responsibility View */}
                    {bill.paymentResponsibility && bill.paymentResponsibility.patientAmount + bill.paymentResponsibility.insuranceAmount > 0 && (
                        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Patient Card */}
                            <div className="border rounded-xl p-4 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-700 flex items-center gap-2"><User size={16} /> Patient</span>
                                    {patientDue <= 0 ? <CheckCircle size={16} className="text-green-500" /> : null}
                                </div>
                                <div className="text-2xl font-bold mb-1">₹{bill.paymentResponsibility.patientAmount?.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mb-4">Share Amount</div>

                                {patientDue > 0 ? (
                                    <button
                                        onClick={onCollectPayment}
                                        className="w-full py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700"
                                    >
                                        Collect ₹{patientDue.toLocaleString()}
                                    </button>
                                ) : (
                                    <div className="bg-green-50 text-green-700 p-2 rounded text-center text-sm font-medium">Fully Paid</div>
                                )}
                            </div>

                            {/* Insurance Card */}
                            <div className="border rounded-xl p-4 bg-slate-50 relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-700 flex items-center gap-2"><Shield size={16} /> Insurance</span>
                                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded capitalize">{bill.insuranceStatus || 'pending'}</span>
                                </div>
                                <div className="text-2xl font-bold mb-1">₹{bill.paymentResponsibility.insuranceAmount?.toLocaleString()}</div>
                                <div className="text-xs text-gray-500 mb-4">Claim Amount</div>

                                {/* Show Create Claim button when patient share is paid and no claim linked yet */}
                                {patientDue <= 0 && bill.paymentResponsibility.insuranceAmount > 0 && !bill.insuranceClaim ? (
                                    <button
                                        onClick={handleNavigateToInsuranceClaim}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                                    >
                                        <Shield size={14} /> Create Insurance Claim
                                    </button>
                                ) : (
                                    <div className="text-xs text-slate-500">
                                        {bill.insuranceClaim ? 'Linked to Claim' : patientDue > 0 ? 'Collect patient share first' : 'Pending Claim Linkage'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                    {bill.status === 'draft' && (
                        <button onClick={onFinalize} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium">Finalize Bill</button>
                    )}
                    {bill.status === 'finalized' && !bill.paymentResponsibility && (
                        <span className="text-gray-500 text-sm self-center">Set Responsibility above to proceed</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Billing;
