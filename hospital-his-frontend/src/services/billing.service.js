import axios from 'axios';

const API_URL = 'http://localhost:5001/api/v1/billing';

const getConfig = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.token}` } };
};

const generateBill = async (billData) => {
    const response = await axios.post(`${API_URL}/generate`, billData, getConfig());
    return response.data;
};

const getAllBills = async (params) => {
    // Pass params properly
    const config = getConfig();
    config.params = params;
    const response = await axios.get(`${API_URL}/bills`, config); // Fixed endpoint
    return response.data;
};

const getBillById = async (id) => {
    const response = await axios.get(`${API_URL}/bills/${id}`, getConfig()); // Fixed endpoint (added /bills/ if needed, but router says /bills/:id)
    return response.data;
};

const updateBill = async (id, updateData) => {
    const response = await axios.put(`${API_URL}/bills/${id}`, updateData, getConfig()); // Fixed endpoint
    return response.data;
};

const getPatientBills = async (patientId) => {
    const response = await axios.get(`${API_URL}/patient/${patientId}`, getConfig());
    return response.data;
};

const getPendingBills = async () => {
    const response = await axios.get(`${API_URL}/pending`, getConfig());
    return response.data;
};

const getDashboardStats = async () => {
    const response = await axios.get(`${API_URL}/dashboard`, getConfig());
    return response.data;
};

const cancelBill = async (id, reason) => {
    const response = await axios.post(`${API_URL}/bills/${id}/cancel`, { reason }, getConfig());
    return response.data;
};

// New methods implementation - DEFINE BEFORE EXPORT
const requestDiscount = async (billId, discountAmount, reason) => {
    const response = await axios.post(`${API_URL}/bills/${billId}/request-discount`,
        { discountAmount, reason }, getConfig());
    return response.data;
};

const approveDiscount = async (billId, isApproved, rejectionReason = null) => {
    const response = await axios.post(`${API_URL}/bills/${billId}/approve-discount`,
        { isApproved, rejectionReason }, getConfig());
    return response.data;
};

const finalizeBill = async (billId) => {
    const response = await axios.post(`${API_URL}/bills/${billId}/finalize`, {}, getConfig());
    return response.data;
};

const generateAutoCharge = async (type, referenceId) => {
    const response = await axios.post(`${API_URL}/auto-charge`,
        { type, referenceId }, getConfig());
    return response.data;
};

const getRevenueReport = async (startDate, endDate) => {
    const config = getConfig();
    config.params = { startDate, endDate };
    const response = await axios.get(`${API_URL}/reports/revenue`, config);
    return response.data;
};

const getBillAudit = async (billId) => {
    const response = await axios.get(`${API_URL}/bills/${billId}/audit`, getConfig());
    return response.data;
};

// Export object - NOW all functions are defined above
const billingService = {
    generateBill,
    getAllBills,
    getBillById,
    updateBill,
    getPatientBills,
    getPendingBills,
    getDashboardStats,
    cancelBill,
    requestDiscount,
    approveDiscount,
    finalizeBill,
    generateAutoCharge,
    getRevenueReport,
    getRevenueReport,
    getBillAudit,
    setPaymentResponsibility: async (billId, data) => {
        const response = await axios.post(`${API_URL}/bills/${billId}/responsibility`, data, getConfig());
        return response.data;
    },
    recordPayment: async (billId, paymentData) => {
        const response = await axios.post(`${API_URL}/bills/${billId}/pay`, paymentData, getConfig());
        return response.data;
    }
};

export default billingService;
