import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getPatients, reset } from '../../features/patients/patientsSlice';
import AddPatientModal from '../../components/patients/AddPatientModal';
import { Search, Plus, Filter, MoreVertical, User, Calendar, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

const PatientsList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { patients, isLoading, isError, message } = useSelector((state) => state.patients);
    const { user } = useSelector((state) => state.auth);

    // Local state for basic search (could be moved to backend search API later)
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        dispatch(getPatients());

        return () => {
            dispatch(reset());
        }
    }, [dispatch]);

    const filteredPatients = patients ? patients.filter(p =>
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading patients...</div>
    }

    if (isError) {
        return <div className="p-8 text-center text-red-500">Error: {message}</div>
    }

    return (
        <div>
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
                    <p className="text-gray-500 text-sm">Manage patient records and demographics</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter size={18} /> Filter
                    </button>
                    {user?.role !== 'doctor' && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all active:scale-95"
                        >
                            <Plus size={18} /> Add Patient
                        </button>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-100 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                <th className="p-4">Patient ID</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Age / Gender</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Last Visit</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-50">
                            {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
                                <tr
                                    key={patient._id}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/dashboard/patients/${patient._id}`)}
                                >
                                    <td className="p-4 font-mono text-slate-500">{patient.patientId}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-xs">
                                                {patient.firstName[0]}{patient.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700">{patient.firstName} {patient.lastName}</div>
                                                <div className="text-xs text-gray-400">Blood: {patient.bloodGroup || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {patient.age ? `${patient.age} yrs` : 'N/A'} • <span className="capitalize">{patient.gender}</span>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-gray-400" />
                                            {patient.phone}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {/* Placeholder for last visit */}
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            Unknown
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="text-gray-400 hover:text-slate-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">
                                        No patients found. Add a new patient to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination (Visual only for now) */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <div>Showing {filteredPatients.length} entries</div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Prev</button>
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>

            {/* Add Patient Modal */}
            <AddPatientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </div>
    );
};

export default PatientsList;
