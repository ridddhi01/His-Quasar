import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/patients/';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.token) {
        return {
            headers: { Authorization: `Bearer ${user.token}` }
        };
    }
    return {};
};

// Get all patients
const getPatients = async () => {
    const response = await axios.get(API_URL, getConfig());
    return response.data.data;
};

// Create new patient
const createPatient = async (patientData) => {
    const response = await axios.post(API_URL, patientData, getConfig());
    return response.data.data;
};

// Search patients
const searchPatients = async (query) => {
    const response = await axios.get(`${API_URL}search?query=${query}`, getConfig());
    return response.data;
};

// Get single patient
const getPatient = async (id) => {
    const response = await axios.get(API_URL + id, getConfig());
    return response.data.data;
};

// Get patient history (Timeline)
const getPatientHistory = async (id) => {
    const response = await axios.get(API_URL + id + '/history', getConfig());
    return response.data.data;
};

// Get patient lab results
const getPatientLabResults = async (patientId) => {
    const response = await axios.get(`http://localhost:5001/api/v1/lab/orders?patient=${patientId}`, getConfig());
    return response.data.data;
};

const patientsService = {
    getPatients,
    createPatient,
    searchPatients,
    getPatient,
    getPatientHistory,
    getPatientLabResults
};

export default patientsService;
