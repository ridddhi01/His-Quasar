import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import analyticsReducer from '../features/analytics/analyticsSlice';
import patientsReducer from '../features/patients/patientsSlice';
import opdReducer from '../features/opd/opdSlice';
import emergencyReducer from '../features/emergency/emergencySlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        analytics: analyticsReducer,
        patients: patientsReducer,
        opd: opdReducer,
        emergency: emergencyReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});
