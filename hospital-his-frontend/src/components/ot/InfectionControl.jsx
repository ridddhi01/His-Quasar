import React, { useState, useEffect } from 'react';
import { AlertTriangle, Save, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const InfectionControl = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        ssiRiskCategory: '',
        antibioticProphylaxis: { given: false, drug: '', dose: '', timeGiven: '' },
        skinPrepDone: false,
        sterilityMaintained: false,
        postOpInfection: false,
        infectionDetails: '',
        notes: ''
    });

    useEffect(() => {
        fetchRecord();
    }, [surgeryId]);

    const fetchRecord = async () => {
        try {
            const res = await surgeryService.getInfectionControl(surgeryId);
            if (res.data) setForm(prev => ({ ...prev, ...res.data }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            await surgeryService.updateInfectionControl(surgeryId, form);
            toast.success('Infection Control Saved');
            if (onUpdate) onUpdate();
        } catch (e) { toast.error('Failed to save'); }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-primary" /> Infection Control
            </h3>
            <div className="bg-white border rounded-xl p-6 space-y-4">
                <div>
                    <label className="block font-medium mb-2">SSI Risk Category</label>
                    <select className="w-full px-3 py-2 bg-gray-50 border rounded-lg" value={form.ssiRiskCategory}
                        onChange={(e) => setForm({ ...form, ssiRiskCategory: e.target.value })}>
                        <option value="">Select</option>
                        <option value="clean">Clean</option>
                        <option value="clean-contaminated">Clean-Contaminated</option>
                        <option value="contaminated">Contaminated</option>
                        <option value="dirty">Dirty</option>
                    </select>
                </div>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.antibioticProphylaxis.given}
                        onChange={(e) => setForm({ ...form, antibioticProphylaxis: { ...form.antibioticProphylaxis, given: e.target.checked } })} />
                    <span>Antibiotic Prophylaxis Given</span>
                </label>
                {form.antibioticProphylaxis.given && (
                    <div className="grid grid-cols-3 gap-3">
                        <input className="px-3 py-2 border rounded-lg" placeholder="Drug" value={form.antibioticProphylaxis.drug}
                            onChange={(e) => setForm({ ...form, antibioticProphylaxis: { ...form.antibioticProphylaxis, drug: e.target.value } })} />
                        <input className="px-3 py-2 border rounded-lg" placeholder="Dose" value={form.antibioticProphylaxis.dose}
                            onChange={(e) => setForm({ ...form, antibioticProphylaxis: { ...form.antibioticProphylaxis, dose: e.target.value } })} />
                        <input type="time" className="px-3 py-2 border rounded-lg" value={form.antibioticProphylaxis.timeGiven}
                            onChange={(e) => setForm({ ...form, antibioticProphylaxis: { ...form.antibioticProphylaxis, timeGiven: e.target.value } })} />
                    </div>
                )}
                <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.skinPrepDone}
                        onChange={(e) => setForm({ ...form, skinPrepDone: e.target.checked })} /> Skin Prep Done</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.sterilityMaintained}
                        onChange={(e) => setForm({ ...form, sterilityMaintained: e.target.checked })} /> Sterility Maintained</label>
                </div>
                <label className="flex items-center gap-2 text-red-700">
                    <input type="checkbox" checked={form.postOpInfection}
                        onChange={(e) => setForm({ ...form, postOpInfection: e.target.checked })} /> Post-Op Infection
                </label>
                {form.postOpInfection && (
                    <textarea className="w-full px-3 py-2 border rounded-lg" rows="2" placeholder="Details..."
                        value={form.infectionDetails} onChange={(e) => setForm({ ...form, infectionDetails: e.target.value })} />
                )}
                <textarea className="w-full px-3 py-2 bg-gray-50 border rounded-lg" rows="2" placeholder="Notes..."
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold">
                    <Save size={18} /> Save
                </button>
            </div>
        </div>
    );
};

export default InfectionControl;
