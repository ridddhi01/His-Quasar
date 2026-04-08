import React, { useState, useEffect } from 'react';
import {
    Scissors,
    Calendar,
    Clock,
    User,
    Plus,
    Activity,
    CheckCircle2,
    XCircle,
    PlayCircle,
    AlertTriangle,
    ChevronRight,
    Search,
    Filter,
    RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';
import ipdService from '../../services/ipd.service';
import staffService from '../../services/staff.service';
import SurgeryDetail from './SurgeryDetail';

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: OT DASHBOARD & SURGERY SCHEDULING
// ═══════════════════════════════════════════════════════════════════════════════

const OperationTheatre = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayScheduled: 0,
        inProgress: 0,
        completedToday: 0,
        cancelledToday: 0
    });
    const [schedules, setSchedules] = useState([]);
    const [roster, setRoster] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSurgeryId, setSelectedSurgeryId] = useState(null);
    const [view, setView] = useState('main'); // 'main' | 'detail'

    // Scheduling form state
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [admittedPatients, setAdmittedPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [nurses, setNurses] = useState([]);
    const [scheduleForm, setScheduleForm] = useState({
        patient: '',
        admission: '',
        surgeon: '',
        assistantSurgeons: [],
        anesthetist: '',
        nurses: [],
        otNumber: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
        estimatedDuration: 60,
        surgeryType: '',
        diagnosis: '',
        procedure: '',
        anesthesiaType: 'general'
    });

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const canSchedule = ['doctor', 'admin'].includes(currentUser.role);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchRoster(selectedDate);
        }
    }, [selectedDate]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [dashRes, schedulesRes] = await Promise.all([
                surgeryService.getDashboard(),
                surgeryService.getAllSchedules({ limit: 50 })
            ]);
            setStats(dashRes.data);
            setSchedules(schedulesRes.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load OT dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoster = async (date) => {
        try {
            const res = await surgeryService.getOTRoster(date);
            setRoster(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchFormData = async () => {
        try {
            const [patientsRes, doctorsRes, staffRes] = await Promise.all([
                ipdService.getAdmittedPatients(),
                staffService.getDoctors(),
                staffService.getAllStaff()
            ]);
            setAdmittedPatients(patientsRes.data || []);
            // Use direct doctors list from User model
            setDoctors(doctorsRes.data || []);
            const allStaff = staffRes.data || [];
            setNurses(allStaff.filter(s => s.user?.role === 'nurse'));
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenScheduleModal = () => {
        fetchFormData();
        setShowScheduleModal(true);
    };

    const handlePatientSelect = (e) => {
        const admissionId = e.target.value;
        const admission = admittedPatients.find(a => a._id === admissionId);
        if (admission) {
            setScheduleForm(prev => ({
                ...prev,
                patient: admission.patient?._id,
                admission: admissionId,
                diagnosis: admission.diagnosis || ''
            }));
        }
    };

    const handleScheduleSurgery = async () => {
        if (!scheduleForm.patient || !scheduleForm.surgeon || !scheduleForm.surgeryType) {
            toast.error('Please fill required fields: Patient, Surgeon, Surgery Type');
            return;
        }

        try {
            await surgeryService.scheduleSurgery(scheduleForm);
            toast.success('Surgery Scheduled Successfully');
            setShowScheduleModal(false);
            setScheduleForm({
                patient: '',
                admission: '',
                surgeon: '',
                assistantSurgeons: [],
                anesthetist: '',
                nurses: [],
                otNumber: '',
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: '09:00',
                estimatedDuration: 60,
                surgeryType: '',
                diagnosis: '',
                procedure: '',
                anesthesiaType: 'general'
            });
            fetchDashboardData();
            fetchRoster(selectedDate);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to schedule surgery');
        }
    };

    const handleStartSurgery = async (id) => {
        if (!window.confirm('Start this surgery? This will mark it as In Progress.')) return;
        try {
            await surgeryService.startSurgery(id);
            toast.success('Surgery Started');
            fetchDashboardData();
            fetchRoster(selectedDate);
        } catch (error) {
            toast.error('Failed to start surgery');
        }
    };

    const handleViewSurgery = (id) => {
        setSelectedSurgeryId(id);
        setView('detail');
    };

    const getStatusBadge = (status) => {
        const styles = {
            'scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
            'in-progress': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'completed': 'bg-green-50 text-green-700 border-green-200',
            'cancelled': 'bg-red-50 text-red-700 border-red-200'
        };
        const icons = {
            'scheduled': <Clock size={14} />,
            'in-progress': <Activity size={14} className="animate-pulse" />,
            'completed': <CheckCircle2 size={14} />,
            'cancelled': <XCircle size={14} />
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
                {icons[status]}
                {status?.replace('-', ' ').toUpperCase()}
            </span>
        );
    };

    // ─── Render Detail View ────────────────────────────────────────────────────────
    if (view === 'detail' && selectedSurgeryId) {
        return (
            <SurgeryDetail
                surgeryId={selectedSurgeryId}
                onBack={() => {
                    setView('main');
                    fetchDashboardData();
                    fetchRoster(selectedDate);
                }}
            />
        );
    }

    // ─── Main Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Scissors className="text-primary" /> Operation Theatre
                    </h1>
                    <p className="text-gray-500 mt-1">Manage surgeries, OT scheduling, and patient care</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { fetchDashboardData(); fetchRoster(selectedDate); }}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className="text-gray-600" />
                    </button>
                    {canSchedule && (
                        <button
                            onClick={handleOpenScheduleModal}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
                        >
                            <Plus size={20} /> Schedule Surgery
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Today's Surgeries</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.todayScheduled}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">In Progress</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.inProgress}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Completed Today</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.completedToday}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Cancelled</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.cancelledToday || 0}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {['dashboard', 'roster', 'all'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${activeTab === tab
                            ? 'text-primary border-primary'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                    >
                        {tab === 'dashboard' && 'Today\'s Schedule'}
                        {tab === 'roster' && 'OT Roster'}
                        {tab === 'all' && 'All Surgeries'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading OT Data...</div>
            ) : (
                <>
                    {/* Today's Schedule */}
                    {activeTab === 'dashboard' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Today's OT Schedule</h3>
                                <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {schedules.filter(s => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const surgeryDate = new Date(s.scheduledDate).toISOString().split('T')[0];
                                    return surgeryDate === today;
                                }).length === 0 ? (
                                    <div className="p-10 text-center text-gray-400">
                                        No surgeries scheduled for today
                                    </div>
                                ) : (
                                    schedules.filter(s => {
                                        const today = new Date().toISOString().split('T')[0];
                                        const surgeryDate = new Date(s.scheduledDate).toISOString().split('T')[0];
                                        return surgeryDate === today;
                                    }).map(surgery => (
                                        <div
                                            key={surgery._id}
                                            className="p-4 hover:bg-gray-50/50 transition-colors flex items-center gap-4 cursor-pointer"
                                            onClick={() => handleViewSurgery(surgery._id)}
                                        >
                                            <div className="w-20 text-center">
                                                <div className="text-lg font-bold text-slate-800">{surgery.scheduledTime}</div>
                                                <div className="text-xs text-gray-500">OT {surgery.otNumber || '-'}</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-800">
                                                    {surgery.patient?.firstName} {surgery.patient?.lastName}
                                                    <span className="text-xs text-gray-500 ml-2">{surgery.patient?.patientId}</span>
                                                </div>
                                                <div className="text-sm text-gray-600">{surgery.surgeryType}</div>
                                                <div className="text-xs text-gray-500">
                                                    Dr. {surgery.surgeon?.profile?.firstName} {surgery.surgeon?.profile?.lastName}
                                                </div>
                                            </div>
                                            <div>{getStatusBadge(surgery.status)}</div>
                                            {surgery.status === 'scheduled' && canSchedule && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStartSurgery(surgery._id); }}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                                >
                                                    <PlayCircle size={16} /> Start
                                                </button>
                                            )}
                                            <ChevronRight size={20} className="text-gray-400" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* OT Roster */}
                    {activeTab === 'roster' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">OT Roster</h3>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="divide-y divide-gray-100">
                                {roster.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400">
                                        No surgeries scheduled for this date
                                    </div>
                                ) : (
                                    roster.map(surgery => (
                                        <div
                                            key={surgery._id}
                                            className="p-4 hover:bg-gray-50/50 transition-colors flex items-center gap-4 cursor-pointer"
                                            onClick={() => handleViewSurgery(surgery._id)}
                                        >
                                            <div className="w-20 text-center">
                                                <div className="text-lg font-bold text-slate-800">{surgery.scheduledTime}</div>
                                                <div className="text-xs text-gray-500">OT {surgery.otNumber || '-'}</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-800">
                                                    {surgery.patient?.firstName} {surgery.patient?.lastName}
                                                </div>
                                                <div className="text-sm text-gray-600">{surgery.surgeryType}</div>
                                                <div className="text-xs text-gray-500">
                                                    Dr. {surgery.surgeon?.profile?.firstName} {surgery.surgeon?.profile?.lastName}
                                                </div>
                                            </div>
                                            <div>{getStatusBadge(surgery.status)}</div>
                                            <ChevronRight size={20} className="text-gray-400" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* All Surgeries */}
                    {activeTab === 'all' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Surgery #</th>
                                        <th className="px-6 py-4">Patient</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Surgeon</th>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {schedules.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-10 text-center text-gray-400">No surgeries found</td>
                                        </tr>
                                    ) : (
                                        schedules.map(surgery => (
                                            <tr key={surgery._id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-mono text-sm">{surgery.surgeryNumber}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-700">
                                                        {surgery.patient?.firstName} {surgery.patient?.lastName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{surgery.patient?.patientId}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm">{surgery.surgeryType}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    Dr. {surgery.surgeon?.profile?.firstName}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {new Date(surgery.scheduledDate).toLocaleDateString()}
                                                    <div className="text-xs text-gray-500">{surgery.scheduledTime}</div>
                                                </td>
                                                <td className="px-6 py-4">{getStatusBadge(surgery.status)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleViewSurgery(surgery._id)}
                                                        className="text-primary hover:text-primary-dark font-medium text-sm"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Schedule Surgery Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Plus className="text-primary" /> Schedule New Surgery
                            </h3>
                            <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Patient Selection */}
                            <div>
                                <label className="block font-medium text-slate-700 mb-2">Patient (Admitted) *</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={scheduleForm.admission}
                                    onChange={handlePatientSelect}
                                >
                                    <option value="">Select Admitted Patient</option>
                                    {admittedPatients.map(adm => (
                                        <option key={adm._id} value={adm._id}>
                                            {adm.patient?.firstName} {adm.patient?.lastName} ({adm.patient?.patientId}) - {adm.ward?.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-slate-700 mb-2">Surgery Type *</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        placeholder="e.g., Appendectomy"
                                        value={scheduleForm.surgeryType}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, surgeryType: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-slate-700 mb-2">OT Room</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        value={scheduleForm.otNumber}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, otNumber: e.target.value })}
                                    >
                                        <option value="">Select OT</option>
                                        <option value="OT-1">OT-1</option>
                                        <option value="OT-2">OT-2</option>
                                        <option value="OT-3">OT-3</option>
                                        <option value="OT-4">OT-4</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block font-medium text-slate-700 mb-2">Date *</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        value={scheduleForm.scheduledDate}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-slate-700 mb-2">Time *</label>
                                    <input
                                        type="time"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        value={scheduleForm.scheduledTime}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-slate-700 mb-2">Duration (min)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        value={scheduleForm.estimatedDuration}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, estimatedDuration: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-2">Lead Surgeon *</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={scheduleForm.surgeon}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, surgeon: e.target.value })}
                                >
                                    <option value="">Select Surgeon</option>
                                    {doctors.map(d => (
                                        <option key={d._id} value={d._id}>
                                            Dr. {d.profile?.firstName} {d.profile?.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-2">Anesthetist</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={scheduleForm.anesthetist}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, anesthetist: e.target.value })}
                                >
                                    <option value="">Select Anesthetist</option>
                                    {doctors.map(d => (
                                        <option key={d._id} value={d._id}>
                                            Dr. {d.profile?.firstName} {d.profile?.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-2">Anesthesia Type</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={scheduleForm.anesthesiaType}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, anesthesiaType: e.target.value })}
                                >
                                    <option value="general">General</option>
                                    <option value="regional">Regional</option>
                                    <option value="local">Local</option>
                                    <option value="sedation">Sedation</option>
                                    <option value="spinal">Spinal</option>
                                    <option value="epidural">Epidural</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 mb-2">Diagnosis / Notes</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    rows="3"
                                    placeholder="Pre-operative diagnosis..."
                                    value={scheduleForm.diagnosis}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, diagnosis: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleScheduleSurgery}
                                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
                            >
                                Schedule Surgery
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationTheatre;
