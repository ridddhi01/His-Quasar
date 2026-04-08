import React, { useState, useEffect } from 'react';
import {
    BedDouble,
    Activity,
    Users,
    LogOut,
    Plus,
    Search,
    Filter,
    Stethoscope,
    Calendar,
    Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ipdService from '../../services/ipd.service';
import bedService from '../../services/bed.service';
import patientService from '../../services/patients.service';
import staffService from '../../services/staff.service';
import IPDClinical from './IPDClinical';



const PatientsList = ({ onDischarge, onViewClinical }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        const res = await ipdService.getAdmittedPatients();
        setPatients(res.data);
        setLoading(false);
    };

    const handleDischarge = async (admissionId) => {
        if (!window.confirm('Are you sure you want to discharge this patient? This will release the bed.')) return;
        try {
            await ipdService.dischargePatient(admissionId);
            toast.success('Patient Discharged');
            loadPatients();
            if (onDischarge) onDischarge();
        } catch (error) {
            toast.error('Discharge Failed');
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Patients...</div>;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4">Ward / Bed</th>
                        <th className="px-6 py-4">Doctor</th>
                        <th className="px-6 py-4">Admission Date</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {patients.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-gray-400">No active admissions</td></tr>
                    ) : patients.map(adm => (
                        <tr key={adm._id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-700">{adm.patient?.firstName} {adm.patient?.lastName}</div>
                                <div className="text-xs text-gray-500">{adm.patient?.patientId}</div>
                                <div className="text-xs text-blue-500">{adm.diagnosis}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold mr-2">{adm.ward?.name}</span>
                                <div className="font-medium text-slate-600 mt-1">{adm.bed?.bedNumber}</div>
                            </td>
                            <td className="px-6 py-4 text-sm">Dr. {adm.doctor?.profile?.firstName} {adm.doctor?.profile?.lastName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(adm.admissionDate).toLocaleDateString()}
                                <div className="text-xs">{new Date(adm.admissionDate).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button
                                    onClick={() => onViewClinical(adm._id)}
                                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Stethoscope size={16} /> Care
                                </button>
                                <button
                                    onClick={() => handleDischarge(adm._id)}
                                    className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ml-auto"
                                >
                                    <LogOut size={16} /> Discharge
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const IPD = () => {
    const [activeTab, setActiveTab] = useState('board');
    const [stats, setStats] = useState({
        total: 0,
        occupied: 0,
        occupancyRate: 0
    });
    const [wards, setWards] = useState([]);
    const [allBeds, setAllBeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState([]);
    const [view, setView] = useState('dashboard');
    const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]); // Requests from Doctors
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const canAdmit = ['receptionist', 'admin'].includes(currentUser.role);
    const canDischarge = ['doctor', 'admin'].includes(currentUser.role);

    const handleViewClinical = (id) => {
        setSelectedAdmissionId(id);
        setView('clinical');
    };

    // Admission Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [admissionForm, setAdmissionForm] = useState({
        reason: '',
        wardId: '',
        bedId: '',
        doctorId: '',
        notes: '',
        requestId: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [wardsRes, bedsRes, patientsRes, staffRes, requestsRes] = await Promise.all([
                bedService.getWards(),
                bedService.getAllBeds(),
                patientService.getPatients(),
                staffService.getAllStaff(),
                canAdmit ? ipdService.getPendingRequests() : Promise.resolve({ data: [] })
            ]);

            setWards(wardsRes.data || []);
            setAllBeds(bedsRes.data || []);
            // patientsRes might be handled differently if searching
            const docList = staffRes.data.filter(s => s.user?.role === 'doctor');
            setDoctors(docList);
            setPendingRequests(requestsRes.data || []);
            console.log('Requests Res:', requestsRes); // Debugging

            // Stats calculation
            const total = bedsRes.data.length;
            const occupied = bedsRes.data.filter(b => b.status === 'occupied').length;
            const occupancyRate = total > 0 ? ((occupied / total) * 100).toFixed(0) : 0;
            setStats({ total, occupied, occupancyRate: parseFloat(occupancyRate) });

        } catch (error) {
            console.error(error);
            toast.error('Failed to load IPD data');
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers ---
    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'bg-green-50 border-green-200 text-green-700';
            case 'occupied': return 'bg-red-50 border-red-200 text-red-700';
            case 'under-maintenance': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
            case 'reserved': return 'bg-blue-50 border-blue-200 text-blue-700';
            default: return 'bg-gray-50 border-gray-200 text-gray-700';
        }
    };

    // --- Components ---

    const BedCard = ({ bed }) => (
        <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${getStatusColor(bed.status)}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-lg">{bed.bedNumber}</div>
                {bed.status === 'occupied' && <Activity size={16} className="animate-pulse" />}
            </div>
            <div className="text-xs font-medium uppercase tracking-wide opacity-80 mb-2">
                {bed.bedType}
            </div>
            {bed.status === 'occupied' && bed.currentPatient ? (
                <div className="text-sm border-t border-current/20 pt-2 mt-2">
                    <div className="font-semibold truncate">{bed.currentPatient.firstName} {bed.currentPatient.lastName}</div>
                    <div className="text-xs opacity-75">{bed.currentPatient.patientId}</div>
                </div>
            ) : (
                <div className="text-sm font-medium mt-4">
                    {bed.status === 'available' ? 'Available' : bed.status}
                </div>
            )}
        </div>
    );

    // --- Handlers ---
    const handlePatientSearch = async (e) => {
        setSearchQuery(e.target.value);
        if (e.target.value.length > 2) {
            const res = await patientService.searchPatients(e.target.value);
            setSearchResults(res.data);
        } else {
            setSearchResults([]);
        }
    };

    const handleAdmitPatient = async () => {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        let finalDoctorId = admissionForm.doctorId;

        // Fallback: If no doctor selected, verify if current user is a doctor
        if (!finalDoctorId && currentUser?.role === 'doctor') {
            finalDoctorId = currentUser._id; // Ensure User object has _id
        }

        if (!selectedPatient || !admissionForm.bedId || !finalDoctorId) {
            toast.error('Please select patient, bed, and doctor');
            return;
        }

        try {
            await ipdService.createAdmission({
                patient: selectedPatient._id,
                bed: admissionForm.bedId,
                doctor: finalDoctorId,
                department: selectedPatient.department || wards.find(w => w._id === admissionForm.wardId)?.department, // Fallback logic
                ward: admissionForm.wardId,
                diagnosis: admissionForm.reason,
                status: 'admitted',
                admissionType: 'planned',
                admissionDate: new Date(),
                requestId: admissionForm.requestId
            });
            toast.success('Patient Admitted Successfully');
            setActiveTab('board');
            fetchInitialData();
            // Reset
            setAdmissionForm({ reason: '', wardId: '', bedId: '', doctorId: '', notes: '', requestId: '' });
            setSelectedPatient(null);
        } catch (error) {

            toast.error(error.response?.data?.message || 'Admission Failed');
        }
    };


    // --- Render ---

    if (view === 'clinical' && selectedAdmissionId) {
        return <IPDClinical admissionId={selectedAdmissionId} onBack={() => { setView('dashboard'); fetchInitialData(); }} />;
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BedDouble size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Beds</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Users size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">Occupied</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.occupied}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Activity size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">Occupancy Rate</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.occupancyRate}%</h3>
                    </div>
                </div>
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${activeTab === 'patients' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                    <Users size={24} />
                    <span className="font-semibold">Patient List</span>
                </button>

                {canAdmit && (
                    <button
                        onClick={() => setActiveTab('admit')}
                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${activeTab === 'admit' ? 'bg-primary text-white shadow-lg' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                    >
                        <Plus size={24} />
                        <span className="font-semibold">New Admission</span>
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            {
                activeTab === 'patients' && (
                    <PatientsList onDischarge={fetchInitialData} onViewClinical={handleViewClinical} />
                )
            }

            {
                activeTab === 'board' && (
                    <div className="space-y-8">
                        {/* Wards Loop */}
                        {loading ? (
                            <div className="text-center py-20 text-gray-400">Loading Bed Board...</div>
                        ) : (
                            wards.map(ward => {
                                const wardBeds = allBeds.filter(b => b.ward?._id === ward._id || b.ward === ward._id);
                                if (wardBeds.length === 0) return null;

                                return (
                                    <div key={ward._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{ward.name}</h3>
                                                <p className="text-sm text-gray-500">{ward.type.toUpperCase()} • Floor: {ward.floor}</p>
                                            </div>
                                            <div className="flex gap-4 text-sm font-medium">
                                                <span className="text-green-600">{wardBeds.filter(b => b.status === 'available').length} Available</span>
                                                <span className="text-red-500">{wardBeds.filter(b => b.status === 'occupied').length} Occupied</span>
                                            </div>
                                        </div>
                                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {wardBeds.map(bed => <BedCard key={bed._id} bed={bed} />)}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )
            }

            {
                activeTab === 'admit' && canAdmit && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* ... (Existing Admission Form) ... */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                                    <Plus className="text-primary" /> Admit Patient
                                </h3>

                                {/* Pending Requests Section */}
                                {pendingRequests.length > 0 && (
                                    <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <h4 className="font-bold text-indigo-800 mb-3 text-sm uppercase tracking-wider">Pending Admission Requests</h4>
                                        <div className="space-y-3 max-h-60 overflow-y-auto">
                                            {pendingRequests.map(req => (
                                                <div key={req._id} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedPatient(req.patient);
                                                        setAdmissionForm(prev => ({ ...prev, reason: req.reason, doctorId: req.doctor?._id || '', requestId: req._id }));
                                                        toast.success('Request Data Loaded');
                                                    }}
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-700">{req.patient?.firstName} {req.patient?.lastName}</div>
                                                        <div className="text-xs text-gray-500">Dr. {req.doctor?.profile?.firstName || 'Unknown'} • {req.priority.toUpperCase()}</div>
                                                        <div className="text-xs text-indigo-600 mt-1">Ward: {req.recommendedWardType}</div>
                                                    </div>
                                                    <div className="text-indigo-600 text-xs font-bold border border-indigo-200 px-2 py-1 rounded">Select</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'admit' && pendingRequests.length === 0 && (
                                    <div className="mb-8 p-6 bg-gray-50 border border-gray-100 border-dashed rounded-xl text-center text-gray-500 text-sm">
                                        No pending admission requests from doctors.
                                    </div>
                                )}

                                {/* Patient Search */}
                                <div className="mb-6 relative">
                                    <label className="block font-medium text-slate-700 mb-2">Patient Search</label>
                                    <input
                                        type="text"
                                        placeholder="Search by name, phone..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary transition-colors"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg mt-2 z-10 max-h-60 overflow-y-auto">
                                            {searchResults.map(p => (
                                                <div
                                                    key={p._id}
                                                    onClick={() => { setSelectedPatient(p); setSearchQuery(''); }}
                                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="font-bold text-slate-700">{p.firstName} {p.lastName}</div>
                                                    <div className="text-sm text-gray-500">{p.phone} • {p.patientId}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedPatient && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-blue-900">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                                                <div className="text-sm text-blue-700">{selectedPatient.patientId}</div>
                                            </div>
                                            <button onClick={() => setSelectedPatient(null)} className="text-blue-500 hover:text-blue-700 text-sm font-bold">Change</button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block font-medium text-slate-700 mb-2">Ward</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                                            value={admissionForm.wardId}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, wardId: e.target.value, bedId: '' })}
                                        >
                                            <option value="">Select Ward</option>
                                            {wards.map(w => <option key={w._id} value={w._id}>{w.name} ({w.type})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-medium text-slate-700 mb-2">Bed Allocation</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                                            value={admissionForm.bedId}
                                            onChange={(e) => setAdmissionForm({ ...admissionForm, bedId: e.target.value })}
                                            disabled={!admissionForm.wardId}
                                        >
                                            <option value="">Select Bed</option>
                                            {allBeds
                                                .filter(b => (b.ward?._id === admissionForm.wardId || b.ward === admissionForm.wardId) && b.status === 'available')
                                                .map(b => <option key={b._id} value={b._id}>{b.bedNumber} ({b.type})</option>)
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-medium text-slate-700 mb-2">
                                        {admissionForm.requestId ? 'Admitting Doctor (Auto-assigned)' : 'Primary Doctor'}
                                    </label>
                                    <select
                                        className={`w-full px-4 py-3 border border-gray-200 rounded-xl outline-none ${admissionForm.requestId ? 'bg-gray-100 cursor-not-allowed opacity-80' : 'bg-gray-50'}`}
                                        value={admissionForm.doctorId}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, doctorId: e.target.value })}
                                        disabled={!!admissionForm.requestId}
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctors.map(d => (
                                            <option key={d.user?._id} value={d.user?._id}>
                                                Dr. {d.user?.profile?.firstName} {d.user?.profile?.lastName} {d.department?.name ? `(${d.department.name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-6">
                                    <label className="block font-medium text-slate-700 mb-2">Reason for Admission</label>
                                    <textarea
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                                        rows="3"
                                        placeholder="Diagnosis / Reason..."
                                        value={admissionForm.reason}
                                        onChange={(e) => setAdmissionForm({ ...admissionForm, reason: e.target.value })}
                                    ></textarea>
                                </div>

                                <button onClick={handleAdmitPatient} className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all">
                                    Confirm Admission
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default IPD;
