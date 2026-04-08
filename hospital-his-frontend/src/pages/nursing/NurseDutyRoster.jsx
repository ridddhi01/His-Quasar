import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Users,
    Bed,
    Clock,
    Plus,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    X,
    Check,
    AlertCircle,
    Sun,
    Sunset,
    Moon,
    UserPlus,
    Trash2,
    Edit3,
    Search,
    Filter,
    Building2,
    ClipboardList
} from 'lucide-react';
import * as carePlanService from '../../services/careplan.service';
import bedService from '../../services/bed.service';

/**
 * Nurse Duty Roster Page
 * For Nurse Supervisors to manage shift assignments and patient allocation
 */
const NurseDutyRoster = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [nurses, setNurses] = useState([]);
    const [wards, setWards] = useState([]);
    const [roster, setRoster] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedWard, setSelectedWard] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignPatientsModal, setShowAssignPatientsModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [wardPatients, setWardPatients] = useState([]);

    // Create shift form state
    const [newShift, setNewShift] = useState({
        nurseId: '',
        shiftType: 'morning',
        shiftDate: new Date().toISOString().split('T')[0],
        wardIds: [],
        nurseRole: 'staff_nurse'
    });

    // Load initial data
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Load roster when date or ward changes
    useEffect(() => {
        fetchRoster();
    }, [selectedDate, selectedWard]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // Fetch nurses and wards
            const [nursesRes, wardsRes] = await Promise.all([
                carePlanService.getAllNurses(),
                bedService.getWards()
            ]);

            setNurses(nursesRes.data || []);
            setWards(wardsRes.data || []); // Use real wards

        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoster = async () => {
        try {
            const startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);

            const params = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };
            if (selectedWard !== 'all') {
                params.wardId = selectedWard;
            }

            const response = await carePlanService.getDutyRoster(params);
            setRoster(response.data || []);
        } catch (error) {
            console.error('Error fetching roster:', error);
            // Mock data for display
            setRoster([]);
        }
    };

    const fetchWardPatients = async (wardId) => {
        try {
            const response = await carePlanService.getWardPatients(wardId);
            setWardPatients(response.data || []);
        } catch (error) {
            console.error('Error fetching ward patients:', error);
            setWardPatients([]);
        }
    };

    const handleCreateShift = async () => {
        try {
            await carePlanService.createShiftAssignment({
                nurseId: newShift.nurseId,
                shiftType: newShift.shiftType,
                shiftDate: newShift.shiftDate,
                wardIds: newShift.wardIds,
                nurseRole: newShift.nurseRole
            });
            setShowCreateModal(false);
            setNewShift({
                nurseId: '',
                shiftType: 'morning',
                shiftDate: selectedDate.toISOString().split('T')[0],
                wardIds: [],
                nurseRole: 'staff_nurse'
            });
            await fetchRoster();
        } catch (error) {
            console.error('Error creating shift:', error);
            alert('Failed to create shift: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleCancelShift = async (shiftId) => {
        if (!confirm('Are you sure you want to cancel this shift?')) return;
        try {
            await carePlanService.cancelShiftAssignment(shiftId);
            await fetchRoster();
        } catch (error) {
            console.error('Error cancelling shift:', error);
            alert('Failed to cancel shift');
        }
    };

    const handleAssignPatients = async (patientAssignments) => {
        try {
            await carePlanService.assignPatientsToNurse(selectedShift._id, patientAssignments);
            setShowAssignPatientsModal(false);
            setSelectedShift(null);
            await fetchRoster();
        } catch (error) {
            console.error('Error assigning patients:', error);
            alert('Failed to assign patients');
        }
    };

    // Navigation functions
    const goToPreviousDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(prev);
    };

    const goToNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    // Get shift icon
    const getShiftIcon = (type) => {
        switch (type) {
            case 'morning': return <Sun className="w-4 h-4 text-amber-500" />;
            case 'evening': return <Sunset className="w-4 h-4 text-orange-500" />;
            case 'night': return <Moon className="w-4 h-4 text-indigo-500" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    // Get shift color
    const getShiftColor = (type) => {
        switch (type) {
            case 'morning': return 'bg-amber-50 border-amber-200 text-amber-700';
            case 'evening': return 'bg-orange-50 border-orange-200 text-orange-700';
            case 'night': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
            default: return 'bg-gray-50 border-gray-200 text-gray-700';
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-gray-100 text-gray-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Group roster by shift type
    const groupedRoster = {
        morning: roster.filter(s => s.shiftType === 'morning'),
        evening: roster.filter(s => s.shiftType === 'evening'),
        night: roster.filter(s => s.shiftType === 'night')
    };

    // Format date for display
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Check if selected date is today
    const isToday = () => {
        const today = new Date();
        return selectedDate.toDateString() === today.toDateString();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="w-8 h-8" />
                            <div>
                                <h1 className="text-2xl font-bold">Duty Roster Management</h1>
                                <p className="text-purple-100 text-sm">
                                    Manage nurse shift assignments and patient allocation
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Shift
                            </button>
                            <button
                                onClick={fetchRoster}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Navigation & Filters */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Date Navigation */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToPreviousDay}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className="min-w-[280px] text-center">
                                    <div className="font-semibold text-gray-800">
                                        {formatDate(selectedDate)}
                                    </div>
                                    {isToday() && (
                                        <span className="text-xs text-purple-600 font-medium">Today</span>
                                    )}
                                </div>
                                <button
                                    onClick={goToNextDay}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                            {!isToday() && (
                                <button
                                    onClick={goToToday}
                                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                >
                                    Go to Today
                                </button>
                            )}
                        </div>

                        {/* Ward Filter */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <select
                                    value={selectedWard}
                                    onChange={(e) => setSelectedWard(e.target.value)}
                                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="all">All Wards</option>
                                    {wards.map(ward => (
                                        <option key={ward._id} value={ward._id}>
                                            {ward.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Morning Shift */}
                        <ShiftColumn
                            title="Morning Shift"
                            subtitle="6:00 AM - 2:00 PM"
                            icon={<Sun className="w-5 h-5" />}
                            shifts={groupedRoster.morning}
                            colorClass="from-amber-500 to-amber-600"
                            bgClass="bg-amber-50"
                            onAssignPatients={(shift) => {
                                setSelectedShift(shift);
                                if (shift.assignedWards?.[0]) {
                                    fetchWardPatients(shift.assignedWards[0]._id || shift.assignedWards[0]);
                                }
                                setShowAssignPatientsModal(true);
                            }}
                            onCancelShift={handleCancelShift}
                            getStatusColor={getStatusColor}
                            wards={wards}
                        />

                        {/* Evening Shift */}
                        <ShiftColumn
                            title="Evening Shift"
                            subtitle="2:00 PM - 10:00 PM"
                            icon={<Sunset className="w-5 h-5" />}
                            shifts={groupedRoster.evening}
                            colorClass="from-orange-500 to-orange-600"
                            bgClass="bg-orange-50"
                            onAssignPatients={(shift) => {
                                setSelectedShift(shift);
                                if (shift.assignedWards?.[0]) {
                                    fetchWardPatients(shift.assignedWards[0]._id || shift.assignedWards[0]);
                                }
                                setShowAssignPatientsModal(true);
                            }}
                            onCancelShift={handleCancelShift}
                            getStatusColor={getStatusColor}
                            wards={wards}
                        />

                        {/* Night Shift */}
                        <ShiftColumn
                            title="Night Shift"
                            subtitle="10:00 PM - 6:00 AM"
                            icon={<Moon className="w-5 h-5" />}
                            shifts={groupedRoster.night}
                            colorClass="from-indigo-500 to-indigo-600"
                            bgClass="bg-indigo-50"
                            onAssignPatients={(shift) => {
                                setSelectedShift(shift);
                                if (shift.assignedWards?.[0]) {
                                    fetchWardPatients(shift.assignedWards[0]._id || shift.assignedWards[0]);
                                }
                                setShowAssignPatientsModal(true);
                            }}
                            onCancelShift={handleCancelShift}
                            getStatusColor={getStatusColor}
                            wards={wards}
                        />
                    </div>
                )}
            </div>

            {/* Create Shift Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateShiftModal
                        show={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        nurses={nurses}
                        wards={wards}
                        newShift={newShift}
                        setNewShift={setNewShift}
                        onSubmit={handleCreateShift}
                        selectedDate={selectedDate}
                    />
                )}
            </AnimatePresence>

            {/* Assign Patients Modal */}
            <AnimatePresence>
                {showAssignPatientsModal && selectedShift && (
                    <AssignPatientsModal
                        show={showAssignPatientsModal}
                        onClose={() => {
                            setShowAssignPatientsModal(false);
                            setSelectedShift(null);
                        }}
                        shift={selectedShift}
                        patients={wardPatients}
                        onAssign={handleAssignPatients}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHIFT COLUMN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ShiftColumn = ({ title, subtitle, icon, shifts, colorClass, bgClass, onAssignPatients, onCancelShift, getStatusColor, wards }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${colorClass} text-white px-4 py-3`}>
                <div className="flex items-center gap-2">
                    {icon}
                    <div>
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-xs opacity-80">{subtitle}</p>
                    </div>
                </div>
                <div className="mt-2 text-sm opacity-90">
                    {shifts.length} nurse(s) assigned
                </div>
            </div>

            {/* Shifts List */}
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {shifts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No nurses assigned</p>
                    </div>
                ) : (
                    shifts.map((shift) => (
                        <div key={shift._id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center text-lg font-semibold`}>
                                        {shift.nurse?.profile?.firstName?.charAt(0) || 'N'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-800">
                                            {shift.nurse?.profile?.firstName} {shift.nurse?.profile?.lastName}
                                        </div>
                                        <div className="text-xs text-gray-500 capitalize">
                                            {shift.nurseRole?.replace('_', ' ') || 'Staff Nurse'}
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(shift.status)}`}>
                                    {shift.status}
                                </span>
                            </div>

                            {/* Assigned Wards */}
                            <div className="mb-2">
                                <div className="text-xs text-gray-500 mb-1">Assigned Wards:</div>
                                <div className="flex flex-wrap gap-1">
                                    {shift.assignedWards?.map((ward, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                            {typeof ward === 'object' ? ward.name : wards.find(w => w._id === ward)?.name || ward}
                                        </span>
                                    ))}
                                    {(!shift.assignedWards || shift.assignedWards.length === 0) && (
                                        <span className="text-xs text-gray-400">None assigned</span>
                                    )}
                                </div>
                            </div>

                            {/* Assigned Patients */}
                            <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1">
                                    Patients: {shift.assignedPatients?.length || 0}
                                </div>
                                {shift.assignedPatients?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {shift.assignedPatients.slice(0, 3).map((pa, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-xs">
                                                {pa.patient?.firstName || 'Patient'} - Bed {pa.bed?.bedNumber || 'N/A'}
                                            </span>
                                        ))}
                                        {shift.assignedPatients.length > 3 && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-xs">
                                                +{shift.assignedPatients.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {shift.status === 'scheduled' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAssignPatients(shift)}
                                        className="flex-1 px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg text-sm hover:bg-purple-200 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <UserPlus className="w-3 h-3" />
                                        Assign Patients
                                    </button>
                                    <button
                                        onClick={() => onCancelShift(shift._id)}
                                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE SHIFT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const CreateShiftModal = ({ show, onClose, nurses, wards, newShift, setNewShift, onSubmit, selectedDate }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Create Shift Assignment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Nurse Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Nurse *</label>
                        <select
                            value={newShift.nurseId}
                            onChange={(e) => setNewShift(prev => ({ ...prev, nurseId: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">Choose a nurse...</option>
                            {nurses.map(nurse => (
                                <option key={nurse._id} value={nurse._id}>
                                    {nurse.profile?.firstName} {nurse.profile?.lastName} ({nurse.username})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Shift Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type *</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'morning', label: 'Morning', icon: <Sun className="w-5 h-5" />, time: '6AM-2PM', color: 'amber' },
                                { value: 'evening', label: 'Evening', icon: <Sunset className="w-5 h-5" />, time: '2PM-10PM', color: 'orange' },
                                { value: 'night', label: 'Night', icon: <Moon className="w-5 h-5" />, time: '10PM-6AM', color: 'indigo' }
                            ].map(shift => (
                                <button
                                    key={shift.value}
                                    onClick={() => setNewShift(prev => ({ ...prev, shiftType: shift.value }))}
                                    className={`p-4 rounded-xl border-2 transition-all text-center ${newShift.shiftType === shift.value
                                        ? `border-${shift.color}-500 bg-${shift.color}-50`
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className={`mx-auto mb-1 ${newShift.shiftType === shift.value ? `text-${shift.color}-500` : 'text-gray-400'}`}>
                                        {shift.icon}
                                    </div>
                                    <div className="text-sm font-medium">{shift.label}</div>
                                    <div className="text-xs text-gray-400">{shift.time}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shift Date *</label>
                        <input
                            type="date"
                            value={newShift.shiftDate}
                            onChange={(e) => setNewShift(prev => ({ ...prev, shiftDate: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    {/* Ward Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Wards *</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3">
                            {wards.map(ward => (
                                <label key={ward._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newShift.wardIds.includes(ward._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setNewShift(prev => ({ ...prev, wardIds: [...prev.wardIds, ward._id] }));
                                            } else {
                                                setNewShift(prev => ({ ...prev, wardIds: prev.wardIds.filter(id => id !== ward._id) }));
                                            }
                                        }}
                                        className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-700">{ward.name}</div>
                                        <div className="text-xs text-gray-400">{ward.wardNumber}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nurse Role</label>
                        <select
                            value={newShift.nurseRole}
                            onChange={(e) => setNewShift(prev => ({ ...prev, nurseRole: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="staff_nurse">Staff Nurse</option>
                            <option value="senior_nurse">Senior Nurse</option>
                            <option value="head_nurse">Head Nurse</option>
                            <option value="shift_incharge">Shift In-Charge</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!newShift.nurseId || newShift.wardIds.length === 0}
                        className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Shift
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN PATIENTS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const AssignPatientsModal = ({ show, onClose, shift, patients, onAssign }) => {
    const [selectedPatients, setSelectedPatients] = useState(
        shift.assignedPatients?.map(pa => pa.patient?._id || pa.patient) || []
    );

    const togglePatient = (patientId, admissionId) => {
        if (selectedPatients.includes(patientId)) {
            setSelectedPatients(prev => prev.filter(id => id !== patientId));
        } else {
            setSelectedPatients(prev => [...prev, patientId]);
        }
    };

    const handleSubmit = () => {
        const assignments = selectedPatients.map(patientId => {
            const admission = patients.find(p => p.patient._id === patientId);
            return {
                patientId,
                admissionId: admission?._id,
                bedId: admission?.bed?._id
            };
        });
        onAssign(assignments);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Assign Patients</h2>
                    <p className="text-sm text-gray-500">
                        Assign patients to {shift.nurse?.profile?.firstName} {shift.nurse?.profile?.lastName}
                    </p>
                </div>

                {/* Patient List */}
                <div className="p-6 max-h-[400px] overflow-y-auto">
                    {patients.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Bed className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No patients in selected ward</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {patients.map((admission) => (
                                <label
                                    key={admission._id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPatients.includes(admission.patient._id)
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPatients.includes(admission.patient._id)}
                                        onChange={() => togglePatient(admission.patient._id, admission._id)}
                                        className="w-5 h-5 text-purple-500 rounded focus:ring-purple-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800">
                                            {admission.patient?.firstName} {admission.patient?.lastName}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Bed className="w-3 h-3" />
                                            Bed {admission.bed?.bedNumber || 'N/A'}
                                            <span className="text-gray-300">•</span>
                                            {admission.patient?.patientId}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {admission.diagnosis || 'No diagnosis specified'}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        {selectedPatients.length} patient(s) selected
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Assign Patients
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default NurseDutyRoster;
