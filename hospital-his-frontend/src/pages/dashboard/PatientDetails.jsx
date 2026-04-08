import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ipdService from '../../services/ipd.service';
import patientsService from '../../services/patients.service';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Activity, User, MapPin, Phone, Mail, Clock, FlaskConical, X, AlertCircle, CheckCircle, BedDouble } from 'lucide-react';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const isDoctor = user?.role === 'doctor';
    const isReceptionist = user?.role === 'receptionist';
    const [patient, setPatient] = useState(null);
    const [history, setHistory] = useState({ appointments: [], admissions: [] });
    const [labResults, setLabResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLabResult, setSelectedLabResult] = useState(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestForm, setRequestForm] = useState({ reason: '', priority: 'routine', recommendedWardType: 'general' });

    const handleRequestAdmission = async () => {
        try {
            await ipdService.createRequest({ patient: id, ...requestForm });
            toast.success('Admission Requested Successfully');
            setIsRequestModalOpen(false);
        } catch (error) {
            toast.error('Failed to request admission');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [patientData, historyData] = await Promise.all([
                    patientsService.getPatient(id),
                    patientsService.getPatientHistory(id)
                ]);
                setPatient(patientData);
                setHistory(historyData);

                // Fetch lab results separately (may not exist for all patients)
                try {
                    const labData = await patientsService.getPatientLabResults(id);
                    setLabResults(labData || []);
                } catch (e) {
                    console.log("No lab results found");
                }
            } catch (error) {
                console.error("Failed to fetch patient details", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading patient details...</div>;
    if (!patient) return <div className="p-8 text-center text-red-500">Patient not found</div>;

    // Merge and Sort Timeline Items
    const timelineItems = [
        ...history.appointments.map(item => ({ type: 'appointment', date: item.scheduledDate, data: item })),
        ...history.admissions.map(item => ({ type: 'admission', date: item.admissionDate, data: item }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const getLabStatusBadge = (status) => {
        const styles = {
            'ordered': 'bg-blue-50 text-blue-600',
            'sample-collected': 'bg-amber-50 text-amber-600',
            'in-progress': 'bg-purple-50 text-purple-600',
            'completed': 'bg-emerald-50 text-emerald-600',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-50 text-gray-600'}`}>{status}</span>;
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Back to Patients
                </button>
                {isDoctor && (
                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <BedDouble size={18} /> Request Admission
                    </button>
                )}
            </div>

            {/* Patient Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-500 text-3xl font-bold shadow-inner">
                    {patient.firstName[0]}{patient.lastName[0]}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{patient.firstName} {patient.lastName}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                        <span className="flex items-center gap-1"><User size={16} /> {patient.patientId}</span>
                        <span className="flex items-center gap-1 capitalize"><Activity size={16} /> {patient.gender}, {patient.age} yrs</span>
                        <span className="flex items-center gap-1 text-red-500 font-medium"><Activity size={16} /> Blood: {patient.bloodGroup || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone size={16} className="text-gray-400" /> {patient.phone}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail size={16} className="text-gray-400" /> {patient.email || 'No email provided'}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 md:col-span-2">
                            <MapPin size={16} className="text-gray-400" /> {patient.address?.city || 'Unknown City'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lab Results Section (Clinical Only) */}
            {!isReceptionist && labResults.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FlaskConical className="text-purple-500" /> Lab Test Results
                    </h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">Test</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {labResults.map((lab) => (
                                    <tr key={lab._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-700">{lab.test?.testName || 'Unknown Test'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(lab.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{getLabStatusBadge(lab.status)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {lab.status === 'completed' && (
                                                <button
                                                    onClick={() => setSelectedLabResult(lab)}
                                                    className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600"
                                                >
                                                    View Results
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Timeline Section */}
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Clock className="text-primary" /> Patient Timeline
            </h2>

            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-12">
                {timelineItems.length > 0 ? timelineItems.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pl-8"
                    >
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${item.type === 'admission' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${item.type === 'admission' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {item.type}
                                    </span>
                                    <h3 className="font-bold text-slate-800 mt-2">
                                        {item.type === 'admission' ? 'Inpatient Admission' : 'Outpatient Visit'}
                                    </h3>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{new Date(item.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                                Dr. {item.data.doctor?.profile?.firstName} {item.data.doctor?.profile?.lastName} • {item.data.department?.name}
                            </p>
                            <div className="space-y-3 mt-3">
                                {isReceptionist ? (
                                    <>
                                        {/* Administrative View */}
                                        <div className="text-xs bg-gray-50 p-2 rounded text-gray-500">
                                            Status: <span className="font-medium text-gray-700">{item.data.status}</span>
                                        </div>
                                        {item.type === 'admission' && (
                                            <div className="text-xs bg-purple-50/50 p-2 rounded text-purple-700">
                                                Ward: {item.data.ward?.name} • Bed: {item.data.bed?.bedNumber}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* Clinical View */}
                                        {item.data.diagnosis && (
                                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Diagnosis</div>
                                                <div className="text-sm font-medium text-slate-700">{item.data.diagnosis}</div>
                                            </div>
                                        )}
                                        {item.data.chiefComplaint && (
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Symptoms</div>
                                                <div className="text-sm text-slate-600">{item.data.chiefComplaint}</div>
                                            </div>
                                        )}
                                        {item.data.prescription && item.data.prescription.length > 0 && (
                                            <div className="border-t border-dashed border-gray-200 pt-2">
                                                <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Prescription</div>
                                                <ul className="text-xs text-slate-600 space-y-1">
                                                    {item.data.prescription.map((med, i) => (
                                                        <li key={i} className="flex gap-2">
                                                            <span className="font-medium text-slate-800">{med.name}</span>
                                                            <span className="text-gray-400">-</span>
                                                            <span>{med.dosage}, {med.frequency}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {item.type === 'admission' && (
                                            <div className="text-xs bg-purple-50/50 p-2 rounded text-purple-700">
                                                Ward: {item.data.ward?.name} • Bed: {item.data.bed?.bedNumber}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )) : (
                    <div className="pl-8 text-gray-400 italic">No history found for this patient.</div>
                )}
                <div className="absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-gray-300" />
            </div>

            {/* Lab Result Modal */}
            <AnimatePresence>
                {selectedLabResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLabResult(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden"
                        >
                            <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedLabResult.test?.testName}</h2>
                                    <p className="text-purple-200 text-sm">{selectedLabResult.testNumber}</p>
                                </div>
                                <button onClick={() => setSelectedLabResult(null)} className="hover:bg-white/20 p-2 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                {/* Action Buttons */}
                                {selectedLabResult.reportPdf && (
                                    <div className="flex gap-2 mb-4">
                                        <a
                                            href={`http://localhost:5001/${selectedLabResult.reportPdf.replace(/\\\\/g, '/')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                        >
                                            📄 View PDF
                                        </a>
                                    </div>
                                )}

                                {/* AI Summary Section */}
                                {selectedLabResult.aiSummary && (
                                    <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                                        <h3 className="font-bold text-purple-800 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                            🤖 AI Clinical Summary
                                        </h3>
                                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {selectedLabResult.aiSummary}
                                        </div>
                                    </div>
                                )}

                                {/* Parameter Results */}
                                <div className="space-y-3">
                                    {selectedLabResult.results?.map((result, idx) => (
                                        <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${result.isAbnormal ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                            <div>
                                                <div className="font-medium text-slate-700">{result.parameter}</div>
                                                <div className="text-xs text-gray-400">Normal: {result.normalRange || 'N/A'}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-lg font-bold ${result.isAbnormal ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {result.value} <span className="text-sm font-normal text-gray-500">{result.unit}</span>
                                                </span>
                                                {result.isAbnormal && <AlertCircle size={18} className="text-red-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedLabResult.remarks && (
                                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Remarks</div>
                                        <p className="text-sm text-slate-600">{selectedLabResult.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Request Admission Modal */}
            <AnimatePresence>
                {isRequestModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRequestModalOpen(false)} />
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <BedDouble className="text-indigo-600" /> Request Admission
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Admission</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                        rows="3"
                                        value={requestForm.reason}
                                        onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                        <select
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                                            value={requestForm.priority}
                                            onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}
                                        >
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="emergency">Emergency</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Ward Type</label>
                                        <select
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                                            value={requestForm.recommendedWardType}
                                            onChange={e => setRequestForm({ ...requestForm, recommendedWardType: e.target.value })}
                                        >
                                            <option value="general">General</option>
                                            <option value="private">Private</option>
                                            <option value="icu">ICU</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleRequestAdmission} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                                    Send Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default PatientDetails;

