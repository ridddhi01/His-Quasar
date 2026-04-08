import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, Calendar, User, Stethoscope } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { createAppointment, getDepartments, getDoctorsByDepartment, clearDoctors } from '../../features/opd/opdSlice';
import { getPatients } from '../../features/patients/patientsSlice';

const BookAppointmentModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const [step, setStep] = useState('form');

    // Selectors
    const { departments, doctors } = useSelector((state) => state.opd);
    const { patients } = useSelector((state) => state.patients);

    // Form State
    const [formData, setFormData] = useState({
        patient: '', // Patient ID (Mongo Object ID)
        department: '',
        doctor: '',
        scheduledDate: '',
        reason: '',
        type: 'General',
        priority: 'Normal'
    });

    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientResults, setShowPatientResults] = useState(false);

    useEffect(() => {
        if (isOpen) {
            dispatch(getDepartments());
            dispatch(getPatients()); // Ideally this should be a search API, but for small scale this works
        }
    }, [isOpen, dispatch]);

    // Fetch doctors when department changes
    useEffect(() => {
        if (formData.department) {
            dispatch(getDoctorsByDepartment(formData.department));
        } else {
            dispatch(clearDoctors());
        }
    }, [formData.department, dispatch]);

    const handlePatientSelect = (patient) => {
        setFormData(prev => ({ ...prev, patient: patient._id }));
        setPatientSearch(`${patient.firstName} ${patient.lastName} (${patient.patientId})`);
        setShowPatientResults(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.patient) return alert('Please select a patient from the search');

        try {
            await dispatch(createAppointment(formData)).unwrap();
            setStep('success');
            setTimeout(() => {
                setStep('form');
                setFormData({
                    patient: '', department: '', doctor: '',
                    scheduledDate: '', reason: '', type: 'General', priority: 'Normal'
                });
                setPatientSearch('');
                onClose();
            }, 2500);
        } catch (error) {
            console.error(error);
            alert('Failed to book appointment: ' + error);
        }
    };

    // Filter local patients for autocomplete
    const filteredPatients = patients ? patients.filter(p =>
        (p.firstName + ' ' + p.lastName).toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.patientId.toLowerCase().includes(patientSearch.toLowerCase())
    ) : [];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden z-20"
                >
                    {step === 'form' ? (
                        <>
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-slate-800">Book New Appointment</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-gray-500">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Patient Search */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={patientSearch}
                                            onChange={(e) => {
                                                setPatientSearch(e.target.value);
                                                setShowPatientResults(true);
                                            }}
                                            onFocus={() => setShowPatientResults(true)}
                                            placeholder="Search by name or ID..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    </div>

                                    {/* Autocomplete Dropdown */}
                                    {showPatientResults && patientSearch && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-lg rounded-lg max-h-48 overflow-y-auto z-30">
                                            {filteredPatients.length > 0 ? filteredPatients.map(p => (
                                                <div
                                                    key={p._id}
                                                    onClick={() => handlePatientSelect(p)}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="font-medium text-slate-700">{p.firstName} {p.lastName}</div>
                                                    <div className="text-xs text-gray-500">{p.patientId} • {p.phone}</div>
                                                </div>
                                            )) : (
                                                <div className="p-3 text-sm text-gray-400">No patients found</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                        <select
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            required
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => (
                                                <option key={d._id} value={d._id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Doctor</label>
                                        <select
                                            name="doctor"
                                            value={formData.doctor}
                                            onChange={handleChange}
                                            required
                                            disabled={!formData.department}
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                                        >
                                            <option value="">Select Doctor</option>
                                            {doctors.map(d => (
                                                <option key={d._id} value={d._id}>{d.profile?.firstName} {d.profile?.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            name="scheduledDate"
                                            value={formData.scheduledDate}
                                            onChange={handleChange}
                                            required
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                        <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                                            <option value="General">General Consultation</option>
                                            <option value="Emergency">Emergency</option>
                                            <option value="Follow-up">Follow-up</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
                                    <textarea
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                        placeholder="E.g., High fever since last night..."
                                    ></textarea>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={!formData.patient || !formData.doctor}
                                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirm Booking
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-96">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6"
                            >
                                <Check size={48} strokeWidth={3} />
                            </motion.div>
                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-bold text-slate-800"
                            >
                                Appointment Booked!
                            </motion.h3>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-500 mt-2"
                            >
                                Your appointment has been scheduled successfully.
                            </motion.p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BookAppointmentModal;
