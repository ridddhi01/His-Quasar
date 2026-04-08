import React, { useState, useEffect } from 'react';
import {
    Activity,
    Clock,
    Users,
    AlertTriangle,
    Heart,
    Pill,
    FileText,
    ArrowRightLeft,
    Bell,
    Play,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Thermometer,
    Droplets,
    Wind,
    User,
    Bed,
    ClipboardList,
    RefreshCw,
    LogOut
} from 'lucide-react';
import * as nursingService from '../../services/nursing.service';
import bedService from '../../services/bed.service';
import VitalsRecording from '../../components/nursing/VitalsRecording';
import MedicationAdministration from '../../components/nursing/MedicationAdministration';
import ShiftHandover from '../../components/nursing/ShiftHandover';
import HandoverAcknowledgment from '../../components/nursing/HandoverAcknowledgment';

// ═══════════════════════════════════════════════════════════════════════════════
// NURSING DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function Nursing() {
    // State
    const [activeShift, setActiveShift] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [carePlans, setCarePlans] = useState([]);

    const handleSaveNote = async () => {
        if (!selectedPatient || !noteContent.trim()) return;

        try {
            setLoading(true);
            // Construct payload matching NursingNote schema
            await nursingService.createNote({
                patient: selectedPatient.patient._id,
                admission: selectedPatient.admission._id || selectedPatient.admission,
                content: noteContent,
                noteType: 'nursing_note',
                category: 'observation'
            });
            setNoteContent('');
            alert('Note saved successfully');
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Failed to save note');
        } finally {
            setLoading(false);
        }
    };
    const [scheduledShift, setScheduledShift] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [pendingHandovers, setPendingHandovers] = useState([]);

    // Shift selection modal state
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [hasScheduledShifts, setHasScheduledShifts] = useState(false);
    const [shiftType, setShiftType] = useState('morning');
    const [selectedWards, setSelectedWards] = useState([]);
    const [wards, setWards] = useState([]);

    // Handover state
    const [showHandoverForm, setShowHandoverForm] = useState(false);
    const [handoverSubmitted, setHandoverSubmitted] = useState(false);
    const [selectedHandover, setSelectedHandover] = useState(null);
    const [assignedPatients, setAssignedPatients] = useState([]);
    const [completedForToday, setCompletedForToday] = useState(false);

    useEffect(() => {
        const fetchCarePlans = async () => {
            if (activeTab === 'careplans' && selectedPatient) {
                try {
                    setLoading(true);
                    const response = await nursingService.getCarePlans(selectedPatient.patient._id);
                    setCarePlans(response.data || []);
                } catch (err) {
                    console.error('Error fetching care plans', err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchCarePlans();
    }, [activeTab, selectedPatient]);

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // Fetch wards
            try {
                const wardsRes = await bedService.getWards();
                setWards(wardsRes.data || []);
            } catch (e) {
                console.error('Error loading wards:', e);
            }

            // Check for active shift
            const shiftResponse = await nursingService.getCurrentShift();
            if (shiftResponse.data) {
                setActiveShift(shiftResponse.data);
                setShowShiftModal(false);
                // Check if handover was already created for this shift
                if (shiftResponse.data.handoverRecord) {
                    setHandoverSubmitted(true);
                }
                await loadDashboardData();
                await loadAlerts();
            } else {
                // Check for SCHEDULED shift
                try {
                    const scheduledRes = await nursingService.getScheduledShifts(new Date());
                    const scheduled = scheduledRes.data?.find(s => s.status === 'scheduled');
                    // Check if any shift was completed today
                    const completed = scheduledRes.data?.find(s => s.status === 'completed');
                    if (completed) {
                        setCompletedForToday(true);
                    }
                    if (scheduled) {
                        setScheduledShift(scheduled);
                        setShiftType(scheduled.shiftType);
                        // Extract IDs from populated wards
                        setSelectedWards(scheduled.assignedWards.map(w => w._id));
                        setHasScheduledShifts(true);
                        setShowShiftModal(true);
                    } else {
                        // No scheduled shifts available
                        setHasScheduledShifts(false);
                        setShowShiftModal(false);
                    }
                } catch (e) {
                    console.error('Error loading scheduled shift:', e);
                    setHasScheduledShifts(false);
                    setShowShiftModal(false);
                }
            }

            // Check for pending handovers
            const handoverResponse = await nursingService.getPendingHandovers();
            setPendingHandovers(handoverResponse.data || []);

        } catch (error) {
            console.error('Error loading nursing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDashboardData = async () => {
        try {
            const response = await nursingService.getDashboard();
            setDashboardStats(response.data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    const loadAlerts = async () => {
        try {
            const response = await nursingService.getActiveAlerts();
            setAlerts(response.data || []);
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    };

    const handleStartShift = async () => {
        try {
            const response = await nursingService.startShift({
                shiftType,
                wardIds: selectedWards,
            });
            setActiveShift(response.data);
            setShowShiftModal(false);
            await loadDashboardData();
            await loadAlerts();
        } catch (error) {
            console.error('Error starting shift:', error);
            alert('Failed to start shift: ' + (error.response?.data?.error || error.message));
        }
    };


    const handleEndShift = async () => {
        // Skip confirmation if handover was already submitted
        if (!handoverSubmitted) {
            if (!confirm('Are you sure you want to end your shift? You will need to complete a handover first.')) {
                return;
            }
        }
        try {
            const response = await nursingService.endShift();

            // Check the backend response to determine what happened
            if (response.data?.status === 'completed') {
                // Shift was actually ended
                setHandoverSubmitted(false);
                setActiveShift(null);
                await loadInitialData();
                setActiveTab('overview');
                alert('Shift ended successfully!');
            } else if (response.data?.status === 'handover_pending') {
                // Shift is waiting for handover - navigate to handover tab
                await loadInitialData();
                setActiveTab('handover');
                alert('Please complete the handover form first before ending your shift.');
            } else {
                // Unexpected state - just refresh
                await loadInitialData();
                alert(response.message || 'Shift status updated.');
            }
        } catch (error) {
            console.error('Error ending shift:', error);
            alert('Failed to end shift: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await nursingService.acknowledgeAlert(alertId, 'Acknowledged');
            await loadAlerts();
        } catch (error) {
            console.error('Error acknowledging alert:', error);
        }
    };

    // Get severity color
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-300';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default: return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    // Format time
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SHIFT SELECTION MODAL
    // ═══════════════════════════════════════════════════════════════════════════

    const ShiftSelectionModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Start Your Shift</h2>
                    <p className="text-gray-500 mt-2">Select your shift type to begin</p>
                    {scheduledShift && (
                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                            Updates found from Duty Roster. Settings pre-filled.
                        </div>
                    )}
                </div>

                {/* Shift Type Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Shift Type</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['morning', 'evening', 'night'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setShiftType(type)}
                                className={`p-4 rounded-xl border-2 transition-all ${shiftType === type
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-200 hover:border-teal-300'
                                    }`}
                            >
                                <div className={`text-2xl mb-1 ${type === 'morning' ? '☀️' : type === 'evening' ? '🌅' : '🌙'
                                    }`}>
                                    {type === 'morning' ? '☀️' : type === 'evening' ? '🌅' : '🌙'}
                                </div>
                                <div className="text-sm font-medium capitalize">{type}</div>
                                <div className="text-xs text-gray-500">
                                    {type === 'morning' ? '6AM-2PM' : type === 'evening' ? '2PM-10PM' : '10PM-6AM'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ward Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Assigned Ward</label>
                    <select
                        value={selectedWards[0] || ''}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        onChange={(e) => setSelectedWards([e.target.value])}
                    >
                        <option value="">Select Ward</option>
                        {wards.map((ward) => (
                            <option key={ward._id} value={ward._id}>
                                {ward.name} ({ward.wardNumber})
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleStartShift}
                    disabled={!shiftType}
                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Play className="w-5 h-5" />
                    Start Shift
                </button>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD STATS CARDS
    // ═══════════════════════════════════════════════════════════════════════════

    const StatsCards = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">
                            {dashboardStats?.shiftInfo?.patientCount || 0}
                        </div>
                        <div className="text-xs text-gray-500">Patients</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">
                            {dashboardStats?.stats?.pendingTasks || 0}
                        </div>
                        <div className="text-xs text-gray-500">Pending Tasks</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">
                            {dashboardStats?.stats?.overdueTasks || 0}
                        </div>
                        <div className="text-xs text-gray-500">Overdue</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">
                            {dashboardStats?.stats?.medicationsDue || 0}
                        </div>
                        <div className="text-xs text-gray-500">Meds Due</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">
                            {dashboardStats?.stats?.vitalsRecordedToday || 0}
                        </div>
                        <div className="text-xs text-gray-500">Vitals Today</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-800">
                            {dashboardStats?.stats?.activeAlerts || 0}
                        </div>
                        <div className="text-xs text-gray-500">Active Alerts</div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // PATIENT LIST
    // ═══════════════════════════════════════════════════════════════════════════

    const PatientList = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Assigned Patients</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {activeShift?.assignedPatients?.map((assignment, index) => (
                    <div
                        key={index}
                        onClick={() => setSelectedPatient(assignment)}
                        className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${selectedPatient?.patient?._id === assignment.patient?._id ? 'bg-teal-50' : ''
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
                                    {assignment.patient?.firstName?.charAt(0) || 'P'}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-800">
                                        {assignment.patient?.firstName} {assignment.patient?.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <Bed className="w-3 h-3" />
                                        Bed {assignment.bed?.bedNumber || 'N/A'}
                                        <span className="text-gray-300">|</span>
                                        <span>{assignment.patient?.patientId}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                ))}
                {(!activeShift?.assignedPatients || activeShift.assignedPatients.length === 0) && (
                    <div className="px-6 py-8 text-center text-gray-500">
                        No patients assigned
                    </div>
                )}
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ALERTS PANEL
    // ═══════════════════════════════════════════════════════════════════════════

    const AlertsPanel = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Critical Alerts</h3>
                <button
                    onClick={loadAlerts}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {alerts.map((alert) => (
                    <div key={alert._id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-800">{alert.title}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {alert.description}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    {alert.patient?.firstName} {alert.patient?.lastName} • {formatTime(alert.generatedAt)}
                                </div>
                            </div>
                            {alert.status === 'active' && (
                                <button
                                    onClick={() => handleAcknowledgeAlert(alert._id)}
                                    className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-sm hover:bg-teal-200 transition-colors"
                                >
                                    Acknowledge
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {alerts.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                        No active alerts
                    </div>
                )}
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'vitals', label: 'Vital Signs', icon: Heart },
        { id: 'medications', label: 'Medications', icon: Pill },
        { id: 'notes', label: 'Notes', icon: FileText },
        { id: 'careplans', label: 'Care Plans', icon: ClipboardList },
        { id: 'handover', label: 'Handover', icon: ArrowRightLeft },
    ];

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-600">Loading Nursing Dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Shift Selection Modal */}
            {showShiftModal && <ShiftSelectionModal />}

            {/* No Shifts Available Message */}
            {!activeShift && !showShiftModal && !pendingHandovers.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${completedForToday ? 'bg-green-100' : 'bg-gradient-to-br from-gray-300 to-gray-400'}`}>
                            {completedForToday ? (
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            ) : (
                                <Clock className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {completedForToday ? 'Shift Completed' : 'No Shifts Available'}
                        </h2>
                        <p className="text-gray-500 mb-6">
                            {completedForToday
                                ? 'You have completed your shift for today. Have a great rest!'
                                : 'You currently have no scheduled shifts for today. Please check back later or contact your supervisor.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            )}

            {/* Pending Handover Alert */}
            {pendingHandovers.length > 0 && (
                <div className="bg-orange-500 text-white px-6 py-3">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5" />
                            <span>You have {pendingHandovers.length} pending handover(s) to acknowledge</span>
                        </div>
                        <button
                            onClick={() => setActiveTab('handover')}
                            className="px-4 py-1 bg-white text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                        >
                            View Handovers
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Nursing Dashboard</h1>
                            {activeShift && (
                                <div className="flex items-center gap-4 mt-1 text-teal-100">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {activeShift.shiftType.charAt(0).toUpperCase() + activeShift.shiftType.slice(1)} Shift
                                    </span>
                                    <span>•</span>
                                    <span>Started {formatTime(activeShift.actualStartTime)}</span>
                                    <span>•</span>
                                    <span>{activeShift.shiftNumber}</span>
                                </div>
                            )}
                        </div>
                        {activeShift && (
                            <button
                                onClick={handleEndShift}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                End Shift
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-teal-500 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {activeTab === 'overview' && (
                    <>
                        <StatsCards />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <PatientList />
                            </div>
                            <div>
                                <AlertsPanel />
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'vitals' && (
                    selectedPatient ? (
                        <VitalsRecording
                            patient={selectedPatient.patient}
                            admission={selectedPatient.admission}
                            onSave={() => {
                                loadDashboardData();
                            }}
                            onCancel={() => setActiveTab('overview')}
                        />
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="text-center py-12 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a patient from the Overview tab to record vitals</p>
                            </div>
                        </div>
                    )
                )}

                {activeTab === 'medications' && (
                    selectedPatient ? (
                        <MedicationAdministration
                            patient={selectedPatient.patient}
                            admission={selectedPatient.admission}
                            onComplete={() => loadDashboardData()}
                        />
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="text-center py-12 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a patient from the Overview tab to view medications</p>
                            </div>
                        </div>
                    )
                )}

                {activeTab === 'notes' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Nursing Notes</h2>
                        {selectedPatient ? (
                            <div>
                                <textarea
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    rows={4}
                                    placeholder="Enter nursing observations..."
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                ></textarea>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={loading || !noteContent.trim()}
                                    className="mt-4 px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Note'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a patient from the Overview tab to add notes</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'careplans' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Care Plans</h2>
                        {selectedPatient ? (
                            carePlans.length > 0 ? (
                                <div className="space-y-4">
                                    {carePlans.map((plan) => (
                                        <div key={plan._id} className="border border-gray-200 rounded-xl p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-teal-700">{plan.title}</h3>
                                                    <div className="text-sm text-gray-500 mb-2">Diagnosis: {plan.diagnosis} • Category: {plan.category}</div>
                                                </div>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs uppercase font-bold">{plan.status}</span>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4 mt-3">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase">Goals</h4>
                                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                        {plan.goals.map((g, i) => (
                                                            <li key={i}>{g.description}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <h4 className="font-medium text-gray-700 mb-2 text-sm uppercase">Interventions</h4>
                                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                        {plan.interventions.map((intv, i) => (
                                                            <li key={i}>{intv.description}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">No active care plans found.</div>
                            )
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a patient from the Overview tab to view care plans</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'handover' && (
                    <div className="space-y-6">
                        {/* Pending Handovers to Review */}
                        {pendingHandovers.length > 0 && !selectedHandover && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-orange-500" />
                                    Pending Handovers to Acknowledge
                                </h2>
                                <div className="space-y-3">
                                    {pendingHandovers.map((handover) => (
                                        <div key={handover._id} className="p-4 border border-orange-200 bg-orange-50 rounded-xl">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-gray-800">
                                                        Handover from {handover.handoverFrom?.nurse?.profile?.firstName} {handover.handoverFrom?.nurse?.profile?.lastName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {handover.patientHandovers?.length} patients • {handover.handoverFrom?.shiftType?.charAt(0).toUpperCase() + handover.handoverFrom?.shiftType?.slice(1)} Shift
                                                        <span className="mx-2">•</span>
                                                        {new Date(handover.handoverTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {handover.patientHandovers?.some(ph => ph.criticalAlerts?.length > 0 || ph.currentCondition === 'critical') && (
                                                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            Contains critical alerts - review required
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setSelectedHandover(handover)}
                                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                    Review & Acknowledge
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Selected Handover Review */}
                        {selectedHandover && (
                            <div>
                                <button
                                    onClick={() => setSelectedHandover(null)}
                                    className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                >
                                    ← Back to handover list
                                </button>
                                <HandoverAcknowledgment
                                    handover={selectedHandover}
                                    onAcknowledge={async (data) => {
                                        await nursingService.acknowledgeHandover(selectedHandover._id, data.acknowledgmentNotes);
                                        setSelectedHandover(null);
                                        setPendingHandovers(prev => prev.filter(h => h._id !== selectedHandover._id));
                                        loadDashboardData();
                                    }}
                                    onRequestClarification={async (request) => {
                                        alert('Clarification request sent to outgoing nurse: ' + request);
                                    }}
                                />
                            </div>
                        )}

                        {/* Create Handover Section */}
                        {activeShift && !selectedHandover && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <ArrowRightLeft className="w-5 h-5 text-teal-500" />
                                    End Shift & Create Handover
                                </h2>

                                {handoverSubmitted ? (
                                    /* Show End Shift confirmation after handover is submitted */
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-800 mb-2">Handover Submitted Successfully!</h3>
                                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                            Your handover has been created and is ready for the incoming nurse. You can now end your shift.
                                        </p>
                                        <button
                                            onClick={handleEndShift}
                                            className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all inline-flex items-center gap-2 shadow-lg"
                                        >
                                            <LogOut className="w-5 h-5" />
                                            End Shift Now
                                        </button>
                                    </div>
                                ) : !showHandoverForm ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
                                            <ArrowRightLeft className="w-8 h-8 text-teal-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-800 mb-2">Ready to End Your Shift?</h3>
                                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                            Create a comprehensive handover for the incoming nurse. This ensures continuity of care for all your assigned patients.
                                        </p>
                                        <button
                                            onClick={() => {
                                                // Get assigned patients for handover
                                                const patients = dashboardStats?.assignedPatients || [];
                                                setAssignedPatients(patients);
                                                setShowHandoverForm(true);
                                            }}
                                            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors inline-flex items-center gap-2"
                                        >
                                            <FileText className="w-5 h-5" />
                                            Start Handover Process
                                        </button>
                                    </div>
                                ) : (
                                    <ShiftHandover
                                        shift={activeShift}
                                        patients={assignedPatients}
                                        onSubmit={async (handoverData) => {
                                            try {
                                                const payload = {
                                                    shiftId: activeShift._id,
                                                    ...handoverData
                                                };
                                                console.log('Submitting handover payload:', payload);

                                                await nursingService.createHandover(payload);
                                                setShowHandoverForm(false);
                                                setHandoverSubmitted(true);
                                                loadDashboardData();
                                            } catch (error) {
                                                console.error('Error creating handover:', error);
                                                throw error;
                                            }
                                        }}
                                        onCancel={() => setShowHandoverForm(false)}
                                    />
                                )}
                            </div>
                        )}

                        {/* No Active Shift Message */}
                        {!activeShift && pendingHandovers.length === 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">No Active Shift</h3>
                                <p className="text-gray-400">Start your shift to access handover functionality</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Nursing;
