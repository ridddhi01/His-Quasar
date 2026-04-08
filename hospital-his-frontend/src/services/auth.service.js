import axios from 'axios';

// Align with your backend server URL
const API_URL = 'http://localhost:5001/api/v1/auth/';

// Login user
const login = async (userData) => {
    const response = await axios.post(API_URL + 'login', userData);

    if (response.data) {
        // Backend returns: { success, accessToken, refreshToken, user: { ... } }
        // We flatten this for the frontend to: { ...user, token: accessToken }
        const { accessToken, user } = response.data;
        const userPayload = { ...user, token: accessToken };

        localStorage.setItem('user', JSON.stringify(userPayload));
        return userPayload;
    }

    return response.data;
};

// Logout user
const logout = () => {
    localStorage.removeItem('user');
};

const authService = {
    login,
    logout,
};

export default authService;
