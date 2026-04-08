import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList,
    Plus,
    Trash,
    Target,
    Activity,
    Calendar,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    X,
    Save
} from 'lucide-react';
import * as carePlanService from '../../services/careplan.service';

/**
 * CarePlanCreator Component
 * For doctors to create care plans during IPD admission
 */
const CarePlanCreator = ({ patient, admission, onSuccess, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);

    // Care Plan Form State
    const [carePlan, setCarePlan] = useState({
        title: '',
        diagnosis: '',
        category: 'general',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        goals: [],
        interventions: []
    });

    // New goal/intervention input state
    const [newGoal, setNewGoal] = useState({
        description: '',
        targetDate: '',
        priority: 'medium'
    });

    const [newIntervention, setNewIntervention] = useState({
        description: '',
        frequency: 'daily',
        instructions: ''
    });

    // Category options
    const categories = [
        { value: 'general', label: 'General Care' },
        { value: 'post_operative', label: 'Post-Operative' },
        { value: 'chronic_disease', label: 'Chronic Disease Management' },
        { value: 'wound_care', label: 'Wound Care' },
        { value: 'pain_management', label: 'Pain Management' },
        { value: 'mobility', label: 'Mobility & Rehabilitation' },
        { value: 'nutrition', label: 'Nutrition Support' },
        { value: 'respiratory', label: 'Respiratory Care' },
        { value: 'cardiac', label: 'Cardiac Care' },
        { value: 'diabetic', label: 'Diabetic Management' },
        { value: 'palliative', label: 'Palliative Care' },
        { value: 'mental_health', label: 'Mental Health' }
    ];

    // Frequency options
    const frequencies = [
        { value: 'hourly', label: 'Every Hour' },
        { value: 'q2h', label: 'Every 2 Hours' },
        { value: 'q4h', label: 'Every 4 Hours' },
        { value: 'q6h', label: 'Every 6 Hours' },
        { value: 'q8h', label: 'Every 8 Hours' },
        { value: 'q12h', label: 'Every 12 Hours' },
        { value: 'daily', label: 'Once Daily' },
        { value: 'prn', label: 'As Needed (PRN)' }
    ];

    // Priority options
    const priorities = [
        { value: 'low', label: 'Low', color: 'text-blue-600 bg-blue-100' },
        { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
        { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-100' },
        { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-100' }
    ];

    // Add goal
    const addGoal = () => {
        if (!newGoal.description.trim()) return;
        setCarePlan(prev => ({
            ...prev,
            goals: [...prev.goals, { ...newGoal, id: Date.now() }]
        }));
        setNewGoal({ description: '', targetDate: '', priority: 'medium' });
    };

    // Remove goal
    const removeGoal = (id) => {
        setCarePlan(prev => ({
            ...prev,
            goals: prev.goals.filter(g => g.id !== id)
        }));
    };

    // Add intervention
    const addIntervention = () => {
        if (!newIntervention.description.trim()) return;
        setCarePlan(prev => ({
            ...prev,
            interventions: [...prev.interventions, { ...newIntervention, id: Date.now() }]
        }));
        setNewIntervention({ description: '', frequency: 'daily', instructions: '' });
    };

    // Remove intervention
    const removeIntervention = (id) => {
        setCarePlan(prev => ({
            ...prev,
            interventions: prev.interventions.filter(i => i.id !== id)
        }));
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!carePlan.title.trim()) {
            alert('Please enter a care plan title');
            return;
        }
        if (carePlan.goals.length === 0) {
            alert('Please add at least one goal');
            return;
        }
        if (carePlan.interventions.length === 0) {
            alert('Please add at least one intervention');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                patientId: patient._id,
                admissionId: admission._id,
                title: carePlan.title,
                diagnosis: carePlan.diagnosis,
                category: carePlan.category,
                startDate: carePlan.startDate,
                endDate: carePlan.endDate || undefined,
                goals: carePlan.goals.map(({ id, ...g }) => g),
                interventions: carePlan.interventions.map(({ id, ...i }) => i)
            };

            await carePlanService.createCarePlan(payload);

            if (onSuccess) onSuccess();
            alert('Care Plan created successfully!');

            // Reset form
            setCarePlan({
                title: '',
                diagnosis: '',
                category: 'general',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                goals: [],
                interventions: []
            });

        } catch (error) {
            console.error('Error creating care plan:', error);
            alert('Failed to create care plan: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="bg-purple-50 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden"
        >
            {/* Watermark */}
            <div className="absolute top-4 right-4 text-purple-900/5 font-serif text-7xl leading-none select-none pointer-events-none">
                📋
            </div>

            {/* Header */}
            <div
                className="p-6 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <h3 className="font-bold text-purple-800 flex items-center gap-2 text-xl relative z-10">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600">
                        <ClipboardList size={20} />
                    </div>
                    Care Plan
                    {carePlan.goals.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-700 text-xs rounded-full">
                            {carePlan.goals.length} goals, {carePlan.interventions.length} interventions
                        </span>
                    )}
                </h3>
                {expanded ? (
                    <ChevronDown className="w-5 h-5 text-purple-400" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-purple-400" />
                )}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6"
                    >
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 block">
                                    Care Plan Title *
                                </label>
                                <input
                                    type="text"
                                    value={carePlan.title}
                                    onChange={(e) => setCarePlan(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g., Post-Appendectomy Care"
                                    className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 block">
                                    Category
                                </label>
                                <select
                                    value={carePlan.category}
                                    onChange={(e) => setCarePlan(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 block">
                                    Related Diagnosis
                                </label>
                                <input
                                    type="text"
                                    value={carePlan.diagnosis}
                                    onChange={(e) => setCarePlan(prev => ({ ...prev, diagnosis: e.target.value }))}
                                    placeholder="e.g., Acute Appendicitis, Post-Surgical Recovery"
                                    className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 block">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={carePlan.startDate}
                                    onChange={(e) => setCarePlan(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 block">
                                    Estimated End Date
                                </label>
                                <input
                                    type="date"
                                    value={carePlan.endDate}
                                    onChange={(e) => setCarePlan(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Goals Section */}
                        <div className="mb-6">
                            <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Goals *
                            </h4>

                            {/* Add Goal Input */}
                            <div className="bg-white p-4 rounded-xl border border-purple-100 mb-3">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-6">
                                        <label className="text-xs text-purple-500 mb-1 block">Goal Description</label>
                                        <input
                                            type="text"
                                            value={newGoal.description}
                                            onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="e.g., Patient ambulating independently"
                                            className="w-full px-3 py-2 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-xs text-purple-500 mb-1 block">Target Date</label>
                                        <input
                                            type="date"
                                            value={newGoal.targetDate}
                                            onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-purple-100 rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-purple-500 mb-1 block">Priority</label>
                                        <select
                                            value={newGoal.priority}
                                            onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value }))}
                                            className="w-full px-3 py-2 border border-purple-100 rounded-lg"
                                        >
                                            {priorities.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            onClick={addGoal}
                                            className="w-10 h-10 flex items-center justify-center bg-purple-500 text-white rounded-lg hover:bg-purple-600 shadow-sm"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Goals List */}
                            <div className="space-y-2">
                                {carePlan.goals.map((goal, idx) => (
                                    <motion.div
                                        key={goal.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">{goal.description}</div>
                                                <div className="text-xs text-gray-400">
                                                    {goal.targetDate && `Target: ${goal.targetDate}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorities.find(p => p.value === goal.priority)?.color || 'bg-gray-100'
                                                }`}>
                                                {goal.priority}
                                            </span>
                                            <button
                                                onClick={() => removeGoal(goal.id)}
                                                className="p-1 text-gray-300 hover:text-red-500"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                                {carePlan.goals.length === 0 && (
                                    <div className="text-center py-4 text-purple-400 text-sm">
                                        No goals added yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Interventions Section */}
                        <div className="mb-6">
                            <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Nursing Interventions *
                            </h4>

                            {/* Add Intervention Input */}
                            <div className="bg-white p-4 rounded-xl border border-purple-100 mb-3">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-5">
                                        <label className="text-xs text-purple-500 mb-1 block">Intervention</label>
                                        <input
                                            type="text"
                                            value={newIntervention.description}
                                            onChange={(e) => setNewIntervention(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="e.g., Turn patient every 2 hours"
                                            className="w-full px-3 py-2 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-purple-500 mb-1 block">Frequency</label>
                                        <select
                                            value={newIntervention.frequency}
                                            onChange={(e) => setNewIntervention(prev => ({ ...prev, frequency: e.target.value }))}
                                            className="w-full px-3 py-2 border border-purple-100 rounded-lg"
                                        >
                                            {frequencies.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="text-xs text-purple-500 mb-1 block">Instructions (optional)</label>
                                        <input
                                            type="text"
                                            value={newIntervention.instructions}
                                            onChange={(e) => setNewIntervention(prev => ({ ...prev, instructions: e.target.value }))}
                                            placeholder="Additional details..."
                                            className="w-full px-3 py-2 border border-purple-100 rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            onClick={addIntervention}
                                            className="w-10 h-10 flex items-center justify-center bg-purple-500 text-white rounded-lg hover:bg-purple-600 shadow-sm"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Interventions List */}
                            <div className="space-y-2">
                                {carePlan.interventions.map((intervention, idx) => (
                                    <motion.div
                                        key={intervention.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">{intervention.description}</div>
                                                {intervention.instructions && (
                                                    <div className="text-xs text-gray-400">{intervention.instructions}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                {frequencies.find(f => f.value === intervention.frequency)?.label || intervention.frequency}
                                            </span>
                                            <button
                                                onClick={() => removeIntervention(intervention.id)}
                                                className="p-1 text-gray-300 hover:text-red-500"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                                {carePlan.interventions.length === 0 && (
                                    <div className="text-center py-4 text-purple-400 text-sm">
                                        No interventions added yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Templates */}
                        <div className="mb-6 p-4 bg-white/50 rounded-xl border border-purple-100">
                            <h4 className="text-sm font-semibold text-purple-600 mb-3">Quick Templates</h4>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => {
                                        setCarePlan(prev => ({
                                            ...prev,
                                            title: 'Post-Operative Care',
                                            category: 'post_operative',
                                            goals: [
                                                { id: Date.now(), description: 'Pain level < 4 on scale', targetDate: '', priority: 'high' },
                                                { id: Date.now() + 1, description: 'Ambulating independently', targetDate: '', priority: 'medium' },
                                                { id: Date.now() + 2, description: 'Wound healing without infection', targetDate: '', priority: 'high' }
                                            ],
                                            interventions: [
                                                { id: Date.now(), description: 'Monitor vitals', frequency: 'q4h', instructions: 'BP, HR, Temp, SpO2' },
                                                { id: Date.now() + 1, description: 'Assess pain level', frequency: 'q4h', instructions: 'Use 0-10 pain scale' },
                                                { id: Date.now() + 2, description: 'Wound dressing check', frequency: 'daily', instructions: 'Check for signs of infection' },
                                                { id: Date.now() + 3, description: 'Encourage deep breathing', frequency: 'q4h', instructions: 'Incentive spirometry 10x' }
                                            ]
                                        }));
                                    }}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                                >
                                    🏥 Post-Op Care
                                </button>
                                <button
                                    onClick={() => {
                                        setCarePlan(prev => ({
                                            ...prev,
                                            title: 'Diabetic Management',
                                            category: 'diabetic',
                                            goals: [
                                                { id: Date.now(), description: 'Blood sugar within target range', targetDate: '', priority: 'high' },
                                                { id: Date.now() + 1, description: 'No hypoglycemic episodes', targetDate: '', priority: 'critical' }
                                            ],
                                            interventions: [
                                                { id: Date.now(), description: 'Blood glucose monitoring', frequency: 'q6h', instructions: 'Before meals & bedtime' },
                                                { id: Date.now() + 1, description: 'Insulin administration as ordered', frequency: 'q6h', instructions: 'Per sliding scale' },
                                                { id: Date.now() + 2, description: 'Foot care assessment', frequency: 'daily', instructions: 'Check for ulcers, color, pulses' }
                                            ]
                                        }));
                                    }}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                                >
                                    💉 Diabetic Care
                                </button>
                                <button
                                    onClick={() => {
                                        setCarePlan(prev => ({
                                            ...prev,
                                            title: 'Fall Prevention',
                                            category: 'mobility',
                                            goals: [
                                                { id: Date.now(), description: 'No fall incidents during admission', targetDate: '', priority: 'critical' }
                                            ],
                                            interventions: [
                                                { id: Date.now(), description: 'Keep bed in low position', frequency: 'daily', instructions: 'All side rails up at night' },
                                                { id: Date.now() + 1, description: 'Call light within reach', frequency: 'q4h', instructions: 'Verify patient can reach' },
                                                { id: Date.now() + 2, description: 'Assist with ambulation', frequency: 'prn', instructions: 'Use gait belt' }
                                            ]
                                        }));
                                    }}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                                >
                                    🚶 Fall Prevention
                                </button>
                                <button
                                    onClick={() => {
                                        setCarePlan(prev => ({
                                            ...prev,
                                            title: 'Pressure Ulcer Prevention',
                                            category: 'wound_care',
                                            goals: [
                                                { id: Date.now(), description: 'Skin integrity maintained', targetDate: '', priority: 'high' }
                                            ],
                                            interventions: [
                                                { id: Date.now(), description: 'Turn patient', frequency: 'q2h', instructions: 'Document position changes' },
                                                { id: Date.now() + 1, description: 'Skin assessment', frequency: 'q8h', instructions: 'Check pressure points' },
                                                { id: Date.now() + 2, description: 'Keep skin dry and clean', frequency: 'prn', instructions: 'Use barrier cream if needed' }
                                            ]
                                        }));
                                    }}
                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                                >
                                    🛏️ Pressure Ulcer Prevention
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3">
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 border border-purple-200 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={loading || carePlan.goals.length === 0 || carePlan.interventions.length === 0}
                                className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Create Care Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CarePlanCreator;
