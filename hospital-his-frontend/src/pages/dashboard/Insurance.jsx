import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Shield, FileText, Plus, Search, Clock, CheckCircle, XCircle,
    AlertCircle, DollarSign, Building, User, Calendar, ChevronRight,
    Eye, Upload, ArrowRight, Activity, Filter, Download, Trash2, Edit2
} from 'lucide-react';
import insuranceService from '../../services/insurance.service';
import patientService from '../../services/patients.service';
import { toast } from 'react-hot-toast';

const Insurance = () => {
    // Get prefill data from navigation state (from Billing page)
    const location = useLocation();
    const prefillData = location.state;

    // UI State
    const [activeTab, setActiveTab] = useState('claims'); // claims, preauth, tpa
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [loading, setLoading] = useState(true);

    // Data State
    const [claims, setClaims] = useState([]);
    const [providers, setProviders] = useState([]);
    const [tpaProviders, setTpaProviders] = useState([]);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        amount: 0
    });

    useEffect(() => {
        fetchData();
        // Auto-open modal if prefill data exists from billing redirect
        if (prefillData?.prefillPatient) {
            setShowCreateModal(true);
        }
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [claimsRes, providersRes, tpaRes] = await Promise.all([
                insuranceService.getAllClaims({ limit: 50 }),
                insuranceService.getProviders(),
                insuranceService.getTPAProviders()
            ]);

            setClaims(claimsRes.data || []);
            setProviders(providersRes.data || []);
            setTpaProviders(tpaRes.data || []);

            // Calculate Stats
            const claimsData = claimsRes.data || [];
            setStats({
                total: claimsData.length,
                pending: claimsData.filter(c => c.status === 'pending').length,
                approved: claimsData.filter(c => c.status === 'approved').length,
                amount: claimsData.reduce((sum, c) => sum + (c.approvedAmount || 0), 0)
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load insurance data');
        } finally {
            setLoading(false);
        }
    };

    // --- Sub-Components ---

    const StatusBadge = ({ status }) => {
        const styles = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'submitted': 'bg-blue-100 text-blue-800',
            'pre-authorized': 'bg-purple-100 text-purple-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800',
            'settled': 'bg-teal-100 text-teal-800'
        };
        const icons = {
            'pending': Clock,
            'submitted': FileText,
            'pre-authorized': Shield,
            'approved': CheckCircle,
            'rejected': XCircle,
            'settled': DollarSign
        };
        const Icon = icons[status] || AlertCircle;

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${styles[status] || styles.pending}`}>
                <Icon size={12} />
                <span className="capitalize">{status?.replace('-', ' ')}</span>
            </span>
        );
    };

    // --- Create Claim Modal (Wizard) ---
    const CreateClaimModal = ({ prefillPatient, prefillClaimAmount, billId, billNumber, onModalClose }) => {
        const [step, setStep] = useState(1);
        const [patientSearchResults, setPatientSearchResults] = useState([]);
        const [selectedPatient, setSelectedPatient] = useState(prefillPatient || null);
        const [searchQuery, setSearchQuery] = useState('');

        const [formData, setFormData] = useState({
            provider: '',
            tpaProvider: '',
            policyNumber: '',
            claimAmount: prefillClaimAmount || '',
            icdCodes: [{ code: 'A00', description: 'Cholera' }],
            admissionDate: new Date().toISOString().split('T')[0],
            isPreAuth: false,
            linkedBill: billId || null,
            linkedBillNumber: billNumber || null
        });

        const handleSearchPatients = async (query) => {
            setSearchQuery(query);
            if (!query || query.length < 2) {
                setPatientSearchResults([]);
                return;
            }
            try {
                const res = await patientService.searchPatients(query);
                setPatientSearchResults(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error('Search error:', error);
            }
        };

        const handleSelectPatient = (patient) => {
            setSelectedPatient(patient);
            setPatientSearchResults([]);
            setSearchQuery('');
        };

        const handleSubmit = async () => {
            if (!selectedPatient) return toast.error("Please select a patient");
            if (!formData.provider) return toast.error("Please select an insurance provider");
            if (!formData.policyNumber) return toast.error("Please enter policy number");
            if (!formData.claimAmount) return toast.error("Please enter claim amount");

            try {
                // Sanitize payload
                const payload = {
                    ...formData,
                    patient: selectedPatient._id,
                    provider: formData.provider,
                    tpaProvider: formData.tpaProvider || undefined,
                    status: 'pending'
                };

                await insuranceService.createClaim(payload);
                toast.success(formData.isPreAuth ? 'Pre-Auth Requested' : 'Claim Created');
                // Use onModalClose if available (clears navigation state), otherwise just close
                if (onModalClose) {
                    onModalClose();
                } else {
                    setShowCreateModal(false);
                }
                fetchData();
            } catch (error) {
                console.error(error);
                toast.error('Failed to submit request');
            }
        };

        const handleCloseModal = () => {
            if (onModalClose) {
                onModalClose();
            } else {
                setShowCreateModal(false);
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">New Insurance Request</h2>
                            <p className="text-sm text-gray-500">Step {step} of 2</p>
                            {formData.linkedBillNumber && (
                                <p className="text-xs text-blue-600 font-medium">Linked to Bill: {formData.linkedBillNumber}</p>
                            )}
                        </div>
                        <button onClick={handleCloseModal} className="p-2 hover:bg-white rounded-full"><XCircle size={24} className="text-gray-400" /></button>
                    </div>

                    <div className="p-8 overflow-y-auto flex-1">
                        {step === 1 && (
                            <div className="space-y-6">
                                {/* Patient Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>

                                    {!selectedPatient ? (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                                <input
                                                    className="w-full pl-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Search by name, ID, or phone..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearchPatients(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            {patientSearchResults.length > 0 && (
                                                <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10">
                                                    {patientSearchResults.map(p => (
                                                        <div
                                                            key={p._id}
                                                            onClick={() => handleSelectPatient(p)}
                                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="font-medium text-slate-800">{p.firstName} {p.lastName}</div>
                                                            <div className="text-xs text-gray-500 flex gap-2">
                                                                <span>ID: {p.patientId}</span>
                                                                <span>•</span>
                                                                <span>{p.gender}, {p.age}y</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
                                            <div className="flex gap-3 items-center">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                                    {selectedPatient.firstName[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                                                    <div className="text-xs text-slate-500">ID: {selectedPatient.patientId} • {selectedPatient.phone}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedPatient(null)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Provider</label>
                                        <select
                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                                            value={formData.provider}
                                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                        >
                                            <option value="">Select Provider...</option>
                                            {providers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">TPA (Optional)</label>
                                        <select
                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                                            value={formData.tpaProvider}
                                            onChange={(e) => setFormData({ ...formData, tpaProvider: e.target.value })}
                                        >
                                            <option value="">Select TPA...</option>
                                            {tpaProviders.map(t => <option key={t._id} value={t._id}>{t.tpaName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number</label>
                                    <input
                                        className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                                        value={formData.policyNumber}
                                        onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                                        placeholder="e.g. POL-123456789"
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                        <Activity size={18} /> Medical Details
                                    </h4>
                                    <p className="text-sm text-blue-600 mb-4">Mandatory for claim processing</p>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Request Type</label>
                                            <div className="flex bg-white rounded-lg p-1 border border-blue-200">
                                                <button
                                                    onClick={() => setFormData({ ...formData, isPreAuth: true })}
                                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.isPreAuth ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'}`}
                                                >
                                                    Pre-Auth
                                                </button>
                                                <button
                                                    onClick={() => setFormData({ ...formData, isPreAuth: false })}
                                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!formData.isPreAuth ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'}`}
                                                >
                                                    Final Claim
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Est. Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-slate-400">₹</span>
                                                <input
                                                    type="number"
                                                    className="w-full pl-8 p-2 border border-blue-200 rounded-lg outline-none focus:border-blue-500"
                                                    value={formData.claimAmount}
                                                    onChange={(e) => setFormData({ ...formData, claimAmount: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Primary ICD-10 Code</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="w-24 p-2 border border-blue-200 rounded-lg font-mono text-center uppercase"
                                                value={formData.icdCodes[0].code}
                                                onChange={(e) => setFormData({ ...formData, icdCodes: [{ ...formData.icdCodes[0], code: e.target.value }] })}
                                                placeholder="Code"
                                            />
                                            <input
                                                className="flex-1 p-2 border border-blue-200 rounded-lg"
                                                value={formData.icdCodes[0].description}
                                                onChange={(e) => setFormData({ ...formData, icdCodes: [{ ...formData.icdCodes[0], description: e.target.value }] })}
                                                placeholder="Description"
                                            />
                                        </div>
                                        <p className="text-xs text-blue-400 mt-1 flex items-center gap-1"><Search size={10} /> Enter ICD-10 Code manually (Master search disabled in demo)</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-between bg-slate-50">
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg transition-colors">Back</button>
                        ) : <div></div>}

                        {step < 2 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!selectedPatient || !formData.provider || !formData.policyNumber}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Next Step <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-lg shadow-green-200 flex items-center gap-2"
                            >
                                <CheckCircle size={18} /> Submit Request
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ClaimDetailModal = () => {
        if (!selectedClaim) return null;

        const handleAction = async (action) => {
            if (action === 'settle') {
                const amount = prompt(`Enter Settlement Amount (Approved: ₹${selectedClaim.approvedAmount?.toLocaleString()})`, selectedClaim.approvedAmount);
                if (!amount) return;
                const reference = prompt('Enter Payment/Transaction Reference:');
                if (!reference) return;

                try {
                    await insuranceService.settleClaim(selectedClaim._id, Number(amount), reference, 'Settled via Admin UI');
                    toast.success('Claim Settled Successfully');
                    setSelectedClaim(null);
                    fetchData();
                } catch (e) { toast.error('Failed to settle claim'); }
                return;
            }

            const reason = prompt(`Enter remarks for ${action}:`);
            if (!reason) return;
            try {
                if (action === 'approve') await insuranceService.approveClaim(selectedClaim._id, selectedClaim.claimAmount, reason);
                if (action === 'reject') await insuranceService.rejectClaim(selectedClaim._id, reason);
                toast.success(`Claim ${action}d`);
                setSelectedClaim(null);
                fetchData();
            } catch (e) { toast.error(`Failed to ${action}`); }
        };

        const user = JSON.parse(localStorage.getItem('user'));
        const canApprove = ['admin', 'insurance'].includes(user?.role);

        return (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
                <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slide-in-right">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{selectedClaim.claimNumber}</h2>
                            <p className="text-sm text-gray-500">Last updated: {new Date(selectedClaim.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => setSelectedClaim(null)} className="p-2 hover:bg-slate-100 rounded-full"><XCircle size={24} className="text-gray-400" /></button>
                    </div>

                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-gray-500">Current Status</span>
                                <StatusBadge status={selectedClaim.status} />
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-xs text-gray-400 uppercase">Claim Amount</div>
                                    <div className="text-2xl font-bold text-slate-800">₹{selectedClaim.claimAmount?.toLocaleString()}</div>
                                </div>
                                {selectedClaim.approvedAmount > 0 && (
                                    <div className="text-right">
                                        <div className="text-xs text-green-600 uppercase">Approved</div>
                                        <div className="text-xl font-bold text-green-600">₹{selectedClaim.approvedAmount?.toLocaleString()}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Patient & Policy */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Policy Details</h3>
                            <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-gray-400 text-xs">Patient</span>
                                        <span className="font-medium">{selectedClaim.patient?.firstName} {selectedClaim.patient?.lastName}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-400 text-xs">Provider</span>
                                        <span className="font-medium">{selectedClaim.provider?.name}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-gray-400 text-xs">Policy No</span>
                                        <span className="font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit">{selectedClaim.policyNumber}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Medical Info */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Medical Context</h3>
                            <div className="flex gap-2 flex-wrap">
                                {selectedClaim.icdCodes?.map((icd, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">
                                        {icd.code} - {icd.description}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        {canApprove && (
                            <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
                                {selectedClaim.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleAction('approve')} className="py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Approve Request</button>
                                        <button onClick={() => handleAction('reject')} className="py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100">Reject</button>
                                    </>
                                )}
                                {selectedClaim.status === 'approved' && (
                                    <button
                                        onClick={() => handleAction('settle')}
                                        className="col-span-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                                    >
                                        Process Settlement
                                    </button>
                                )}
                                {selectedClaim.status === 'rejected' && (
                                    <div className="col-span-2 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                                        <strong>Rejected:</strong> {selectedClaim.rejectionReason}
                                    </div>
                                )}
                            </div>
                        )}
                        {!canApprove && (selectedClaim.status === 'rejected') && (
                            <div className="pt-6 border-t border-gray-100">
                                <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                                    <strong>Rejected:</strong> {selectedClaim.rejectionReason}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Insurance & TPA</h1>
                    <p className="text-slate-500">Manage claims, pre-authorizations, and settlements</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-lg shadow-blue-200"
                >
                    <Plus size={18} /> New Request
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={20} /></div>
                        <span className="text-gray-500 text-sm font-medium">Total Claims</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><Clock size={20} /></div>
                        <span className="text-gray-500 text-sm font-medium">Pending Action</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
                        <span className="text-gray-500 text-sm font-medium">Approved</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{stats.approved}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><DollarSign size={20} /></div>
                        <span className="text-gray-500 text-sm font-medium">Approved Value</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">₹{stats.amount.toLocaleString()}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    {['claims', 'preauth', 'tpa'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'preauth' ? 'Pre-Authorization' : tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {activeTab === 'claims' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-500 text-sm">Claim #</th>
                                    <th className="px-6 py-4 font-semibold text-gray-500 text-sm">Patient</th>
                                    <th className="px-6 py-4 font-semibold text-gray-500 text-sm">Provider</th>
                                    <th className="px-6 py-4 font-semibold text-gray-500 text-sm">Amount</th>
                                    <th className="px-6 py-4 font-semibold text-gray-500 text-sm">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-500 text-sm text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {claims.filter(c => c.status !== 'pre-authorized').map((claim) => (
                                    <tr key={claim._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{claim.claimNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{claim.patient?.firstName} {claim.patient?.lastName}</div>
                                            <div className="text-xs text-gray-400">{claim.patient?.patientId}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{claim.provider?.name}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">₹{claim.claimAmount?.toLocaleString()}</td>
                                        <td className="px-6 py-4"><StatusBadge status={claim.status} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedClaim(claim)}
                                                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium text-sm inline-flex items-center gap-1"
                                            >
                                                View <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {claims.length === 0 && <div className="p-8 text-center text-gray-400">No claims found.</div>}
                    </div>
                )}

                {activeTab === 'preauth' && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6 bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <div className="flex gap-4 items-center">
                                <div className="p-3 bg-white rounded-full shadow-sm text-purple-600"><Shield size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-purple-900">Pre-Authorization Queue</h3>
                                    <p className="text-sm text-purple-700">Requests requiring approval before treatment</p>
                                </div>
                            </div>
                        </div>
                        {/* Reuse table structure or create grid for Pre-auth requests */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {claims.filter(c => c.status === 'pending' || c.status === 'pre-authorized').map(req => (
                                <div key={req._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative">
                                    <div className="absolute top-4 right-4"><StatusBadge status={req.status} /></div>
                                    <h4 className="font-bold text-slate-800 mb-1">{req.patient?.firstName} {req.patient?.lastName}</h4>
                                    <p className="text-xs text-gray-500 mb-4 font-mono">{req.claimNumber}</p>

                                    <div className="space-y-2 text-sm mb-4">
                                        <div className="flex justify-between text-gray-600"><span>Est. Cost:</span> <span className="font-bold">₹{req.claimAmount?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-gray-600"><span>Provider:</span> <span>{req.provider?.name}</span></div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedClaim(req)}
                                        className="w-full py-2 bg-white border border-gray-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50"
                                    >
                                        Review Request
                                    </button>
                                </div>
                            ))}
                        </div>
                        {claims.filter(c => c.status === 'pending' || c.status === 'pre-authorized').length === 0 && (
                            <div className="p-8 text-center text-gray-400">No pre-authorization requests found.</div>
                        )}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateClaimModal
                    prefillPatient={prefillData?.prefillPatient}
                    prefillClaimAmount={prefillData?.prefillClaimAmount}
                    billId={prefillData?.billId}
                    billNumber={prefillData?.billNumber}
                    onModalClose={() => {
                        setShowCreateModal(false);
                        // Clear navigation state to prevent modal reopening on refresh
                        window.history.replaceState({}, document.title);
                    }}
                />
            )}
            {selectedClaim && <ClaimDetailModal />}
        </div>
    );
};

export default Insurance;
