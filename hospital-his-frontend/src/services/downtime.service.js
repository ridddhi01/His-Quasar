/**
 * Downtime Service
 * Handles offline storage and sync for Emergency module using IndexedDB
 */

const DB_NAME = 'HISEmergencyDowntime';
const DB_VERSION = 1;
const STORE_NAME = 'offlineActions';

let db = null;

/**
 * Initialize IndexedDB database
 */
export const initDowntimeDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open downtime database');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('queuedAt', 'queuedAt', { unique: false });
            }
        };
    });
};

/**
 * Queue an offline action
 */
export const queueOfflineAction = async (action) => {
    await initDowntimeDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const actionWithMeta = {
            ...action,
            queuedAt: new Date().toISOString(),
            synced: false,
        };

        const request = store.add(actionWithMeta);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get all queued offline actions
 */
export const getQueuedActions = async () => {
    await initDowntimeDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            // Filter out already synced actions
            const pendingActions = request.result.filter(a => !a.synced);
            resolve(pendingActions);
        };
        request.onerror = () => reject(request.error);
    });
};

/**
 * Mark an action as synced
 */
export const markActionSynced = async (actionId) => {
    await initDowntimeDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const getRequest = store.get(actionId);

        getRequest.onsuccess = () => {
            const action = getRequest.result;
            if (action) {
                action.synced = true;
                action.syncedAt = new Date().toISOString();

                const updateRequest = store.put(action);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                resolve();
            }
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
};

/**
 * Clear all synced actions from the queue
 */
export const clearSyncedActions = async () => {
    await initDowntimeDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.synced) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                resolve();
            }
        };

        request.onerror = () => reject(request.error);
    });
};

/**
 * Clear entire offline queue
 */
export const clearAllActions = async () => {
    await initDowntimeDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get count of pending actions
 */
export const getPendingCount = async () => {
    const actions = await getQueuedActions();
    return actions.length;
};

/**
 * Sync all pending actions with the server
 * @param {Object} emergencyService - The emergency service for API calls
 */
export const syncWithServer = async (emergencyService) => {
    const pendingActions = await getQueuedActions();
    console.log(`[DowntimeSync] Found ${pendingActions.length} pending actions`);
    const results = { success: 0, failed: 0, errors: [] };

    for (const action of pendingActions) {
        console.log(`[DowntimeSync] Processing action: ${action.type}`, action);
        try {
            switch (action.type) {
                case 'CREATE_CASE':
                    await emergencyService.createCase(action.data);
                    break;
                case 'UPDATE_TRIAGE':
                    await emergencyService.updateTriage(action.caseId, action.data);
                    break;
                case 'UPDATE_STATUS':
                    await emergencyService.updateStatus(action.caseId, action.data.status);
                    break;
                default:
                    console.warn('[DowntimeSync] Unknown action type:', action.type);
            }

            console.log(`[DowntimeSync] Action ID ${action.id} synced successfully`);
            await markActionSynced(action.id);
            results.success++;
        } catch (error) {
            console.error(`[DowntimeSync] Failed to sync action ID ${action.id}:`, error);
            results.failed++;
            results.errors.push({
                actionId: action.id,
                type: action.type,
                error: error.message,
            });
        }
    }

    // Clear synced actions after successful sync
    if (results.success > 0) {
        await clearSyncedActions();
    }

    return results;
};

/**
 * Check if browser is online
 */
export const isOnline = () => {
    return navigator.onLine;
};

/**
 * Add network status listeners
 */
export const addNetworkListeners = (onOnline, onOffline) => {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
    };
};

const downtimeService = {
    initDowntimeDB,
    queueOfflineAction,
    getQueuedActions,
    markActionSynced,
    clearSyncedActions,
    clearAllActions,
    getPendingCount,
    syncWithServer,
    isOnline,
    addNetworkListeners,
};

export default downtimeService;
