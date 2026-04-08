import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    User,
    Calendar,
    Clock,
    Scissors,
    Activity,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileText,
    Shield,
    Syringe,
    Package,
    ClipboardList,
    DollarSign,
    Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

// Import Phase Components
import PreOpAssessment from '../../components/ot/PreOpAssessment';
import WHOChecklist from '../../components/ot/WHOChecklist';
import AnesthesiaRecord from '../../components/ot/AnesthesiaRecord';
import ImplantsConsumables from '../../components/ot/ImplantsConsumables';
import IntraOpNotes from '../../components/ot/IntraOpNotes';
import PostOpOrders from '../../components/ot/PostOpOrders';
import InfectionControl from '../../components/ot/InfectionControl';
import OTBilling from '../../components/ot/OTBilling';

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE-BASED ACCESS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const TAB_ACCESS = {
    overview: ['admin', 'doctor', 'nurse'],
    preop: ['admin', 'doctor', 'nurse'],           // Ward Nurse + Doctor fills pre-op
    who: ['admin', 'doctor', 'nurse'],           // OT Nurse does WHO checklist (both nurse types can view)
    anesthesia: ['admin', 'doctor'],                    // Anesthetist (doctor role)
    implants: ['admin', 'doctor', 'nurse'],           // OT Nurse logs implants
    intraop: ['admin', 'doctor'],                    // Surgeon writes notes
    postop: ['admin', 'doctor', 'nurse'],           // Doctor orders, Nurse executes
    infection: ['admin', 'doctor', 'nurse'],           // Infection Control Officer
    billing: ['admin', 'billing', 'receptionist']    // Billing staff
};

// Who can EDIT each phase (more restrictive than view)
const EDIT_ACCESS = {
    preop: ['admin', 'doctor', 'nurse'],
    who: ['admin', 'nurse'],                     // Only OT Nurse edits WHO
    anesthesia: ['admin', 'doctor'],                    // Only Anesthetist
    implants: ['admin', 'nurse'],                     // Only OT Nurse
    intraop: ['admin', 'doctor'],                    // Only Surgeon
    postop: ['admin', 'doctor'],                    // Doctor creates, Nurse executes
    infection: ['admin', 'nurse'],                     // Infection Control Officer (nurse role)
    billing: ['admin', 'billing']
};

const SurgeryDetail = ({ surgeryId, onBack }) => {
    const [surgery, setSurgery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [workflowStatus, setWorkflowStatus] = useState({});

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const userRole = currentUser.role || 'guest';

    useEffect(() => {
        fetchSurgeryDetails();
    }, [surgeryId]);

    const fetchSurgeryDetails = async () => {
        setLoading(true);
        try {
            const res = await surgeryService.getScheduleById(surgeryId);
            setSurgery(res.data);
            // Calculate workflow status
            calculateWorkflowStatus(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load surgery details');
        } finally {
            setLoading(false);
        }
    };

    const calculateWorkflowStatus = (data) => {
        const status = {
            preop: !!data.preOpAssessment?.fitForSurgery,
            whoSignIn: !!data.whoChecklist?.signIn?.completedAt,
            whoTimeOut: !!data.whoChecklist?.timeOut?.completedAt,
            whoSignOut: !!data.whoChecklist?.signOut?.completedAt,
            anesthesia: !!data.anesthesiaRecord?.asaGrade,
            implants: (data.implantsConsumables?.length || 0) > 0,
            intraop: (data.intraOpNotes?.length || 0) > 0,
            postop: (data.postOpOrders?.length || 0) > 0,
            infection: !!data.infectionControl?.ssiRiskCategory,
            billing: !!data.billingGenerated
        };
        setWorkflowStatus(status);
    };

    const canViewTab = (tabId) => {
        const allowedRoles = TAB_ACCESS[tabId] || [];
        return allowedRoles.includes(userRole);
    };

    const canEditTab = (tabId) => {
        const allowedRoles = EDIT_ACCESS[tabId] || [];
        return allowedRoles.includes(userRole);
    };

    const handleStartSurgery = async () => {
        if (!window.confirm('Start this surgery? This will mark it as In Progress.')) return;
        try {
            await surgeryService.startSurgery(surgeryId);
            toast.success('Surgery Started');
            fetchSurgeryDetails();
        } catch (error) {
            toast.error('Failed to start surgery');
        }
    };

    const handleCompleteSurgery = async () => {
        if (!window.confirm('Mark this surgery as Completed?')) return;
        try {
            await surgeryService.completeSurgery(surgeryId, {});
            toast.success('Surgery Completed');
            fetchSurgeryDetails();
        } catch (error) {
            toast.error('Failed to complete surgery');
        }
    };

    const handleCancelSurgery = async () => {
        const reason = prompt('Enter cancellation reason:');
        if (!reason) return;
        try {
            await surgeryService.cancelSurgery(surgeryId, reason);
            toast.success('Surgery Cancelled');
            fetchSurgeryDetails();
        } catch (error) {
            toast.error('Failed to cancel surgery');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'scheduled': 'bg-blue-100 text-blue-800',
            'in-progress': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status?.replace('-', ' ').toUpperCase()}
            </span>
        );
    };

    // Tab configuration with role-based access
    const allTabs = [
        { id: 'overview', label: 'Overview', icon: FileText, statusKey: null },
        { id: 'preop', label: 'Pre-Op', icon: ClipboardList, statusKey: 'preop' },
        { id: 'who', label: 'WHO Checklist', icon: Shield, statusKey: null },
        { id: 'anesthesia', label: 'Anesthesia', icon: Syringe, statusKey: 'anesthesia' },
        { id: 'implants', label: 'Implants', icon: Package, statusKey: 'implants' },
        { id: 'intraop', label: 'Intra-Op', icon: FileText, statusKey: 'intraop' },
        { id: 'postop', label: 'Post-Op', icon: ClipboardList, statusKey: 'postop' },
        { id: 'infection', label: 'Infection', icon: AlertTriangle, statusKey: 'infection' },
        { id: 'billing', label: 'Billing', icon: DollarSign, statusKey: 'billing' },
    ];

    // Filter tabs based on user role
    const visibleTabs = allTabs.filter(tab => canViewTab(tab.id));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-400">Loading surgery details...</div>
            </div>
        );
    }

    if (!surgery) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertTriangle size={48} className="text-red-400" />
                <p className="text-gray-500">Surgery not found</p>
                <button onClick={onBack} className="text-primary font-medium">Go Back</button>
            </div>
        );
    }

    const canStartSurgery = userRole === 'doctor' || userRole === 'admin';
    const canCancelSurgery = userRole === 'doctor' || userRole === 'admin';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Scissors className="text-primary" />
                            Surgery: {surgery.surgeryNumber}
                        </h1>
                        <p className="text-gray-500 text-sm">{surgery.surgeryType}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusBadge(surgery.status)}
                    {surgery.status === 'scheduled' && canStartSurgery && (
                        <>
                            <button
                                onClick={handleStartSurgery}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                            >
                                Start Surgery
                            </button>
                            {canCancelSurgery && (
                                <button
                                    onClick={handleCancelSurgery}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </>
                    )}
                    {surgery.status === 'in-progress' && canStartSurgery && (
                        <button
                            onClick={handleCompleteSurgery}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                            Complete Surgery
                        </button>
                    )}
                </div>
            </div>

            {/* Workflow Progress Tracker */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Workflow Progress</h4>
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'preop', label: 'Pre-Op' },
                        { key: 'whoSignIn', label: 'WHO Sign-In' },
                        { key: 'whoTimeOut', label: 'WHO Time-Out' },
                        { key: 'whoSignOut', label: 'WHO Sign-Out' },
                        { key: 'anesthesia', label: 'Anesthesia' },
                        { key: 'implants', label: 'Implants' },
                        { key: 'intraop', label: 'Intra-Op Notes' },
                        { key: 'postop', label: 'Post-Op Orders' },
                        { key: 'infection', label: 'Infection Control' },
                        { key: 'billing', label: 'Billing' }
                    ].map(item => (
                        <div
                            key={item.key}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${workflowStatus[item.key]
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                        >
                            {workflowStatus[item.key] ? (
                                <CheckCircle2 size={14} />
                            ) : (
                                <Clock size={14} />
                            )}
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Patient & Surgery Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Patient Info</h4>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <User size={24} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">
                                {surgery.patient?.firstName} {surgery.patient?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{surgery.patient?.patientId}</div>
                            <div className="text-xs text-gray-400">{surgery.patient?.gender}, {surgery.patient?.age} yrs</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Schedule</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-gray-400" />
                            <span>{new Date(surgery.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock size={16} className="text-gray-400" />
                            <span>{surgery.scheduledTime} ({surgery.estimatedDuration || 60} min)</span>
                        </div>
                        <div className="text-sm text-gray-500">OT: {surgery.otNumber || 'Not assigned'}</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Surgical Team</h4>
                    <div className="space-y-1 text-sm">
                        <div><span className="text-gray-500">Surgeon:</span> Dr. {surgery.surgeon?.profile?.firstName} {surgery.surgeon?.profile?.lastName}</div>
                        <div><span className="text-gray-500">Anesthetist:</span> {surgery.anesthetist ? `Dr. ${surgery.anesthetist?.profile?.firstName}` : 'Not assigned'}</div>
                        <div><span className="text-gray-500">Anesthesia:</span> {surgery.anesthesiaType || 'TBD'}</div>
                    </div>
                </div>
            </div>

            {/* Role Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-blue-700">
                <User size={16} />
                <span>Logged in as: <strong className="capitalize">{userRole.replace('_', ' ')}</strong></span>
                <span className="text-blue-400 mx-2">|</span>
                <span>You have access to {visibleTabs.length} tabs based on your role</span>
            </div>

            {/* Tabs - Role-Based */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex overflow-x-auto border-b border-gray-100">
                    {visibleTabs.map(tab => {
                        const isComplete = tab.statusKey && workflowStatus[tab.statusKey];
                        const canEdit = canEditTab(tab.id);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${activeTab === tab.id
                                    ? 'text-primary border-primary bg-primary/5'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {isComplete && (
                                    <CheckCircle2 size={14} className="text-green-500" />
                                )}
                                {!canEdit && (
                                    <Lock size={12} className="text-gray-400" title="View Only" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* Edit Permission Notice */}
                    {activeTab !== 'overview' && !canEditTab(activeTab) && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800 text-sm">
                            <Lock size={16} />
                            <span>You have <strong>view-only</strong> access to this section. Editing is restricted to authorized roles.</span>
                        </div>
                    )}

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Diagnosis</h4>
                                <p className="text-gray-600">{surgery.diagnosis || 'No diagnosis recorded'}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Procedure</h4>
                                <p className="text-gray-600">{surgery.procedure || 'No procedure details recorded'}</p>
                            </div>
                            {surgery.status === 'completed' && (
                                <>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-2">Complications</h4>
                                        <p className="text-gray-600">{surgery.complications || 'None reported'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-2">Post-Op Instructions</h4>
                                        <p className="text-gray-600">{surgery.postOpInstructions || 'No instructions recorded'}</p>
                                    </div>
                                </>
                            )}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <span className="text-xs text-gray-500">Actual Start</span>
                                    <p className="font-medium">{surgery.actualStartTime ? new Date(surgery.actualStartTime).toLocaleString() : '-'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Actual End</span>
                                    <p className="font-medium">{surgery.actualEndTime ? new Date(surgery.actualEndTime).toLocaleString() : '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Phase Components with Edit Mode */}
                    {activeTab === 'preop' && (
                        <PreOpAssessment
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('preop')}
                        />
                    )}
                    {activeTab === 'who' && (
                        <WHOChecklist
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('who')}
                        />
                    )}
                    {activeTab === 'anesthesia' && (
                        <AnesthesiaRecord
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('anesthesia')}
                        />
                    )}
                    {activeTab === 'implants' && (
                        <ImplantsConsumables
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('implants')}
                        />
                    )}
                    {activeTab === 'intraop' && (
                        <IntraOpNotes
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('intraop')}
                        />
                    )}
                    {activeTab === 'postop' && (
                        <PostOpOrders
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('postop')}
                        />
                    )}
                    {activeTab === 'infection' && (
                        <InfectionControl
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('infection')}
                        />
                    )}
                    {activeTab === 'billing' && (
                        <OTBilling
                            surgeryId={surgeryId}
                            surgery={surgery}
                            onUpdate={fetchSurgeryDetails}
                            readOnly={!canEditTab('billing')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SurgeryDetail;
