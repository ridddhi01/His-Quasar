import React, { useState, useEffect } from 'react';
import {
    ClipboardCheck,
    Save,
    AlertTriangle,
    CheckCircle2,
    User,
    Pill,
    Heart,
    Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const PreOpAssessment = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        history: '',
        physicalExamination: '',
        investigations: '',
        asaGrade: '',
        riskFactors: [],
        allergies: [],
        currentMedications: [],
        fasting: '',
        consent: {
            obtained: false,
        },
        fitForSurgery: false,
        notes: ''
    });

    const [newRiskFactor, setNewRiskFactor] = useState('');
    const [newAllergy, setNewAllergy] = useState('');
    const [newMedication, setNewMedication] = useState('');

    useEffect(() => {
        fetchAssessment();
    }, [surgeryId]);

    const fetchAssessment = async () => {
        try {
            const res = await surgeryService.getPreOpAssessment(surgeryId);
            if (res.data && Object.keys(res.data).length > 0) {
                setAssessment(res.data);
                setForm({
                    history: res.data.history || '',
                    physicalExamination: res.data.physicalExamination || '',
                    investigations: res.data.investigations || '',
                    asaGrade: res.data.asaGrade || '',
                    riskFactors: res.data.riskFactors || [],
                    allergies: res.data.allergies || [],
                    currentMedications: res.data.currentMedications || [],
                    fasting: res.data.fasting || '',
                    consent: res.data.consent || { obtained: false },
                    fitForSurgery: res.data.fitForSurgery || false,
                    notes: res.data.notes || ''
                });
            } else {
                // Only auto-enable editing if not readOnly
                if (!readOnly) setIsEditing(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await surgeryService.addPreOpAssessment(surgeryId, form);
            toast.success('Pre-Op Assessment Saved');
            setIsEditing(false);
            fetchAssessment();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to save assessment');
        } finally {
            setSaving(false);
        }
    };

    const addToList = (field, value, setter) => {
        if (value.trim()) {
            setForm(prev => ({
                ...prev,
                [field]: [...prev[field], value.trim()]
            }));
            setter('');
        }
    };

    const removeFromList = (field, index) => {
        setForm(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Loading pre-op assessment...</div>;
    }

    // View Mode
    if (assessment && !isEditing) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ClipboardCheck className="text-primary" /> Pre-Operative Assessment
                    </h3>
                    {!readOnly && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm"
                        >
                            Edit Assessment
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-2">Patient History</h4>
                        <p className="text-gray-600 text-sm">{assessment.history || 'Not recorded'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-2">Physical Examination</h4>
                        <p className="text-gray-600 text-sm">{assessment.physicalExamination || 'Not recorded'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-2">Investigations</h4>
                        <p className="text-gray-600 text-sm">{assessment.investigations || 'Not recorded'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-2">ASA Grade</h4>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                            ASA {assessment.asaGrade || 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} /> Allergies
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            {assessment.allergies?.length > 0 ? (
                                assessment.allergies.map((a, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{a}</span>
                                ))
                            ) : (
                                <span className="text-gray-500 text-sm">None</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                            <Heart size={16} /> Risk Factors
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            {assessment.riskFactors?.length > 0 ? (
                                assessment.riskFactors.map((r, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">{r}</span>
                                ))
                            ) : (
                                <span className="text-gray-500 text-sm">None</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                            <Pill size={16} /> Current Medications
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            {assessment.currentMedications?.length > 0 ? (
                                assessment.currentMedications.map((m, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{m}</span>
                                ))
                            ) : (
                                <span className="text-gray-500 text-sm">None</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-1">Fasting Status</h4>
                        <p className="text-gray-600 text-sm">{assessment.fasting || 'Not recorded'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-1">Consent</h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${assessment.consent?.obtained ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {assessment.consent?.obtained ? 'Obtained' : 'Not Obtained'}
                        </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-1">Fit for Surgery</h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${assessment.fitForSurgery ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {assessment.fitForSurgery ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>

                {assessment.notes && (
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-semibold text-slate-700 mb-2">Additional Notes</h4>
                        <p className="text-gray-600 text-sm">{assessment.notes}</p>
                    </div>
                )}
            </div>
        );
    }

    // Edit Mode
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <ClipboardCheck className="text-primary" /> Pre-Operative Assessment
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block font-medium text-slate-700 mb-2">Patient History</label>
                    <textarea
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                        rows="3"
                        placeholder="Medical history, previous surgeries..."
                        value={form.history}
                        onChange={(e) => setForm({ ...form, history: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block font-medium text-slate-700 mb-2">Physical Examination</label>
                    <textarea
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                        rows="3"
                        placeholder="Findings from physical exam..."
                        value={form.physicalExamination}
                        onChange={(e) => setForm({ ...form, physicalExamination: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block font-medium text-slate-700 mb-2">Investigations</label>
                    <textarea
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                        rows="2"
                        placeholder="Lab results, imaging..."
                        value={form.investigations}
                        onChange={(e) => setForm({ ...form, investigations: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block font-medium text-slate-700 mb-2">ASA Grade</label>
                    <select
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                        value={form.asaGrade}
                        onChange={(e) => setForm({ ...form, asaGrade: e.target.value })}
                    >
                        <option value="">Select ASA Grade</option>
                        <option value="I">I - Healthy patient</option>
                        <option value="II">II - Mild systemic disease</option>
                        <option value="III">III - Severe systemic disease</option>
                        <option value="IV">IV - Life-threatening disease</option>
                        <option value="V">V - Moribund patient</option>
                        <option value="VI">VI - Brain-dead organ donor</option>
                    </select>
                </div>
            </div>

            {/* Allergies */}
            <div>
                <label className="block font-medium text-slate-700 mb-2">Allergies</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                        placeholder="Add allergy..."
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addToList('allergies', newAllergy, setNewAllergy)}
                    />
                    <button
                        onClick={() => addToList('allergies', newAllergy, setNewAllergy)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {form.allergies.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm flex items-center gap-1">
                            {a}
                            <button onClick={() => removeFromList('allergies', i)} className="ml-1 text-red-500">×</button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Risk Factors */}
            <div>
                <label className="block font-medium text-slate-700 mb-2">Risk Factors</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                        placeholder="Add risk factor..."
                        value={newRiskFactor}
                        onChange={(e) => setNewRiskFactor(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addToList('riskFactors', newRiskFactor, setNewRiskFactor)}
                    />
                    <button
                        onClick={() => addToList('riskFactors', newRiskFactor, setNewRiskFactor)}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {form.riskFactors.map((r, i) => (
                        <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm flex items-center gap-1">
                            {r}
                            <button onClick={() => removeFromList('riskFactors', i)} className="ml-1 text-yellow-500">×</button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Current Medications */}
            <div>
                <label className="block font-medium text-slate-700 mb-2">Current Medications</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                        placeholder="Add medication..."
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addToList('currentMedications', newMedication, setNewMedication)}
                    />
                    <button
                        onClick={() => addToList('currentMedications', newMedication, setNewMedication)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {form.currentMedications.map((m, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                            {m}
                            <button onClick={() => removeFromList('currentMedications', i)} className="ml-1 text-blue-500">×</button>
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block font-medium text-slate-700 mb-2">Fasting Status</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                        placeholder="e.g., NPO since 6 hours"
                        value={form.fasting}
                        onChange={(e) => setForm({ ...form, fasting: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block font-medium text-slate-700 mb-2">Additional Notes</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                        placeholder="Any other notes..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300"
                        checked={form.consent.obtained}
                        onChange={(e) => setForm({ ...form, consent: { ...form.consent, obtained: e.target.checked } })}
                    />
                    <span className="font-medium text-slate-700">Informed Consent Obtained</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300"
                        checked={form.fitForSurgery}
                        onChange={(e) => setForm({ ...form, fitForSurgery: e.target.checked })}
                    />
                    <span className="font-medium text-slate-700">Fit for Surgery</span>
                </label>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Assessment'}
                </button>
                {assessment && (
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default PreOpAssessment;
