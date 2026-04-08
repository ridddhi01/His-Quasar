import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import analyticsService from '../../services/analytics.service';

const initialState = {
    data: null, // Generic holder for dashboard stats
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Fetch Executive Stats (Admin)
export const getExecutiveStats = createAsyncThunk(
    'analytics/getExecutive',
    async (_, thunkAPI) => {
        try {
            return await analyticsService.getExecutiveStats();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Fetch Clinical Stats (Doctor)
export const getClinicalStats = createAsyncThunk(
    'analytics/getClinical',
    async (_, thunkAPI) => {
        try {
            return await analyticsService.getClinicalStats();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const analyticsSlice = createSlice({
    name: 'analytics',
    initialState,
    reducers: {
        resetAnalytics: (state) => {
            state.isError = false;
            state.isSuccess = false;
            state.isLoading = false;
            state.message = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getExecutiveStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getExecutiveStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.data = action.payload; // { opdToday, ipdCurrent, revenueToday, revenueMonth }
            })
            .addCase(getExecutiveStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(getClinicalStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getClinicalStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.data = action.payload; // { opd: [], ipd: [], lab: [] }
            })
            .addCase(getClinicalStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { resetAnalytics } = analyticsSlice.actions;
export default analyticsSlice.reducer;
