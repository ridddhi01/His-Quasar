import axios from 'axios';

const API_RES_URL = 'http://localhost:5001/api/v1/';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.token) {
        return {
            headers: { Authorization: `Bearer ${user.token}` }
        };
    }
    return {};
};

// --- Appointments (OPD) ---

const getAppointments = async () => {
    const response = await axios.get(API_RES_URL + 'opd/appointments', getConfig());
    return response.data.data;
};

const createAppointment = async (appointmentData) => {
    const response = await axios.post(API_RES_URL + 'opd/appointments', appointmentData, getConfig());
    return response.data.data;
};

// --- Departments & Doctors ---

const getDepartments = async () => {
    const response = await axios.get(API_RES_URL + 'departments', getConfig());
    return response.data.data;
};

const getDoctorsByDepartment = async (deptId) => {
    const response = await axios.get(API_RES_URL + `departments/${deptId}/doctors`, getConfig());
    return response.data.data;
};

const getQueue = async () => {
    // Get current user to filter queue
    const user = JSON.parse(localStorage.getItem('user'));
    let url = API_RES_URL + 'opd/queue';

    // If doctor, filter by their ID
    if (user && user.role === 'doctor') {
        url += `?doctor=${user.id}`;
    }

    const response = await axios.get(url, getConfig());
    return response.data.data;
};

const opdService = {
    getAppointments,
    createAppointment,
    getDepartments,
    getDoctorsByDepartment,
    getQueue
};

export default opdService;
