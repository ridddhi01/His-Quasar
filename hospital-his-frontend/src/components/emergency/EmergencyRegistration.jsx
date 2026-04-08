import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createEmergencyCase } from '../../features/emergency/emergencySlice';
import patientsService from '../../services/patients.service';

const EmergencyRegistration = ({ onClose }) => {
    const dispatch = useDispatch();
    const { isLoading, isDowntime } = useSelector((state) => state.emergency);

    const [registrationMode, setRegistrationMode] = useState('new'); // 'new' or 'existing'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        age: '',
        dateOfBirth: '',
        gender: '',
        contactNumber: '',
        chiefComplaint: '',
        triageLevel: 'non-urgent',

        // Vitals
        vitals: {
            bloodPressure: '',
            pulse: '',
            temperature: '',
            respiratoryRate: '',
            oxygenSaturation: '',
        }
    });

    const [errors, setErrors] = useState({});

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 0 && registrationMode === 'existing') {
                try {
                    const response = await patientsService.searchPatients(searchQuery);
                    setSearchResults(response.data || []);
                } catch (error) {
                    console.error("Search failed", error);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, registrationMode]);

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setFormData(prev => ({
            ...prev,
            firstName: patient.firstName,
            lastName: patient.lastName,
            age: calculateAge(patient.dateOfBirth),
            dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
            gender: patient.gender ? patient.gender.toLowerCase() : '',
            contactNumber: patient.phone || '',
        }));
        setSearchResults([]); // Hide results
    };

    const calculateAge = (dob) => {
        if (!dob) return '';
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age.toString();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('vitals.')) {
            const vitalField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                vitals: {
                    ...prev.vitals,
                    [vitalField]: value
                }
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (registrationMode === 'new') {
            if (!formData.firstName.trim()) newErrors.firstName = 'First Name is required';
            if (!formData.lastName.trim()) newErrors.lastName = 'Last Name is required';
            if (!formData.gender) newErrors.gender = 'Gender is required';
            // Age or DOB validation
            if (!formData.age && !formData.dateOfBirth) {
                newErrors.age = 'Age or Date of Birth is required';
            }
        } else if (!selectedPatient) {
            newErrors.search = 'Please select a patient';
        }

        if (!formData.chiefComplaint.trim()) newErrors.chiefComplaint = 'Chief Complaint is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        // Create the case object
        const caseData = {
            patient: registrationMode === 'existing' ? selectedPatient._id : {
                firstName: formData.firstName,
                lastName: formData.lastName,
                age: formData.age,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                contactNumber: formData.contactNumber,
            },
            chiefComplaint: formData.chiefComplaint,
            triageLevel: formData.triageLevel,
            status: 'registered',
            arrivalTime: new Date().toISOString(),
            vitals: {
                ...formData.vitals
            }
        };

        const resultAction = await dispatch(createEmergencyCase(caseData));

        if (createEmergencyCase.fulfilled.match(resultAction)) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-fadeIn">
                {/* Header - Fixed */}
                <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">New Emergency Registration</h2>
                        <p className="text-red-100 text-sm">Register a new patient to the ER</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-red-100 text-xl font-bold">
                        ✕
                    </button>
                </div>

                {/* Content - Scrollable Form */}
                <form id="emergency-registration-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {/* Mode Selection */}
                    <div className="flex gap-4 mb-6 border-b pb-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="mode"
                                value="existing"
                                checked={registrationMode === 'existing'}
                                onChange={() => setRegistrationMode('existing')}
                                className="text-red-600 focus:ring-red-500"
                            />
                            <span className="font-semibold text-gray-700">Existing Patient</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="mode"
                                value="new"
                                checked={registrationMode === 'new'}
                                onChange={() => {
                                    setRegistrationMode('new');
                                    setSelectedPatient(null);
                                    setFormData(prev => ({ ...prev, firstName: '', lastName: '', age: '', dateOfBirth: '', gender: '', contactNumber: '' }));
                                }}
                                className="text-red-600 focus:ring-red-500"
                            />
                            <span className="font-semibold text-gray-700">New Patient</span>
                        </label>
                    </div>

                    {isDowntime && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                            <p className="text-yellow-800 text-sm flex items-center gap-2">
                                ⚠️ <strong>Offline Mode Active:</strong> This case will be saved locally and synced when connection is restored.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                        {/* Search for Existing Patient */}
                        {registrationMode === 'existing' && (
                            <div className="col-span-2 relative z-10">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search Patient (Name / UHID / Phone)</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 max-w-md"
                                    placeholder="Type at least 1 character..."
                                    autoFocus
                                />
                                {errors.search && <p className="text-red-500 text-xs mt-1">{errors.search}</p>}

                                {/* Typeahead Results */}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-2xl mt-1 max-h-60 overflow-y-auto">
                                        {searchResults.map(patient => (
                                            <div
                                                key={patient._id}
                                                onClick={() => handleSelectPatient(patient)}
                                                className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 transition-colors"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-gray-800">{patient.firstName} {patient.lastName}</span>
                                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{patient.patientId}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                                                    <span>📞 {patient.phone}</span>
                                                    <span>🎂 {patient.dateOfBirth?.split('T')[0]}</span>
                                                    <span className="capitalize">👤 {patient.gender}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedPatient && (
                                    <div className="mt-2 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2 text-green-800 text-sm">
                                        <span>✅ Selected: <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong></span>
                                        <button type="button" onClick={() => setSelectedPatient(null)} className="text-green-600 hover:underline text-xs">Change</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Personal Information (ReadOnly if Existing) */}
                        <div className="col-span-2">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Patient Details</h3>
                        </div>

                        {/* First Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                disabled={registrationMode === 'existing'}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.firstName ? 'border-red-500' : 'border-gray-300'} ${registrationMode === 'existing' ? 'bg-gray-100' : ''}`}
                                placeholder="John"
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                disabled={registrationMode === 'existing'}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.lastName ? 'border-red-500' : 'border-gray-300'} ${registrationMode === 'existing' ? 'bg-gray-100' : ''}`}
                                placeholder="Doe"
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                        </div>

                        {/* Age */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                disabled={registrationMode === 'existing'}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.age ? 'border-red-500' : 'border-gray-300'} ${registrationMode === 'existing' ? 'bg-gray-100' : ''}`}
                                placeholder="e.g. 35"
                            />
                            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                        </div>

                        {/* Date of Birth */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                disabled={registrationMode === 'existing'}
                                className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${registrationMode === 'existing' ? 'bg-gray-100' : ''}`}
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                disabled={registrationMode === 'existing'}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.gender ? 'border-red-500' : 'border-gray-300'} ${registrationMode === 'existing' ? 'bg-gray-100' : ''}`}
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                        </div>

                        {/* Contact Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                            <input
                                type="tel"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                disabled={registrationMode === 'existing'}
                                className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${registrationMode === 'existing' ? 'bg-gray-100' : ''}`}
                                placeholder="+91 9876543210"
                            />
                        </div>

                        {/* Case Details */}
                        <div className="col-span-2 mt-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Case Details</h3>
                        </div>

                        {/* Chief Complaint */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint *</label>
                            <textarea
                                name="chiefComplaint"
                                value={formData.chiefComplaint}
                                onChange={handleChange}
                                rows={2}
                                className={`w-full border rounded-lg px-3 py-2 ${errors.chiefComplaint ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Describe the main reason for emergency visit..."
                            />
                            {errors.chiefComplaint && <p className="text-red-500 text-xs mt-1">{errors.chiefComplaint}</p>}
                        </div>

                        {/* Vitals */}
                        <div className="col-span-2 mt-2">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Initial Vitals (Optional)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <input type="text" name="vitals.bloodPressure" placeholder="BP (120/80)" value={formData.vitals.bloodPressure} onChange={handleChange} className="border rounded px-2 py-1 text-sm" />
                                <input type="number" name="vitals.pulse" placeholder="Pulse (bpm)" value={formData.vitals.pulse} onChange={handleChange} className="border rounded px-2 py-1 text-sm" />
                                <input type="number" name="vitals.temperature" placeholder="Temp (°F)" value={formData.vitals.temperature} onChange={handleChange} className="border rounded px-2 py-1 text-sm" />
                                <input type="number" name="vitals.respiratoryRate" placeholder="RR (breaths/min)" value={formData.vitals.respiratoryRate} onChange={handleChange} className="border rounded px-2 py-1 text-sm" />
                                <input type="number" name="vitals.oxygenSaturation" placeholder="SPO2 (%)" value={formData.vitals.oxygenSaturation} onChange={handleChange} className="border rounded px-2 py-1 text-sm" />
                            </div>
                        </div>

                        {/* Initial Triage Level */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Triage Level</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    {
                                        value: 'critical',
                                        label: 'Critical',
                                        activeClass: 'bg-red-600 text-white border-red-600 shadow-md transform scale-105',
                                        inactiveClass: 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                                    },
                                    {
                                        value: 'urgent',
                                        label: 'Urgent',
                                        activeClass: 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-105',
                                        inactiveClass: 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300'
                                    },
                                    {
                                        value: 'less-urgent',
                                        label: 'Less Urgent',
                                        activeClass: 'bg-yellow-400 text-gray-900 border-yellow-400 shadow-md transform scale-105',
                                        inactiveClass: 'bg-white border-yellow-200 text-yellow-600 hover:bg-yellow-50 hover:border-yellow-300'
                                    },
                                    {
                                        value: 'non-urgent',
                                        label: 'Non-Urgent',
                                        activeClass: 'bg-green-500 text-white border-green-500 shadow-md transform scale-105',
                                        inactiveClass: 'bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300'
                                    },
                                ].map((level) => (
                                    <label
                                        key={level.value}
                                        className={`
                                            cursor-pointer border-2 rounded-lg p-3 text-center transition-all duration-200 ease-in-out
                                            ${formData.triageLevel === level.value ? level.activeClass : level.inactiveClass}
                                        `}
                                    >
                                        <input
                                            type="radio"
                                            name="triageLevel"
                                            value={level.value}
                                            checked={formData.triageLevel === level.value}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <span className="font-bold block tracking-wide">{level.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                </form>

                {/* Footer - Fixed Key Actions */}
                <div className="border-t p-4 bg-gray-50 rounded-b-lg flex justify-between items-center flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="emergency-registration-form"
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold tracking-wide transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md transform active:scale-95"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Registering...
                            </>
                        ) : (
                            <>
                                <span>➕</span> Register Patient
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmergencyRegistration;
