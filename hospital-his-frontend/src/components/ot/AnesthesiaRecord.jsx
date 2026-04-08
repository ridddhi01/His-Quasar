import React, { useState, useEffect } from 'react';
import { Syringe, Plus, Activity, Clock, Pill, Save, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const AnesthesiaRecord = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('main');

    const [mainForm, setMainForm] = useState({
        asaGrade: '',
        preOpDiagnosis: '',
        allergies: [],
        npoStatus: '',
        airwayAssessment: '',
        inductionTime: '',
        intubationTime: '',
        anesthesiaStart: '',
        anesthesiaEnd: '',
        fluidInput: '',
        bloodLoss: '',
        urineOutput: '',
        complications: '',
        notes: ''
    });

    const [vitalsForm, setVitalsForm] = useState({
        heartRate: '',
        bloodPressure: '',
        spO2: '',
        etCO2: '',
        temperature: '',
        respiratoryRate: '',
        notes: ''
    });

    const [drugForm, setDrugForm] = useState({
        drugName: '',
        dose: '',
        route: 'IV'
    });

    useEffect(() => {
        fetchRecord();
    }, [surgeryId]);

    const fetchRecord = async () => {
        try {
            const res = await surgeryService.getAnesthesiaRecord(surgeryId);
            if (res.data && Object.keys(res.data).length > 0) {
                setRecord(res.data);
                setMainForm(prev => ({
                    ...prev,
                    asaGrade: res.data.asaGrade || '',
                    preOpDiagnosis: res.data.preOpDiagnosis || '',
                    npoStatus: res.data.npoStatus || '',
                    airwayAssessment: res.data.airwayAssessment || '',
                    fluidInput: res.data.fluidInput || '',
                    bloodLoss: res.data.bloodLoss || '',
                    urineOutput: res.data.urineOutput || '',
                    complications: res.data.complications || '',
                    notes: res.data.notes || ''
                }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMain = async () => {
        try {
            await surgeryService.addAnesthesiaRecord(surgeryId, mainForm);
            toast.success('Anesthesia Record Saved');
            fetchRecord();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const handleAddVitals = async () => {
        if (!vitalsForm.heartRate && !vitalsForm.bloodPressure) {
            toast.error('Enter at least heart rate or blood pressure');
            return;
        }
        try {
            await surgeryService.addAnesthesiaVitals(surgeryId, vitalsForm);
            toast.success('Vitals Added');
            setVitalsForm({ heartRate: '', bloodPressure: '', spO2: '', etCO2: '', temperature: '', respiratoryRate: '', notes: '' });
            fetchRecord();
        } catch (error) {
            toast.error('Failed to add vitals');
        }
    };

    const handleAddDrug = async () => {
        if (!drugForm.drugName) {
            toast.error('Enter drug name');
            return;
        }
        try {
            await surgeryService.addAnesthesiaDrug(surgeryId, drugForm);
            toast.success('Drug Added');
            setDrugForm({ drugName: '', dose: '', route: 'IV' });
            fetchRecord();
        } catch (error) {
            toast.error('Failed to add drug');
        }
    };

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Loading anesthesia record...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Syringe className="text-primary" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Anesthesia Record</h3>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2">
                {['main', 'vitals', 'drugs'].map(section => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeSection === section ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {section === 'main' && 'Main Record'}
                        {section === 'vitals' && `Vitals Timeline (${record?.vitalsTimeline?.length || 0})`}
                        {section === 'drugs' && `Drugs (${record?.drugsAdministered?.length || 0})`}
                    </button>
                ))}
            </div>

            {/* Main Record */}
            {activeSection === 'main' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ASA Grade</label>
                            <select
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                value={mainForm.asaGrade}
                                onChange={(e) => setMainForm({ ...mainForm, asaGrade: e.target.value })}
                            >
                                <option value="">Select</option>
                                {['I', 'II', 'III', 'IV', 'V', 'VI'].map(g => (
                                    <option key={g} value={g}>ASA {g}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">NPO Status</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                placeholder="e.g., NPO 8 hours"
                                value={mainForm.npoStatus}
                                onChange={(e) => setMainForm({ ...mainForm, npoStatus: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Airway Assessment</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                placeholder="Mallampati, etc."
                                value={mainForm.airwayAssessment}
                                onChange={(e) => setMainForm({ ...mainForm, airwayAssessment: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fluid Input</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                placeholder="e.g., 1500ml NS"
                                value={mainForm.fluidInput}
                                onChange={(e) => setMainForm({ ...mainForm, fluidInput: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Blood Loss</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                placeholder="e.g., 200ml"
                                value={mainForm.bloodLoss}
                                onChange={(e) => setMainForm({ ...mainForm, bloodLoss: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Urine Output</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                placeholder="e.g., 300ml"
                                value={mainForm.urineOutput}
                                onChange={(e) => setMainForm({ ...mainForm, urineOutput: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Complications</label>
                        <textarea
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                            rows="2"
                            value={mainForm.complications}
                            onChange={(e) => setMainForm({ ...mainForm, complications: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                            rows="2"
                            value={mainForm.notes}
                            onChange={(e) => setMainForm({ ...mainForm, notes: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSaveMain}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold"
                    >
                        <Save size={18} /> Save Record
                    </button>
                </div>
            )}

            {/* Vitals Timeline */}
            {activeSection === 'vitals' && (
                <div className="space-y-4">
                    {/* Add Vitals Form */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <Activity size={18} /> Add Vitals Reading
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <input
                                type="number"
                                className="px-3 py-2 bg-white border border-blue-200 rounded-lg"
                                placeholder="Heart Rate"
                                value={vitalsForm.heartRate}
                                onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
                            />
                            <input
                                type="text"
                                className="px-3 py-2 bg-white border border-blue-200 rounded-lg"
                                placeholder="BP (120/80)"
                                value={vitalsForm.bloodPressure}
                                onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white border border-blue-200 rounded-lg"
                                placeholder="SpO2 %"
                                value={vitalsForm.spO2}
                                onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: e.target.value })}
                            />
                            <input
                                type="number"
                                className="px-3 py-2 bg-white border border-blue-200 rounded-lg"
                                placeholder="EtCO2"
                                value={vitalsForm.etCO2}
                                onChange={(e) => setVitalsForm({ ...vitalsForm, etCO2: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleAddVitals}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                        >
                            <Plus size={16} /> Add Reading
                        </button>
                    </div>

                    {/* Vitals List */}
                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Time</th>
                                    <th className="px-4 py-3 text-left">HR</th>
                                    <th className="px-4 py-3 text-left">BP</th>
                                    <th className="px-4 py-3 text-left">SpO2</th>
                                    <th className="px-4 py-3 text-left">EtCO2</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(record?.vitalsTimeline || []).length === 0 ? (
                                    <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No vitals recorded</td></tr>
                                ) : (
                                    record.vitalsTimeline.map((v, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-3">{new Date(v.time).toLocaleTimeString()}</td>
                                            <td className="px-4 py-3">{v.heartRate || '-'}</td>
                                            <td className="px-4 py-3">{v.bloodPressure || '-'}</td>
                                            <td className="px-4 py-3">{v.spO2 || '-'}%</td>
                                            <td className="px-4 py-3">{v.etCO2 || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Drugs Administered */}
            {activeSection === 'drugs' && (
                <div className="space-y-4">
                    {/* Add Drug Form */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                            <Pill size={18} /> Add Drug
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                                type="text"
                                className="px-3 py-2 bg-white border border-purple-200 rounded-lg"
                                placeholder="Drug Name"
                                value={drugForm.drugName}
                                onChange={(e) => setDrugForm({ ...drugForm, drugName: e.target.value })}
                            />
                            <input
                                type="text"
                                className="px-3 py-2 bg-white border border-purple-200 rounded-lg"
                                placeholder="Dose"
                                value={drugForm.dose}
                                onChange={(e) => setDrugForm({ ...drugForm, dose: e.target.value })}
                            />
                            <select
                                className="px-3 py-2 bg-white border border-purple-200 rounded-lg"
                                value={drugForm.route}
                                onChange={(e) => setDrugForm({ ...drugForm, route: e.target.value })}
                            >
                                <option value="IV">IV</option>
                                <option value="IM">IM</option>
                                <option value="Inhalation">Inhalation</option>
                                <option value="Epidural">Epidural</option>
                                <option value="Spinal">Spinal</option>
                                <option value="Other">Other</option>
                            </select>
                            <button
                                onClick={handleAddDrug}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium"
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>
                    </div>

                    {/* Drugs List */}
                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Time</th>
                                    <th className="px-4 py-3 text-left">Drug</th>
                                    <th className="px-4 py-3 text-left">Dose</th>
                                    <th className="px-4 py-3 text-left">Route</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(record?.drugsAdministered || []).length === 0 ? (
                                    <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-400">No drugs recorded</td></tr>
                                ) : (
                                    record.drugsAdministered.map((d, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-3">{new Date(d.timeGiven).toLocaleTimeString()}</td>
                                            <td className="px-4 py-3 font-medium">{d.drugName}</td>
                                            <td className="px-4 py-3">{d.dose || '-'}</td>
                                            <td className="px-4 py-3">{d.route}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnesthesiaRecord;
