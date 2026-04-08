import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, Building, Send, ArrowLeft } from 'lucide-react';
import incidentService from '../../services/incident.service';
import toast from 'react-hot-toast';

const ReportIncident = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(false);

    // Get user's department info
    const userDepartment = user?.department;
    const departmentId = userDepartment?._id || userDepartment;
    const departmentName = userDepartment?.name || 'Your Department';

    const [formData, setFormData] = useState({
        whatHappened: '',
        location: '',
        occurredAt: '',
        wasHarm: false,
        whatCouldHaveGoneWrong: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.whatHappened || !formData.location || !formData.occurredAt) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (!departmentId) {
            toast.error('You are not assigned to a department. Please contact admin.');
            return;
        }

        setLoading(true);
        try {
            await incidentService.createIncident({
                ...formData,
                department: departmentId,
                occurredAt: new Date(formData.occurredAt).toISOString(),
            });
            toast.success('Incident report submitted successfully');
            navigate('/dashboard/my-incidents');
        } catch (error) {
            console.error('Error submitting incident:', error);
            toast.error(error.response?.data?.message || 'Failed to submit incident report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-4"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                        <AlertTriangle size={22} />
                    </div>
                    Report an Incident
                </h1>
                <p className="text-slate-500 mt-2">
                    Use this form to report any incident, near-miss, or safety concern. All reports are confidential.
                </p>
            </div>

            {/* Form */}
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6"
            >
                {/* What Happened */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        What Happened? <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        name="whatHappened"
                        value={formData.whatHappened}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Describe the incident in detail..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                        required
                    />
                </div>

                {/* Location & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" />
                            Location <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g., Ward 3, Room 201"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            When did it occur? <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            name="occurredAt"
                            value={formData.occurredAt}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            required
                        />
                    </div>
                </div>

                {/* Department (Read-only display) */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Building size={16} className="text-slate-400" />
                        Department
                    </label>
                    <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
                        {departmentId ? (
                            <span className="font-medium">{departmentName}</span>
                        ) : (
                            <span className="text-amber-600">⚠️ No department assigned to your account</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Incidents are automatically filed under your assigned department
                    </p>
                </div>

                {/* Was there harm? */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <label className="flex items-start gap-4 cursor-pointer">
                        <input
                            type="checkbox"
                            name="wasHarm"
                            checked={formData.wasHarm}
                            onChange={handleChange}
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <div>
                            <span className="font-bold text-slate-700">Did this incident result in harm?</span>
                            <p className="text-sm text-slate-500 mt-1">
                                Check this if any patient, staff, or visitor was harmed as a result of this incident.
                            </p>
                        </div>
                    </label>
                </div>

                {/* What Could Have Gone Wrong */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        What Could Have Gone Wrong? <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        name="whatCouldHaveGoneWrong"
                        value={formData.whatCouldHaveGoneWrong}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Describe potential consequences if not addressed..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                        required
                    />
                </div>

                {/* Submit Button */}
                <div className="pt-4 flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !departmentId}
                        className="flex-1 py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send size={18} />
                                Submit Report
                            </>
                        )}
                    </button>
                </div>
            </motion.form>
        </div>
    );
};

export default ReportIncident;
