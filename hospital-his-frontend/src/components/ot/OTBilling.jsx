import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const OTBilling = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [form, setForm] = useState({
        otCharges: 5000,
        surgeonFee: 10000,
        anesthetistFee: 5000,
        additionalCharges: 0,
        discount: 0
    });

    useEffect(() => {
        fetchBilling();
    }, [surgeryId]);

    const fetchBilling = async () => {
        try {
            const res = await surgeryService.getOTBilling(surgeryId);
            if (res.data) setBilling(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await surgeryService.generateOTBilling(surgeryId, form);
            toast.success('OT Billing Generated');
            fetchBilling();
            if (onUpdate) onUpdate();
        } catch (e) { toast.error(e.response?.data?.error || 'Failed to generate billing'); }
        finally { setGenerating(false); }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

    // If billing exists
    if (billing || surgery?.billingGenerated) {
        return (
            <div className="space-y-6">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <FileText className="text-primary" /> OT Billing
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 size={24} className="text-green-600" />
                        <span className="font-semibold text-green-800">Billing Generated</span>
                    </div>
                    {billing && (
                        <div className="space-y-3">
                            <div className="flex justify-between"><span>Bill Number:</span><span className="font-mono">{billing.billNumber}</span></div>
                            <div className="flex justify-between"><span>Total Amount:</span><span className="font-bold">₹{billing.totalAmount?.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Status:</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${billing.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {billing.status}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Generate billing form
    return (
        <div className="space-y-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText className="text-primary" /> OT Billing
            </h3>

            {surgery?.status !== 'completed' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="text-yellow-600" />
                    <span className="text-yellow-800">Surgery must be completed before generating billing</span>
                </div>
            )}

            <div className="bg-white border rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">OT Charges (₹)</label>
                        <input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg"
                            value={form.otCharges} onChange={(e) => setForm({ ...form, otCharges: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Surgeon Fee (₹)</label>
                        <input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg"
                            value={form.surgeonFee} onChange={(e) => setForm({ ...form, surgeonFee: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Anesthetist Fee (₹)</label>
                        <input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg"
                            value={form.anesthetistFee} onChange={(e) => setForm({ ...form, anesthetistFee: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Additional Charges (₹)</label>
                        <input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg"
                            value={form.additionalCharges} onChange={(e) => setForm({ ...form, additionalCharges: parseFloat(e.target.value) || 0 })} />
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <div className="flex justify-between text-lg mb-2">
                        <span>Subtotal:</span>
                        <span className="font-bold">₹{(form.otCharges + form.surgeonFee + form.anesthetistFee + form.additionalCharges).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-500">+ Implants/Consumables will be added automatically</p>
                </div>

                <button onClick={handleGenerate} disabled={generating || surgery?.status !== 'completed'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50">
                    <DollarSign size={18} /> {generating ? 'Generating...' : 'Generate OT Bill'}
                </button>
            </div>
        </div>
    );
};

export default OTBilling;
