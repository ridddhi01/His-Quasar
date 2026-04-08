import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getQueue, resetOPD } from '../../features/opd/opdSlice';
import { motion } from 'framer-motion';
import { User, Clock, CheckCircle, Activity, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OPDQueue = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { queue, isLoading, isError, message } = useSelector((state) => state.opd);

    // Auto-refresh mechanism
    useEffect(() => {
        dispatch(getQueue());
        const interval = setInterval(() => {
            dispatch(getQueue());
        }, 30000); // Poll every 30s

        return () => {
            clearInterval(interval);
            dispatch(resetOPD());
        }
    }, [dispatch]);

    const handleConsultationStart = (appointmentId) => {
        navigate(`/dashboard/consultation/${appointmentId}`);
    };

    if (isLoading && (!queue || queue.length === 0)) {
        return <div className="p-12 text-center text-gray-500">Loading queue...</div>
    }

    if (isError) {
        return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg m-4">Error loading queue: {message}</div>
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-primary" /> OPD Live Queue
                    </h1>
                    <p className="text-gray-500 text-sm">Real-time patient waiting list</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-medium text-slate-600 border border-gray-100">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="space-y-4">
                {queue && queue.length > 0 ? queue.map((appointment, index) => (
                    <motion.div
                        key={appointment._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative p-6 rounded-2xl border transition-all ${index === 0
                                ? 'bg-white border-primary shadow-lg shadow-primary/10 scale-[1.02]' // Active Patient
                                : 'bg-white border-gray-100 shadow-sm opacity-80 hover:opacity-100 hover:shadow-md'
                            }`}
                    >
                        {index === 0 && (
                            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                Current Patient
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                {/* Token Number */}
                                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl font-bold border-2 ${index === 0 ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-100'
                                    }`}>
                                    <span className="text-xs uppercase opacity-70">Token</span>
                                    <span className="text-3xl">{appointment.tokenNumber || index + 1}</span>
                                </div>

                                {/* Patient Info */}
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{appointment.patient.firstName} {appointment.patient.lastName}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><User size={14} /> {appointment.patient.patientId}</span>
                                        <span className="flex items-center gap-1"><Clock size={14} /> {new Date(appointment.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="mt-2 inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md font-medium capitalize">
                                        {appointment.status.replace('_', ' ')}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleConsultationStart(appointment._id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${index === 0
                                        ? 'bg-primary text-white hover:bg-primary-dark shadow-md'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {index === 0 ? 'Start Consultation' : 'View Details'}
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </motion.div>
                )) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <CheckCircle size={64} className="mx-auto text-green-100 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">All Cleared!</h3>
                        <p className="text-gray-400">No patients waiting in queue.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OPDQueue;
