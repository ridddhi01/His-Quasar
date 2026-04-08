import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAppointments, resetOPD } from '../../features/opd/opdSlice';
import BookAppointmentModal from '../../components/opd/BookAppointmentModal';
import { Search, Plus, Filter, Calendar, User, Clock, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

const AppointmentsList = () => {
    const dispatch = useDispatch();
    const { appointments, isLoading, isError, message } = useSelector((state) => state.opd);

    // Local state
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // all, upcoming, completed

    useEffect(() => {
        dispatch(getAppointments());

        return () => {
            dispatch(resetOPD());
        }
    }, [dispatch]);

    // Derived state for filtering
    const filteredAppointments = appointments ? appointments.filter(app => {
        if (filter === 'upcoming') return ['scheduled', 'rescheduled'].includes(app.status);
        if (filter === 'completed') return app.status === 'completed';
        return true;
    }) : [];

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading appointments...</div>;
    if (isError) return <div className="p-8 text-center text-red-500">Error: {message}</div>;

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-600';
            case 'completed': return 'bg-green-100 text-green-600';
            case 'cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
                    <p className="text-gray-500 text-sm">Manage OPD schedule and patient visits</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                        {['all', 'upcoming', 'completed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsBookModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all active:scale-95"
                    >
                        <Plus size={18} /> New Appointment
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {filteredAppointments.length > 0 ? filteredAppointments.map((app) => (
                    <div key={app._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                <span className="text-xs font-bold uppercase">{new Date(app.scheduledDate).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-xl font-bold">{new Date(app.scheduledDate).getDate()}</span>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    {app.patient?.fullName}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(app.status)} uppercase tracking-wider`}>
                                        {app.status}
                                    </span>
                                </h3>
                                <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {new Date(app.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center gap-1"><Stethoscope size={14} /> Dr. {app.doctor?.profile?.firstName} {app.doctor?.profile?.lastName}</span>
                                    <span className="flex items-center gap-1 text-slate-400">({app.department?.name})</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                            <div className="text-sm text-gray-500 text-right mr-4 hidden md:block">
                                <div className="font-medium text-slate-700">{app.reason}</div>
                                <div className="text-xs">Reason for Visit</div>
                            </div>
                            <button className="flex-1 md:flex-none px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Reschedule</button>
                            <button className="flex-1 md:flex-none px-4 py-2 border border-blue-100 bg-blue-50 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-100">Check In</button>
                        </div>
                    </div>
                )) : (
                    <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No appointments found in this category.</p>
                    </div>
                )}
            </div>

            <BookAppointmentModal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} />
        </div>
    );
};

export default AppointmentsList;
