import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Calendar, Activity, Save, Plus, Trash, Pill, FileText, FlaskConical, ClipboardList, Scan } from 'lucide-react';
import axios from 'axios'; // We'll use axios directly for this complex form for now, or move to service later
import CarePlanCreator from '../../components/doctor/CarePlanCreator';
import ClinicalCodingTab from '../../components/clinical/ClinicalCodingTab';

const API_RES_URL = 'http://localhost:5001/api/v1/';
const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const Consultation = () => {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);

    // Clinical Notes State
    const [diagnosis, setDiagnosis] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [notes, setNotes] = useState('');

    // Prescription State
    const [medicines, setMedicines] = useState([]);
    const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '1-0-1', duration: '5 days' });

    // Lab Tests State
    const [labTests, setLabTests] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [selectedTestId, setSelectedTestId] = useState('');

    // Radiology Tests State
    const [radiologyTests, setRadiologyTests] = useState([]);
    const [availableRadiologyTests, setAvailableRadiologyTests] = useState([]);
    const [selectedRadiologyTestId, setSelectedRadiologyTestId] = useState('');

    // History State (must be at top with other hooks!)
    const [showHistory, setShowHistory] = useState(false);
    const [patientHistory, setPatientHistory] = useState([]);

    // Care Plan State (for IPD patients)
    const [activeAdmission, setActiveAdmission] = useState(null);
    const [showCarePlan, setShowCarePlan] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appointmentRes, testsRes, radiologyRes] = await Promise.all([
                    axios.get(`${API_RES_URL}opd/appointments/${appointmentId}`, getConfig()),
                    axios.get(`${API_RES_URL}lab/tests`, getConfig()),
                    axios.get(`${API_RES_URL}radiology/tests`, getConfig())
                ]);
                setAppointment(appointmentRes.data.data);
                setAvailableTests(testsRes.data.data || []);
                setAvailableRadiologyTests(radiologyRes.data.data || []);
                // Pre-fill if exists
                if (appointmentRes.data.data.notes) setNotes(appointmentRes.data.data.notes);
                if (appointmentRes.data.data.chiefComplaint) setSymptoms(appointmentRes.data.data.chiefComplaint);

                // Check if patient has an active admission (IPD)
                const patientId = appointmentRes.data.data.patient._id;
                try {
                    const admissionRes = await axios.get(
                        `${API_RES_URL}ipd/admissions?patient=${patientId}&status=admitted`,
                        getConfig()
                    );
                    if (admissionRes.data.data && admissionRes.data.data.length > 0) {
                        setActiveAdmission(admissionRes.data.data[0]);
                    }
                } catch (admErr) {
                    // No active admission - that's fine for OPD patients
                    console.log('No active admission found');
                }
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [appointmentId]);

    const addMedicine = () => {
        if (!newMed.name) return;
        setMedicines([...medicines, { ...newMed, id: Date.now() }]);
        setNewMed({ name: '', dosage: '', frequency: '1-0-1', duration: '5 days' });
    };

    const removeMedicine = (id) => {
        setMedicines(medicines.filter(m => m.id !== id));
    };

    const addTest = () => {
        if (!selectedTestId) return;
        const test = availableTests.find(t => t._id === selectedTestId);
        if (!test || labTests.some(t => t._id === test._id)) return; // Prevent duplicates
        setLabTests([...labTests, { _id: test._id, testName: test.testName, testCode: test.testCode }]);
        setSelectedTestId('');
    };

    const removeTest = (testId) => {
        setLabTests(labTests.filter(t => t._id !== testId));
    };

    const addRadiologyTest = () => {
        if (!selectedRadiologyTestId) return;
        const test = availableRadiologyTests.find(t => t._id === selectedRadiologyTestId);
        if (!test || radiologyTests.some(t => t._id === test._id)) return; // Prevent duplicates
        setRadiologyTests([...radiologyTests, { _id: test._id, testName: test.testName, testCode: test.testCode, modality: test.modality }]);
        setSelectedRadiologyTestId('');
    };

    const removeRadiologyTest = (testId) => {
        setRadiologyTests(radiologyTests.filter(t => t._id !== testId));
    };

    const handleFinish = async () => {
        try {
            // 1. Update Appointment Status, Notes, Diagnosis & Prescription
            const response = await axios.put(`${API_RES_URL}opd/appointments/${appointmentId}`, {
                status: 'completed',
                notes: notes,
                diagnosis: diagnosis,
                chiefComplaint: symptoms,
                prescription: medicines.map(({ id, ...rest }) => rest)
            }, getConfig());

            // 2. Create Lab Orders for each selected test
            if (labTests.length > 0) {
                const labOrderPromises = labTests.map(test =>
                    axios.post(`${API_RES_URL}lab/orders`, {
                        patient: appointment.patient._id,
                        visit: appointmentId,
                        visitModel: 'Appointment',
                        test: test._id
                    }, getConfig())
                );
                await Promise.all(labOrderPromises);
            }

            // 3. Create Radiology Orders for each selected test
            if (radiologyTests.length > 0) {
                const radiologyOrderPromises = radiologyTests.map(test =>
                    axios.post(`${API_RES_URL}radiology/orders`, {
                        patient: appointment.patient._id,
                        visit: appointmentId,
                        visitModel: 'Appointment',
                        test: test._id
                    }, getConfig())
                );
                await Promise.all(radiologyOrderPromises);
            }

            const ordersSummary = [];
            if (labTests.length > 0) ordersSummary.push(`${labTests.length} Lab Test(s)`);
            if (radiologyTests.length > 0) ordersSummary.push(`${radiologyTests.length} Radiology Scan(s)`);

            alert(`Consultation Completed! Prescription${ordersSummary.length > 0 ? ' & ' + ordersSummary.join(', ') : ''} Saved.\n\nClinical Coding tab is now available below.`);

            // Refresh appointment state to show Clinical Coding tab
            setAppointment(response.data.data);
        } catch (error) {
            console.error("Error saving consultation", error);
            alert("Failed to save consultation");
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading patient data...</div>;
    if (!appointment) return <div className="p-12 text-center text-red-500">Appointment not found</div>;

    const fetchHistory = async () => {
        if (!appointment?.patient?._id) return;
        try {
            const res = await axios.get(`${API_RES_URL}patients/${appointment.patient._id}/history`, getConfig());
            setPatientHistory(res.data.data.appointments || []);
            setShowHistory(true);
        } catch (error) {
            console.error("Error fetching history", error);
            alert("Could not fetch patient history");
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 relative">
            {/* History Sidebar/Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Patient History</h2>
                            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <ArrowLeft size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 relative border-l-2 border-slate-100 ml-4 pl-6">
                            {patientHistory.length === 0 ? (
                                <p className="text-gray-500 italic">No previous history found.</p>
                            ) : (
                                patientHistory.map((visit) => (
                                    <div key={visit._id} className="relative mb-8">
                                        <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-slate-200 border-2 border-white ring-2 ring-slate-50"></div>
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">{new Date(visit.scheduledDate).toLocaleDateString()}</div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="font-bold text-slate-700 mb-2">{visit.type || 'OPD Visit'}</div>
                                            {visit.diagnosis && (
                                                <div className="mb-2">
                                                    <div className="text-xs text-slate-400 uppercase">Diagnosis</div>
                                                    <div className="text-slate-800">{visit.diagnosis}</div>
                                                </div>
                                            )}
                                            {visit.chiefComplaint && (
                                                <div className="mb-2">
                                                    <div className="text-xs text-slate-400 uppercase">Symptoms</div>
                                                    <div className="text-slate-600 text-sm">{visit.chiefComplaint}</div>
                                                </div>
                                            )}
                                            {visit.prescription && visit.prescription.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <div className="text-xs text-emerald-600 font-bold uppercase mb-1 flex items-center gap-1"><Pill size={10} /> Meds</div>
                                                    <ul className="text-sm text-slate-600 list-disc ml-4">
                                                        {visit.prescription.map((m, i) => (
                                                            <li key={i}>{m.name} ({m.dosage})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Consultation</h1>
                    <p className="text-gray-500 text-sm">Token #{appointment.tokenNumber || 'N/A'} • {new Date().toLocaleDateString()}</p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button onClick={fetchHistory} className="px-4 py-2 border border-gray-200 rounded-lg text-slate-600 hover:bg-slate-50">View History</button>

                    <button
                        onClick={handleFinish}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/30 font-medium flex items-center gap-2"
                    >
                        <Save size={18} /> Finish Consultation
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Info & Vitals */}
                <div className="space-y-6">
                    {/* Patient Card */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-2xl font-bold">
                                {appointment.patient.firstName[0]}{appointment.patient.lastName[0]}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{appointment.patient.firstName} {appointment.patient.lastName}</h2>
                                <p className="text-sm text-gray-500">{appointment.patient.patientId}</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span>Age / Gender</span>
                                <span className="font-medium text-slate-800">{appointment.patient.age || 'N/A'} / <span className="capitalize">{appointment.patient.gender}</span></span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span>Blood Group</span>
                                <span className="font-medium text-red-500">{appointment.patient.bloodGroup || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Contact</span>
                                <span className="font-medium text-slate-800">{appointment.patient.phone}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vitals (Static for now) */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-primary" /> Vitals
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-xs text-gray-400 uppercase">BP</div>
                                <div className="font-bold text-slate-700">120/80</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-xs text-gray-400 uppercase">Heart Rate</div>
                                <div className="font-bold text-slate-700">72 bpm</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-xs text-gray-400 uppercase">Temp</div>
                                <div className="font-bold text-slate-700">98.6°F</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-xs text-gray-400 uppercase">SpO2</div>
                                <div className="font-bold text-slate-700">98%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Clinical Notes & Rx */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Clinical Notes - Medical Pad Design */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="bg-cyan-50 p-8 rounded-2xl shadow-sm border border-cyan-100 relative overflow-hidden"
                        style={{
                            backgroundImage: 'linear-gradient(#14b8a61a 1px, transparent 1px)',
                            backgroundSize: '100% 32px'
                        }}
                    >
                        {/* Header Stripe */}
                        <div className="absolute top-0 left-0 w-2 h-full bg-primary/20"></div>

                        <div className="relative z-10 pl-6">
                            <h3 className="font-bold text-teal-800 mb-6 flex items-center gap-2 text-xl">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
                                    <FileText size={20} />
                                </div>
                                Clinical Notes
                            </h3>

                            <div className="space-y-8">
                                <div className="relative">
                                    <label className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1 block">Symptoms & Complaints</label>
                                    <textarea
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-700 text-lg leading-8 resize-none font-medium placeholder-teal-800/20"
                                        style={{ lineHeight: '32px' }}
                                        rows="3"
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                        placeholder="Patient reports fever, headache..."
                                    ></textarea>
                                </div>

                                <div className="relative">
                                    <label className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1 block">Final Diagnosis</label>
                                    <input
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-800 text-xl leading-8 font-bold placeholder-teal-800/20"
                                        style={{ lineHeight: '32px' }}
                                        value={diagnosis}
                                        onChange={(e) => setDiagnosis(e.target.value)}
                                        placeholder="Brief Diagnosis..."
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Prescription - Rx Pad Design */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, type: "spring" }}
                        className="bg-emerald-50 p-8 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden"
                    >
                        {/* Rx Watermark */}
                        <div className="absolute top-4 right-4 text-emerald-900/5 font-serif text-9xl leading-none select-none pointer-events-none">Rx</div>

                        <h3 className="font-bold text-emerald-800 mb-6 flex items-center gap-2 text-xl relative z-10">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                                <Pill size={20} />
                            </div>
                            Prescription
                        </h3>

                        {/* Rx Input */}
                        <div className="grid grid-cols-12 gap-3 mb-6 items-center bg-white p-2 rounded-xl shadow-xs border border-emerald-100 relative z-10">
                            <div className="col-span-4">
                                <input
                                    placeholder="Medicine Name"
                                    className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-slate-700 font-medium placeholder-gray-400"
                                    value={newMed.name}
                                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 border-l border-gray-100">
                                <input
                                    placeholder="Dose"
                                    className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-slate-700 placeholder-gray-400"
                                    value={newMed.dosage}
                                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                                />
                            </div>
                            <div className="col-span-3 border-l border-gray-100">
                                <select
                                    className="w-full bg-transparent border-none focus:ring-0 px-2 py-2 text-slate-700"
                                    value={newMed.frequency}
                                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                                >
                                    <option value="1-0-0">1-0-0 (M)</option>
                                    <option value="1-0-1">1-0-1 (M-N)</option>
                                    <option value="1-1-1">1-1-1 (M-A-N)</option>
                                    <option value="0-0-1">0-0-1 (N)</option>
                                    <option value="SOS">SOS</option>
                                </select>
                            </div>
                            <div className="col-span-2 border-l border-gray-100">
                                <input
                                    placeholder="Dur."
                                    className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-slate-700 placeholder-gray-400"
                                    value={newMed.duration}
                                    onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                                />
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <button
                                    onClick={addMedicine}
                                    className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm transition-transform active:scale-95"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Rx List */}
                        <div className="space-y-3 relative z-10">
                            {medicines.map((med, idx) => (
                                <motion.div
                                    key={med.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-between items-center p-4 bg-white rounded-xl border border-emerald-50 shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-lg leading-tight">{med.name}</div>
                                            <div className="text-xs text-gray-400 font-medium mt-0.5">{med.dosage}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{med.frequency}</span>
                                            <span className="text-xs text-gray-400 mt-1">{med.duration}</span>
                                        </div>
                                        <button onClick={() => removeMedicine(med.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            {medicines.length === 0 && (
                                <div className="text-center py-8 opacity-50">
                                    <Pill size={32} className="mx-auto text-emerald-300 mb-2" />
                                    <p className="text-emerald-700 text-sm">No medicines prescribed.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Lab Tests Order Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                        className="bg-blue-50 p-8 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden"
                    >
                        {/* Lab Watermark */}
                        <div className="absolute top-4 right-4 text-blue-900/5 font-serif text-7xl leading-none select-none pointer-events-none">🧪</div>

                        <h3 className="font-bold text-blue-800 mb-6 flex items-center gap-2 text-xl relative z-10">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                <FlaskConical size={20} />
                            </div>
                            Lab Tests
                        </h3>

                        {/* Test Selector */}
                        <div className="flex gap-3 mb-6 relative z-10">
                            <select
                                className="flex-1 px-4 py-2.5 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700"
                                value={selectedTestId}
                                onChange={(e) => setSelectedTestId(e.target.value)}
                            >
                                <option value="">Select a Lab Test...</option>
                                {availableTests.map((test) => (
                                    <option key={test._id} value={test._id}>
                                        {test.testName} ({test.testCode})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={addTest}
                                className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-sm transition-all flex items-center gap-2 font-medium"
                            >
                                <Plus size={18} /> Add
                            </button>
                        </div>

                        {/* Ordered Tests List */}
                        <div className="space-y-3 relative z-10">
                            {labTests.map((test, idx) => (
                                <motion.div
                                    key={test._id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-between items-center p-4 bg-white rounded-xl border border-blue-50 shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{test.testName}</div>
                                            <div className="text-xs text-gray-400 font-mono">{test.testCode}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeTest(test._id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                        <Trash size={18} />
                                    </button>
                                </motion.div>
                            ))}
                            {labTests.length === 0 && (
                                <div className="text-center py-8 opacity-50">
                                    <FlaskConical size={32} className="mx-auto text-blue-300 mb-2" />
                                    <p className="text-blue-700 text-sm">No lab tests ordered.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Radiology Scans Order Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.25, type: "spring" }}
                        className="bg-violet-50 p-8 rounded-2xl shadow-sm border border-violet-100 relative overflow-hidden"
                    >
                        {/* Radiology Watermark */}
                        <div className="absolute top-4 right-4 text-violet-900/5 font-serif text-7xl leading-none select-none pointer-events-none">📷</div>

                        <h3 className="font-bold text-violet-800 mb-6 flex items-center gap-2 text-xl relative z-10">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-violet-600">
                                <Scan size={20} />
                            </div>
                            Radiology Scans
                        </h3>

                        {/* Test Selector */}
                        <div className="flex gap-3 mb-6 relative z-10">
                            <select
                                className="flex-1 px-4 py-2.5 bg-white border border-violet-100 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-slate-700"
                                value={selectedRadiologyTestId}
                                onChange={(e) => setSelectedRadiologyTestId(e.target.value)}
                            >
                                <option value="">Select a Radiology Scan...</option>
                                {availableRadiologyTests.map((test) => (
                                    <option key={test._id} value={test._id}>
                                        {test.testName} ({test.modality}) - {test.testCode}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={addRadiologyTest}
                                className="px-4 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 shadow-sm transition-all flex items-center gap-2 font-medium"
                            >
                                <Plus size={18} /> Add
                            </button>
                        </div>

                        {/* Ordered Radiology Tests List */}
                        <div className="space-y-3 relative z-10">
                            {radiologyTests.map((test, idx) => (
                                <motion.div
                                    key={test._id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-between items-center p-4 bg-white rounded-xl border border-violet-50 shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{test.testName}</div>
                                            <div className="text-xs text-gray-400">
                                                <span className="font-mono">{test.testCode}</span>
                                                {test.modality && <span className="ml-2 px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded text-[10px] font-medium">{test.modality}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeRadiologyTest(test._id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                        <Trash size={18} />
                                    </button>
                                </motion.div>
                            ))}
                            {radiologyTests.length === 0 && (
                                <div className="text-center py-8 opacity-50">
                                    <Scan size={32} className="mx-auto text-violet-300 mb-2" />
                                    <p className="text-violet-700 text-sm">No radiology scans ordered.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Care Plan Section (Only for IPD Patients) */}
                    {activeAdmission && (
                        <CarePlanCreator
                            patient={appointment.patient}
                            admission={activeAdmission}
                            onSuccess={() => {
                                alert('Care Plan created! Nursing tasks have been generated.');
                            }}
                        />
                    )}

                    {/* IPD Notice for OPD Patients */}
                    {!activeAdmission && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
                            className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-100 rounded-xl">
                                    <ClipboardList size={24} className="text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-600">Care Plans</h3>
                                    <p className="text-sm text-gray-400">
                                        Care plans can be created for admitted (IPD) patients only.
                                        This is an outpatient consultation.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Clinical Coding Section - Displays for completed encounters */}
                    {appointment.status === 'completed' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.35, type: "spring" }}
                        >
                            <ClinicalCodingTab
                                encounterId={appointmentId}
                                encounterModel="Appointment"
                                encounterType="opd"
                                encounterData={appointment}
                            />
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Consultation;
