import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, FileText, Stethoscope, CheckCircle, AlertCircle, Clock, Thermometer, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ipdService from '../../services/ipd.service';

const IPDClinical = ({ admissionId, onBack }) => {
    const [admission, setAdmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Forms
    const [vitalsForm, setVitalsForm] = useState({ temperature: '', bpSystolic: '', bpDiastolic: '', pulse: '', spo2: '' });
    const [noteForm, setNoteForm] = useState({ note: '', type: 'doctor_round' });

    useEffect(() => {
        loadData();
    }, [admissionId]);

    const loadData = async () => {
        try {
            const res = await ipdService.getAdmissionById(admissionId);
            setAdmission(res.data);
            setLoading(false);
        } catch (error) {
            toast.error('Failed to load admission details');
        }
    };

    const handleAddVitals = async (e) => {
        e.preventDefault();
        try {
            await ipdService.addVitals(admissionId, vitalsForm);
            toast.success('Vitals Recorded');
            setVitalsForm({ temperature: '', bpSystolic: '', bpDiastolic: '', pulse: '', spo2: '' });
            loadData();
        } catch (error) {
            toast.error('Failed to add vitals');
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        try {
            await ipdService.addClinicalNote(admissionId, noteForm);
            toast.success('Clinical Note Added');
            setNoteForm({ ...noteForm, note: '' });
            loadData();
        } catch (error) {
            toast.error('Failed to add note');
        }
    };

    const handleApproveDischarge = async () => {
        if (!window.confirm('Confirm discharge approval? This will initiate the discharge workflow.')) return;
        try {
            await ipdService.approveDischarge(admissionId);
            toast.success('Discharge Approved by Doctor');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Approval Failed');
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Clinical Data...</div>;
    if (!admission) return <div className="p-10 text-center text-red-500">Admission not found</div>;

    const patient = admission.patient || {};
    const doctor = admission.doctor || {};
    const bed = admission.bed || {};

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 shadow-sm">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{patient.firstName} {patient.lastName}</h2>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">ID:</span> {patient.patientId}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><span className="font-semibold text-slate-700">Age:</span> {patient.params?.age || 'N/A'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200 text-slate-700 font-medium">{bed.ward?.name} / {bed.bedNumber}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Admitted By</div>
                    <div className="font-bold text-slate-800">Dr. {doctor.profile?.firstName} {doctor.profile?.lastName}</div>
                    <div className="text-xs text-blue-600 font-medium mt-1">{admission.admissionNumber}</div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-gray-100 px-6">
                {['overview', 'vitals', 'notes', 'discharge'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto bg-gray-50/30">

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-blue-500" /> Latest Vitals</h3>
                            {admission.vitals?.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Temperature</div>
                                            <div className="text-xl font-bold text-slate-800">{admission.vitals[admission.vitals.length - 1].temperature}°F</div>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Blood Pressure</div>
                                            <div className="text-xl font-bold text-slate-800">{admission.vitals[admission.vitals.length - 1].bpSystolic}/{admission.vitals[admission.vitals.length - 1].bpDiastolic}</div>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Pulse</div>
                                            <div className="text-xl font-bold text-slate-800">{admission.vitals[admission.vitals.length - 1].pulse} bpm</div>
                                        </div>
                                        <div className="p-3 bg-indigo-50 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">SPO2</div>
                                            <div className="text-xl font-bold text-slate-800">{admission.vitals[admission.vitals.length - 1].spo2}%</div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-gray-400">
                                        Recorded: {new Date(admission.vitals[admission.vitals.length - 1].recordedAt).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">No vitals recorded yet</div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-orange-500" /> Diagnosis & Recent Notes</h3>
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase">Diagnosis</label>
                                <p className="text-slate-800 p-3 bg-gray-50 rounded-lg mt-1 border border-gray-100">{admission.diagnosis || 'No Diagnosis'}</p>
                            </div>
                            {admission.clinicalNotes?.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Latest Note</label>
                                    <div className="mt-2 p-3 border-l-4 border-primary bg-primary/5">
                                        <p className="text-sm text-slate-700">{admission.clinicalNotes[admission.clinicalNotes.length - 1].note}</p>
                                        <div className="text-xs text-gray-400 mt-2 flex justify-between">
                                            <span className="uppercase font-bold">{admission.clinicalNotes[admission.clinicalNotes.length - 1].type.replace('_', ' ')}</span>
                                            <span>{new Date(admission.clinicalNotes[admission.clinicalNotes.length - 1].recordedAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'vitals' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
                            <h3 className="font-bold text-lg mb-4">Record Vitals</h3>
                            <form onSubmit={handleAddVitals} className="space-y-4">
                                <input placeholder="Temp (°F)" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" value={vitalsForm.temperature} onChange={e => setVitalsForm({ ...vitalsForm, temperature: e.target.value })} required />
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Systolic" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" type="number" value={vitalsForm.bpSystolic} onChange={e => setVitalsForm({ ...vitalsForm, bpSystolic: e.target.value })} />
                                    <input placeholder="Diastolic" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" type="number" value={vitalsForm.bpDiastolic} onChange={e => setVitalsForm({ ...vitalsForm, bpDiastolic: e.target.value })} />
                                </div>
                                <input placeholder="Pulse (bpm)" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" type="number" value={vitalsForm.pulse} onChange={e => setVitalsForm({ ...vitalsForm, pulse: e.target.value })} />
                                <input placeholder="SPO2 (%)" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" type="number" value={vitalsForm.spo2} onChange={e => setVitalsForm({ ...vitalsForm, spo2: e.target.value })} />
                                <button type="submit" className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark">Save Vitals</button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Temp</th>
                                        <th className="p-4">BP</th>
                                        <th className="p-4">Pulse</th>
                                        <th className="p-4">SPO2</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {admission.vitals?.slice().reverse().map((v, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium">{new Date(v.recordedAt).toLocaleString()}</td>
                                            <td className="p-4">{v.temperature}°F</td>
                                            <td className="p-4">{v.bpSystolic}/{v.bpDiastolic}</td>
                                            <td className="p-4">{v.pulse}</td>
                                            <td className="p-4">{v.spo2}%</td>
                                        </tr>
                                    ))}
                                    {(!admission.vitals || admission.vitals.length === 0) && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No records found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
                            <h3 className="font-bold text-lg mb-4">Add Clinical Note</h3>
                            <form onSubmit={handleAddNote} className="space-y-4">
                                <select className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none" value={noteForm.type} onChange={e => setNoteForm({ ...noteForm, type: e.target.value })}>
                                    <option value="doctor_round">Doctor Round</option>
                                    <option value="nursing_note">Nursing Note</option>
                                    <option value="procedure_note">Procedure Note</option>
                                </select>
                                <textarea rows="6" placeholder="Write clinical observations..." className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none" value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} required></textarea>
                                <button type="submit" className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark">Save Note</button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                            {admission.clinicalNotes?.slice().reverse().map((n, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${n.type === 'doctor_round' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {n.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-gray-400 text-xs">{new Date(n.recordedAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-700 whitespace-pre-wrap">{n.note}</p>
                                </div>
                            ))}
                            {(!admission.clinicalNotes || admission.clinicalNotes.length === 0) && <div className="p-8 text-center text-gray-400">No notes found</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'discharge' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Discharge Control Center</h2>
                            <p className="text-gray-500 mb-8">Manage the discharge process for this patient.</p>

                            <div className="grid grid-cols-2 gap-8 text-left max-w-lg mx-auto mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${admission.discharge?.isApprovedByDoctor ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {admission.discharge?.isApprovedByDoctor ? <CheckCircle size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-gray-400">Doctor Approval</div>
                                        <div className="font-semibold">{admission.discharge?.isApprovedByDoctor ? 'Approved' : 'Pending'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* This billing status is from the admission record (summary) or checked live. For now, using admission.discharge.billingCleared from backend, which defaults false. */}
                                    <div className={`p-3 rounded-full ${admission.discharge?.billingCleared ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {admission.discharge?.billingCleared ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-gray-400">Billing Clearance</div>
                                        <div className="font-semibold">{admission.discharge?.billingCleared ? 'Cleared' : 'Pending Bill'}</div>
                                    </div>
                                </div>
                            </div>

                            {!admission.discharge?.isApprovedByDoctor && (
                                <button onClick={handleApproveDischarge} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                                    <Stethoscope size={20} /> Approve Discharge
                                </button>
                            )}

                            {admission.discharge?.isApprovedByDoctor && !admission.discharge?.billingCleared && (
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
                                    Discharge approved. Generating final bill... (Billing Module Integration Required)
                                </div>
                            )}

                            {admission.discharge?.isApprovedByDoctor && admission.discharge?.billingCleared && (
                                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 font-bold">
                                    Patient Ready for Gate Pass
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IPDClinical;
