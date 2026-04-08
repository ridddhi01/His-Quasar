import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCaseTriage } from '../../features/emergency/emergencySlice';

const TRIAGE_LEVELS = [
    { value: 'critical', label: 'Critical', color: 'bg-red-600', description: 'Life-threatening, immediate attention required' },
    { value: 'urgent', label: 'Urgent', color: 'bg-orange-500', description: 'Serious condition, needs prompt attention' },
    { value: 'less-urgent', label: 'Less Urgent', color: 'bg-yellow-400', description: 'Needs attention but can wait' },
    { value: 'non-urgent', label: 'Non-Urgent', color: 'bg-green-500', description: 'Minor issue, can wait safely' },
];

const EmergencyTriage = ({ emergencyCase, onClose }) => {
    const dispatch = useDispatch();
    const { isLoading, isDowntime } = useSelector((state) => state.emergency);

    const [selectedTriage, setSelectedTriage] = useState(emergencyCase.triageLevel);
    const [reason, setReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        await dispatch(updateCaseTriage({
            id: emergencyCase._id,
            triageLevel: selectedTriage,
            reason,
        }));

        onClose();
    };

    const getPatientName = () => {
        const patient = emergencyCase.patient;
        if (!patient) return 'Unknown Patient';
        return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                {/* Header */}
                <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
                    <h2 className="text-xl font-bold">Update Triage Level</h2>
                    <p className="text-blue-200">{getPatientName()}</p>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {isDowntime && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ Offline Mode: Changes will be queued for sync.
                            </p>
                        </div>
                    )}

                    {/* Current Triage */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Triage
                        </label>
                        <span className={`px-3 py-1 rounded-full text-white text-sm ${TRIAGE_LEVELS.find(t => t.value === emergencyCase.triageLevel)?.color || 'bg-gray-500'
                            }`}>
                            {TRIAGE_LEVELS.find(t => t.value === emergencyCase.triageLevel)?.label || emergencyCase.triageLevel}
                        </span>
                    </div>

                    {/* Triage Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Triage Level *
                        </label>
                        <div className="space-y-2">
                            {TRIAGE_LEVELS.map((level) => (
                                <label
                                    key={level.value}
                                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedTriage === level.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="triage"
                                        value={level.value}
                                        checked={selectedTriage === level.value}
                                        onChange={(e) => setSelectedTriage(e.target.value)}
                                        className="sr-only"
                                    />
                                    <span className={`w-4 h-4 rounded-full ${level.color} mr-3`}></span>
                                    <div>
                                        <span className="font-medium text-gray-900">{level.label}</span>
                                        <p className="text-xs text-gray-500">{level.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Change
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Optional: Describe reason for triage change..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || selectedTriage === emergencyCase.triageLevel}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Update Triage'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmergencyTriage;
