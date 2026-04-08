import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import opdService from '../../services/opd.service';

const initialState = {
    appointments: [],
    departments: [],
    doctors: [],
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Get all appointments
export const getAppointments = createAsyncThunk(
    'opd/getAppointments',
    async (_, thunkAPI) => {
        try {
            return await opdService.getAppointments();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create appointment
export const createAppointment = createAsyncThunk(
    'opd/createAppointment',
    async (appointmentData, thunkAPI) => {
        try {
            return await opdService.createAppointment(appointmentData);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Departments
export const getDepartments = createAsyncThunk(
    'opd/getDepartments',
    async (_, thunkAPI) => {
        try {
            return await opdService.getDepartments();
        } catch (error) {
            return thunkAPI.rejectWithValue(error.toString());
        }
    }
);

// Get Doctors by Dept
export const getDoctorsByDepartment = createAsyncThunk(
    'opd/getDoctorsByDepartment',
    async (deptId, thunkAPI) => {
        try {
            return await opdService.getDoctorsByDepartment(deptId);
        } catch (error) {
            return thunkAPI.rejectWithValue(error.toString());
        }
    }
);

// Get OPD Queue
export const getQueue = createAsyncThunk(
    'opd/getQueue',
    async (_, thunkAPI) => {
        try {
            return await opdService.getQueue();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const opdSlice = createSlice({
    name: 'opd',
    initialState: {
        ...initialState,
        queue: []
    },
    reducers: {
        resetOPD: (state) => {
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = false;
            state.message = '';
        },
        clearDoctors: (state) => {
            state.doctors = [];
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getQueue.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getQueue.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.queue = action.payload;
            })
            .addCase(getQueue.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(getAppointments.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAppointments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.appointments = action.payload;
            })
            .addCase(getAppointments.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(createAppointment.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createAppointment.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.appointments.unshift(action.payload); // Add to top
            })
            .addCase(createAppointment.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(getDepartments.fulfilled, (state, action) => {
                state.departments = action.payload;
            })
            .addCase(getDoctorsByDepartment.fulfilled, (state, action) => {
                state.doctors = action.payload;
            });
    },
});

export const { resetOPD, clearDoctors } = opdSlice.actions;
export default opdSlice.reducer;
