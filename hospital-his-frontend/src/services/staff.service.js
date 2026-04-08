import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/staff';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const staffService = {
    getAllStaff: async (params) => {
        const config = getConfig();
        config.params = params;
        const response = await axios.get(API_URL, config);
        return response.data;
    },

    getDoctors: async () => {
        const response = await axios.get(`${API_URL}/doctors`, getConfig());
        return response.data;
    },

    getStaffById: async (id) => {
        const response = await axios.get(`${API_URL}/${id}`, getConfig());
        return response.data;
    }
};

export default staffService;
