import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCaseStatus, updateCaseVitals } from '../../features/emergency/emergencySlice';
import NurseTriagePanel from './NurseTriagePanel';
import DoctorEmergencyConsole from './DoctorEmergencyConsole';

const STATUS_OPTIONS = [
    { value: 'in-treatment', label: 'Start Treatment', color: 'bg-blue-600', description: 'Begin treating the patient' },
    { value: 'observation', label: 'Under Observation', color: 'bg-purple-600', description: 'Patient needs monitoring' },
    { value: 'admitted', label: 'Admit to IPD', color: 'bg-indigo-600', description: 'Transfer to inpatient department' },
    { value: 'discharged', label: 'Discharge', color: 'bg-green-600', description: 'Patient is ready to leave' },
    { value: 'transferred', label: 'Transfer Out', color: 'bg-yellow-600', description: 'Transfer to another facility' },
];

const EmergencyTreatment = ({ emergencyCase, onClose, onRefresh }) => {
    const dispatch = useDispatch();
    const { isLoading, isDowntime } = useSelector((state) => state.emergency);
    const { user } = useSelector((state) => state.auth);

    const userRole = user?.role?.toLowerCase();

    // Default tab depends on role
    const [activeTab, setActiveTab] = useState(
        userRole === 'doctor' ? 'console' :
            userRole === 'nurse' ? 'nursing' :
                'status'
    );

    const handleVitalsSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const vitals = {
            bloodPressure: formData.get('bloodPressure'),
            pulse: formData.get('pulse'),
            temperature: formData.get('temperature'),
            oxygenSaturation: formData.get('oxygenSaturation'),
        };

        const result = await dispatch(updateCaseVitals({
            id: emergencyCase._id,
            vitals,
        }));

        if (updateCaseVitals.fulfilled.match(result)) {
            alert("Vitals updated successfully");
            if (onRefresh) onRefresh();
        }
    };

    const getPatientName = () => {
        const patient = emergencyCase.patient;
        if (!patient) return 'Unknown Patient';
        return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Emergency Treatment</h2>
                        <p className="text-green-200">{getPatientName()} — {emergencyCase.triageLevel?.toUpperCase()}</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-green-200 text-2xl">&times;</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b mb-4">
                        {userRole === 'doctor' && (
                            <button
                                className={`px-4 py-2 font-medium ${activeTab === 'console' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('console')}
                            >
                                Doctor Console
                            </button>
                        )}
                        {(userRole === 'nurse' || userRole === 'admin') && (
                            <button
                                className={`px-4 py-2 font-medium ${activeTab === 'nursing' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('nursing')}
                            >
                                Nursing Station
                            </button>
                        )}
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'vitals' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('vitals')}
                        >
                            Vitals Monitor
                        </button>
                    </div>

                    {isDowntime && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-yellow-800 text-sm">⚠️ Offline Mode: Changes will be queued for sync.</p>
                        </div>
                    )}

                    {/* Patient Complaint Header */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm flex justify-between items-center">
                        <div>
                            <span className="font-semibold text-gray-700">Chief Complaint:</span> {emergencyCase.chiefComplaint}
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Admission Time:</span> {new Date(emergencyCase.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* DOCTOR CONSOLE TAB */}
                    {activeTab === 'console' && (
                        <DoctorEmergencyConsole
                            emergencyCase={emergencyCase}
                            onUpdate={onRefresh}
                        />
                    )}

                    {/* NURSING STATION TAB */}
                    {activeTab === 'nursing' && (
                        <NurseTriagePanel
                            emergencyCase={emergencyCase}
                            onUpdate={onRefresh}
                        />
                    )}

                    {/* VITALS TAB (Shared) */}
                    {activeTab === 'vitals' && (
                        <div className="bg-white p-4 border rounded-lg">
                            <h3 className="text-lg font-medium text-gray-800 mb-4">Vitals Monitor</h3>
                            <form onSubmit={handleVitalsSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">BP (mmHg)</label>
                                        <input type="text" name="bloodPressure" defaultValue={emergencyCase.vitals?.bloodPressure} className="w-full border rounded p-2 text-sm" placeholder="120/80" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Pulse (bpm)</label>
                                        <input type="number" name="pulse" defaultValue={emergencyCase.vitals?.pulse} className="w-full border rounded p-2 text-sm" placeholder="72" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Temp (°F)</label>
                                        <input type="number" step="0.1" name="temperature" defaultValue={emergencyCase.vitals?.temperature} className="w-full border rounded p-2 text-sm" placeholder="98.6" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">SPO2 (%)</label>
                                        <input type="number" name="oxygenSaturation" defaultValue={emergencyCase.vitals?.oxygenSaturation} className="w-full border rounded p-2 text-sm" placeholder="98" />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">Update Vitals</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmergencyTreatment;
