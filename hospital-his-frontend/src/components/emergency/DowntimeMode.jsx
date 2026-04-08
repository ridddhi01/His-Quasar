import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    setDowntimeMode,
    clearOfflineQueue,
    setSyncStatus,
    fetchLiveBoard,
} from '../../features/emergency/emergencySlice';
import downtimeService from '../../services/downtime.service';
import emergencyService from '../../services/emergency.service';

const DowntimeMode = () => {
    const dispatch = useDispatch();
    const { isDowntime, offlineQueue, syncStatus } = useSelector((state) => state.emergency);

    const [pendingCount, setPendingCount] = useState(0);
    const [syncResults, setSyncResults] = useState(null);

    // Get pending count from IndexedDB
    useEffect(() => {
        const loadPendingCount = async () => {
            try {
                const count = await downtimeService.getPendingCount();
                setPendingCount(count);
            } catch (error) {
                console.error('Failed to get pending count:', error);
            }
        };

        loadPendingCount();
    }, [offlineQueue]);

    // Network status listener
    useEffect(() => {
        const cleanup = downtimeService.addNetworkListeners(
            () => {
                // Online
                console.log('Network restored');
            },
            () => {
                // Offline
                console.log('Network lost');
                dispatch(setDowntimeMode(true));
            }
        );

        return cleanup;
    }, [dispatch]);

    const handleSync = async () => {
        dispatch(setSyncStatus('syncing'));
        setSyncResults(null);

        try {
            const results = await downtimeService.syncWithServer(emergencyService);
            setSyncResults(results);

            if (results.failed === 0) {
                dispatch(setSyncStatus('synced'));
                dispatch(clearOfflineQueue());
                dispatch(setDowntimeMode(false));

                // Refresh the live board
                dispatch(fetchLiveBoard());
            } else {
                dispatch(setSyncStatus('error'));
            }
        } catch (error) {
            console.error('Sync failed:', error);
            dispatch(setSyncStatus('error'));
            setSyncResults({ success: 0, failed: 1, errors: [{ error: error.message }] });
        }
    };

    const handleRetryConnection = async () => {
        try {
            // Try to fetch live board to check connection
            await dispatch(fetchLiveBoard()).unwrap();
            dispatch(setDowntimeMode(false));
        } catch (error) {
            // Still offline
            console.log('Still offline:', error);
        }
    };

    if (!isDowntime && offlineQueue.length === 0 && pendingCount === 0) {
        return null;
    }

    const totalPending = offlineQueue.length + pendingCount;

    return (
        <div className="bg-yellow-500 text-yellow-900">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="font-semibold">
                                {isDowntime ? 'Offline Mode Active' : 'Pending Sync'}
                            </p>
                            <p className="text-sm">
                                {totalPending > 0
                                    ? `${totalPending} action(s) pending sync`
                                    : 'Connection lost to server'
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {syncStatus === 'syncing' ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-900 border-t-transparent"></div>
                                <span className="text-sm font-medium">Syncing...</span>
                            </div>
                        ) : (
                            <>
                                {totalPending > 0 && (
                                    <button
                                        onClick={handleSync}
                                        className="px-4 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium transition-colors"
                                    >
                                        Sync Now
                                    </button>
                                )}
                                <button
                                    onClick={handleRetryConnection}
                                    className="px-4 py-1.5 bg-yellow-800 text-white rounded-lg hover:bg-yellow-900 text-sm font-medium transition-colors"
                                >
                                    Retry Connection
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Sync Results */}
                {syncResults && (
                    <div className={`mt-3 p-3 rounded-lg ${syncResults.failed === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        <p className="font-medium">
                            Sync Complete: {syncResults.success} succeeded, {syncResults.failed} failed
                        </p>
                        {syncResults.errors && syncResults.errors.length > 0 && (
                            <ul className="mt-1 text-sm">
                                {syncResults.errors.map((err, i) => (
                                    <li key={i}>• {err.type}: {err.error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DowntimeMode;
