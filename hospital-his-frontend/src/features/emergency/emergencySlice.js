import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import emergencyService from '../../services/emergency.service';

const initialState = {
    activeCases: [],          // Live board cases
    selectedCase: null,       // Currently selected case
    offlineQueue: [],         // Pending offline actions
    isDowntime: false,        // Downtime mode flag
    syncStatus: 'idle',       // 'idle' | 'syncing' | 'synced' | 'error'
    dashboardStats: null,     // Dashboard statistics
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
};

// Get live board
export const fetchLiveBoard = createAsyncThunk(
    'emergency/fetchLiveBoard',
    async (_, thunkAPI) => {
        try {
            return await emergencyService.getLiveBoard();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();

            // Check if it's a network error (downtime)
            if (!error.response || error.code === 'ERR_NETWORK') {
                thunkAPI.dispatch(setDowntimeMode(true));
            }

            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get dashboard stats
export const fetchDashboardStats = createAsyncThunk(
    'emergency/fetchDashboardStats',
    async (_, thunkAPI) => {
        try {
            return await emergencyService.getDashboardStats();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create emergency case
export const createEmergencyCase = createAsyncThunk(
    'emergency/createCase',
    async (caseData, thunkAPI) => {
        try {
            const result = await emergencyService.createCase(caseData);
            // If we were in downtime and this succeeds, exit downtime
            thunkAPI.dispatch(setDowntimeMode(false));
            return result;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();

            // If network error, queue for offline
            if (!error.response || error.code === 'ERR_NETWORK') {
                thunkAPI.dispatch(setDowntimeMode(true));
                thunkAPI.dispatch(queueOfflineAction({ type: 'CREATE_CASE', data: caseData }));
                return thunkAPI.rejectWithValue('Offline: Case queued for sync');
            }

            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Update triage
export const updateCaseTriage = createAsyncThunk(
    'emergency/updateTriage',
    async ({ id, triageLevel, reason }, thunkAPI) => {
        try {
            const result = await emergencyService.updateTriage(id, { triageLevel, reason });
            thunkAPI.dispatch(setDowntimeMode(false));
            return result;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();

            if (!error.response || error.code === 'ERR_NETWORK') {
                thunkAPI.dispatch(setDowntimeMode(true));
                thunkAPI.dispatch(queueOfflineAction({ type: 'UPDATE_TRIAGE', caseId: id, data: { triageLevel, reason } }));
                return thunkAPI.rejectWithValue('Offline: Triage update queued for sync');
            }

            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Update status
export const updateCaseStatus = createAsyncThunk(
    'emergency/updateStatus',
    async ({ id, status }, thunkAPI) => {
        try {
            const result = await emergencyService.updateStatus(id, status);
            thunkAPI.dispatch(setDowntimeMode(false));
            return result;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();

            if (!error.response || error.code === 'ERR_NETWORK') {
                thunkAPI.dispatch(setDowntimeMode(true));
                thunkAPI.dispatch(queueOfflineAction({ type: 'UPDATE_STATUS', caseId: id, data: { status } }));
                return thunkAPI.rejectWithValue('Offline: Status update queued for sync');
            }

            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Update vitals
export const updateCaseVitals = createAsyncThunk(
    'emergency/updateVitals',
    async ({ id, vitals }, thunkAPI) => {
        try {
            const result = await emergencyService.updateVitals(id, vitals);
            thunkAPI.dispatch(setDowntimeMode(false));
            return result;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();

            if (!error.response || error.code === 'ERR_NETWORK') {
                thunkAPI.dispatch(setDowntimeMode(true));
                thunkAPI.dispatch(queueOfflineAction({ type: 'UPDATE_VITALS', caseId: id, data: vitals }));
                return thunkAPI.rejectWithValue('Offline: Vitals update queued for sync');
            }

            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get case by ID
export const fetchCaseById = createAsyncThunk(
    'emergency/fetchCaseById',
    async (id, thunkAPI) => {
        try {
            return await emergencyService.getCaseById(id);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const emergencySlice = createSlice({
    name: 'emergency',
    initialState,
    reducers: {
        resetEmergency: (state) => {
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = false;
            state.message = '';
        },

        setDowntimeMode: (state, action) => {
            state.isDowntime = action.payload;
            if (!action.payload) {
                state.syncStatus = 'idle';
            }
        },

        queueOfflineAction: (state, action) => {
            state.offlineQueue.push({
                ...action.payload,
                queuedAt: new Date().toISOString(),
                id: Date.now().toString(),
            });
        },

        clearOfflineQueue: (state) => {
            state.offlineQueue = [];
            state.syncStatus = 'synced';
        },

        setSyncStatus: (state, action) => {
            state.syncStatus = action.payload;
        },

        // Socket event handlers for real-time updates
        handleNewCase: (state, action) => {
            const newCase = action.payload.data;
            // Add to beginning of list if not already present
            const exists = state.activeCases.find(c => c._id === newCase._id);
            if (!exists) {
                state.activeCases.unshift(newCase);
            }
        },

        handleTriageUpdate: (state, action) => {
            const { caseId, data } = action.payload;
            const index = state.activeCases.findIndex(c => c._id === caseId);
            if (index !== -1) {
                state.activeCases[index] = {
                    ...state.activeCases[index],
                    ...data,
                };
            }
            if (state.selectedCase && state.selectedCase._id === caseId) {
                state.selectedCase = { ...state.selectedCase, ...data };
            }
        },

        handleStatusUpdate: (state, action) => {
            const { caseId, newStatus, data } = action.payload;
            const index = state.activeCases.findIndex(c => c._id === caseId);

            // If case is discharged/admitted/transferred, remove from active list
            const inactiveStatuses = ['discharged', 'admitted', 'transferred'];
            if (inactiveStatuses.includes(newStatus)) {
                if (index !== -1) {
                    state.activeCases.splice(index, 1);
                }
            } else if (index !== -1) {
                state.activeCases[index] = { ...state.activeCases[index], ...data };
            }

            if (state.selectedCase && state.selectedCase._id === caseId) {
                state.selectedCase = { ...state.selectedCase, ...data };
            }
        },

        setSelectedCase: (state, action) => {
            state.selectedCase = action.payload;
        },
    },

    extraReducers: (builder) => {
        builder
            // Fetch live board
            .addCase(fetchLiveBoard.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchLiveBoard.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.activeCases = action.payload;
                state.isDowntime = false;
            })
            .addCase(fetchLiveBoard.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Fetch dashboard stats
            .addCase(fetchDashboardStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.dashboardStats = action.payload;
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Create case
            .addCase(createEmergencyCase.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createEmergencyCase.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const exists = state.activeCases.find(c => c._id === action.payload._id);
                if (!exists) {
                    state.activeCases.unshift(action.payload);
                }
            })
            .addCase(createEmergencyCase.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Update triage
            .addCase(updateCaseTriage.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateCaseTriage.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const index = state.activeCases.findIndex(c => c._id === action.payload._id);
                if (index !== -1) {
                    state.activeCases[index] = action.payload;
                }
            })
            .addCase(updateCaseTriage.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Update status
            .addCase(updateCaseStatus.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateCaseStatus.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const inactiveStatuses = ['discharged', 'admitted', 'transferred'];
                if (inactiveStatuses.includes(action.payload.status)) {
                    state.activeCases = state.activeCases.filter(c => c._id !== action.payload._id);
                } else {
                    const index = state.activeCases.findIndex(c => c._id === action.payload._id);
                    if (index !== -1) {
                        state.activeCases[index] = action.payload;
                    }
                }
            })
            .addCase(updateCaseStatus.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Update vitals
            .addCase(updateCaseVitals.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateCaseVitals.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const index = state.activeCases.findIndex(c => c._id === action.payload._id);
                if (index !== -1) {
                    state.activeCases[index] = action.payload;
                }
                if (state.selectedCase && state.selectedCase._id === action.payload._id) {
                    state.selectedCase = action.payload;
                }
            })
            .addCase(updateCaseVitals.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Fetch case by ID
            .addCase(fetchCaseById.fulfilled, (state, action) => {
                state.selectedCase = action.payload;
            });
    },
});

export const {
    resetEmergency,
    setDowntimeMode,
    queueOfflineAction,
    clearOfflineQueue,
    setSyncStatus,
    handleNewCase,
    handleTriageUpdate,
    handleStatusUpdate,
    setSelectedCase,
} = emergencySlice.actions;

export default emergencySlice.reducer;
