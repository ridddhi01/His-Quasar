import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bed, LayoutGrid, List, Filter, Search,
    MoreVertical, User, ArrowRightLeft, LogOut,
    Settings, Info, CheckCircle, AlertCircle,
    Clock, Building, Activity, Plus
} from 'lucide-react';
import bedService from '../../services/bed.service';
import ipdService from '../../services/ipd.service';
import toast from 'react-hot-toast';

const BedManagement = () => {
    const [viewMode, setViewMode] = useState('grid');
    const [wards, setWards] = useState([]);
    const [selectedWard, setSelectedWard] = useState('all');
    const [beds, setBeds] = useState([]);
    const [occupancy, setOccupancy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBed, setSelectedBed] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [availableBeds, setAvailableBeds] = useState([]);
    const [targetBedId, setTargetBedId] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchBeds();
    }, [selectedWard]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [wardsRes, occupancyRes] = await Promise.all([
                bedService.getWards(),
                bedService.getOccupancy()
            ]);
            setWards(wardsRes.data || []);
            setOccupancy(occupancyRes.data || null);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Failed to load wards and stats');
        }
    };

    const fetchBeds = async () => {
        setLoading(true);
        try {
            const params = selectedWard === 'all' ? {} : { ward: selectedWard };
            const res = await bedService.getAllBeds(params);
            setBeds(res.data || []);
        } catch (error) {
            console.error('Error fetching beds:', error);
            toast.error('Failed to load beds');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableBeds = async () => {
        try {
            const res = await bedService.getAllBeds({ status: 'available' });
            // Filter out the current bed if it was somehow in the list
            setAvailableBeds(res.data || []);
        } catch (error) {
            console.error('Error fetching available beds:', error);
        }
    };

    const handleBedClick = (bed) => {
        setSelectedBed(bed);
        setShowDetailModal(true);
    };

    const openTransferModal = () => {
        setShowDetailModal(false);
        setTargetBedId('');
        fetchAvailableBeds();
        setShowTransferModal(true);
    };

    const handleTransfer = async () => {
        if (!targetBedId) {
            toast.error('Please select a target bed');
            return;
        }

        setTransferLoading(true);
        try {
            await bedService.transferBed({
                fromBedId: selectedBed._id,
                toBedId: targetBedId
            });
            toast.success('Patient transferred successfully');
            setShowTransferModal(false);
            fetchBeds();
            fetchInitialData(); // Update occupancy stats
        } catch (error) {
            console.error('Transfer error:', error);
            toast.error(error.response?.data?.message || 'Failed to transfer patient');
        } finally {
            setTransferLoading(false);
        }
    };

    const handleDischarge = async () => {
        if (!selectedBed || !selectedBed.currentAdmission) {
            console.error('Discharge error - selectedBed:', selectedBed);
            toast.error('No admission found for this bed');
            return;
        }

        if (!window.confirm('Are you sure you want to discharge this patient? This will release the bed.')) {
            return;
        }

        setTransferLoading(true);
        const admissionId = selectedBed.currentAdmission._id || selectedBed.currentAdmission;
        console.log('Discharging admission:', admissionId);
        try {
            await ipdService.dischargePatient(admissionId);
            toast.success('Patient Discharged Successfully');
            setShowDetailModal(false);
            fetchBeds();
            fetchInitialData();
        } catch (error) {
            console.error('Discharge error:', error);
            toast.error(error.response?.data?.message || 'Failed to discharge patient');
        } finally {
            setTransferLoading(false);
        }
    };

    const filteredBeds = beds.filter(bed =>
        bed.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bed.currentPatient && (
            bed.currentPatient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bed.currentPatient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bed.currentPatient.patientId.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'occupied': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'under-maintenance': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'reserved': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getBedTypeLabel = (type) => {
        return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Bed className="text-primary" /> Bed Management
                    </h1>
                    <p className="text-slate-500">Monitor and manage ward occupancy and bed allocations</p>
                </div>

                {occupancy && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total', value: occupancy.total, icon: <Building size={18} />, color: 'blue' },
                            { label: 'Available', value: occupancy.available, icon: <CheckCircle size={18} />, color: 'emerald' },
                            { label: 'Occupied', value: occupancy.occupied, icon: <Activity size={18} />, color: 'rose' },
                            { label: 'Occupancy', value: `${occupancy.occupancyRate}%`, icon: <Clock size={18} />, color: 'amber' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
                                    <div className="text-lg font-bold text-slate-800">{stat.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
                    <button
                        onClick={() => setSelectedWard('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedWard === 'all'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        All Wards
                    </button>
                    {wards.map(ward => (
                        <button
                            key={ward._id}
                            onClick={() => setSelectedWard(ward._id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedWard === ward._id
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {ward.name}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Bed # or Patient..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-primary outline-none rounded-lg text-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content View */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading beds...</p>
                </div>
            ) : filteredBeds.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No beds found</h3>
                    <p className="text-slate-500">Try adjusting your filters or search query</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredBeds.map(bed => (
                        <motion.div
                            key={bed._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -4 }}
                            onClick={() => handleBedClick(bed)}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                        >
                            <div className="p-4 flex justify-between items-start mb-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bed.status === 'occupied' ? 'bg-rose-100 text-rose-600' :
                                        bed.status === 'available' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                    } group-hover:scale-110 transition-transform`}>
                                    <Bed size={22} />
                                </div>
                                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(bed.status)}`}>
                                    {bed.status}
                                </div>
                            </div>

                            <div className="px-5 pb-5">
                                <div className="text-lg font-bold text-slate-800 mb-1">{bed.bedNumber}</div>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-4">
                                    <Building size={12} /> {bed.ward?.name} • {getBedTypeLabel(bed.bedType)}
                                </div>

                                {bed.status === 'occupied' && bed.currentPatient ? (
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                {bed.currentPatient.firstName[0]}{bed.currentPatient.lastName[0]}
                                            </div>
                                            <div className="text-sm font-bold text-slate-700 truncate">
                                                {bed.currentPatient.firstName} {bed.currentPatient.lastName}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 pl-8">ID: {bed.currentPatient.patientId}</div>
                                    </div>
                                ) : (
                                    <div className="py-2 text-sm text-slate-400 italic">No patient assigned</div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {/* Placeholder for adding new bed if admin */}
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[200px] hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all mb-3">
                            <Plus size={24} />
                        </div>
                        <span className="text-slate-500 font-medium group-hover:text-primary transition-all">Add Bed</span>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Bed #</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ward</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredBeds.map(bed => (
                                <tr key={bed._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{bed.bedNumber}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{bed.ward?.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{getBedTypeLabel(bed.bedType)}</td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(bed.status)}`}>
                                            {bed.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {bed.currentPatient ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {bed.currentPatient.firstName[0]}{bed.currentPatient.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700">{bed.currentPatient.firstName} {bed.currentPatient.lastName}</div>
                                                    <div className="text-[10px] text-slate-400">{bed.currentPatient.patientId}</div>
                                                </div>
                                            </div>
                                        ) : <span className="text-slate-300 text-sm italic">None</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleBedClick(bed)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-primary">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bed Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedBed && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetailModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
                        >
                            <div className="h-24 bg-primary relative">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-all"
                                >
                                    <X size={18} />
                                </button>
                                <div className="absolute left-8 -bottom-8 w-16 h-16 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center text-primary">
                                    <Bed size={32} />
                                </div>
                            </div>

                            <div className="pt-12 px-8 pb-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">Bed {selectedBed.bedNumber}</h2>
                                        <p className="text-slate-500">{selectedBed.ward?.name} • {getBedTypeLabel(selectedBed.bedType)}</p>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(selectedBed.status)}`}>
                                        {selectedBed.status}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {selectedBed.status === 'occupied' && selectedBed.currentPatient ? (
                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-bold">
                                                    {selectedBed.currentPatient.firstName[0]}{selectedBed.currentPatient.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold text-slate-800">
                                                        {selectedBed.currentPatient.firstName} {selectedBed.currentPatient.lastName}
                                                    </div>
                                                    <div className="text-sm text-slate-500 font-medium">Patient ID: {selectedBed.currentPatient.patientId}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/60">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Admission ID</div>
                                                    <div className="text-sm font-bold text-slate-700">#{selectedBed.currentAdmission?.admissionNumber || 'ADM-00452'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Admitted On</div>
                                                    <div className="text-sm font-bold text-slate-700">22 Jan 2026</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                                <User size={24} />
                                            </div>
                                            <p className="text-slate-500 font-medium">No patient currently allocated</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {selectedBed.status === 'occupied' ? (
                                            <>
                                                <button
                                                    onClick={openTransferModal}
                                                    className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ArrowRightLeft size={18} /> Transfer
                                                </button>
                                                <button
                                                    onClick={handleDischarge}
                                                    disabled={transferLoading}
                                                    className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <LogOut size={18} /> {transferLoading ? 'Discharging...' : 'Discharge'}
                                                </button>
                                            </>
                                        ) : (
                                            <button className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-lg">
                                                <Plus size={20} /> Allocate Patient
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex justify-center gap-4 text-slate-400">
                                        <button className="p-2 hover:bg-slate-100 rounded-full transition-all" title="View History"><Info size={18} /></button>
                                        <button className="p-2 hover:bg-slate-100 rounded-full transition-all" title="Edit Bed Settings"><Settings size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transfer Modal */}
            <AnimatePresence>
                {showTransferModal && selectedBed && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTransferModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-8"
                        >
                            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <ArrowRightLeft className="text-primary" /> Transfer Patient
                            </h2>
                            <p className="text-slate-500 mb-8">Move patient from Bed {selectedBed.bedNumber} to a new available bed.</p>

                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-primary font-bold">
                                        {selectedBed.bedNumber}
                                    </div>
                                    <ArrowRightLeft className="text-slate-300 shrink-0" size={20} />
                                    <div className="flex-1">
                                        <select
                                            value={targetBedId}
                                            onChange={(e) => setTargetBedId(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary font-bold text-slate-700"
                                        >
                                            <option value="">Select Target Bed...</option>
                                            {availableBeds.map(bed => (
                                                <option key={bed._id} value={bed._id}>
                                                    Bed {bed.bedNumber} ({bed.ward?.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-amber-700 text-sm">
                                    <AlertCircle className="shrink-0" size={18} />
                                    <p>Transferring the patient will automatically free up Bed {selectedBed.bedNumber} and update the admission records.</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowTransferModal(false)}
                                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTransfer}
                                        disabled={transferLoading}
                                        className="flex-1 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {transferLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        ) : 'Confirm Move'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Simple X icon missing from previous list
const X = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default BedManagement;
