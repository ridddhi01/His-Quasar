import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import patientsService from '../../services/patients.service';

const initialState = {
    patients: [],
    currentPatient: null,
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Get all patients
export const getPatients = createAsyncThunk(
    'patients/getAll',
    async (_, thunkAPI) => {
        try {
            return await patientsService.getPatients();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create patient
export const createPatient = createAsyncThunk(
    'patients/create',
    async (patientData, thunkAPI) => {
        try {
            return await patientsService.createPatient(patientData);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const patientsSlice = createSlice({
    name: 'patients',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPatients.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getPatients.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.patients = action.payload; // Array of patients
            })
            .addCase(getPatients.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(createPatient.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createPatient.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.patients.push(action.payload); // Add new patient to list
            })
            .addCase(createPatient.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { reset } = patientsSlice.actions;
export default patientsSlice.reducer;
