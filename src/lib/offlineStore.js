// IndexedDB Storage & Delta Sync Helper for ClinicHub
// Includes 5 Critical Safeguards: Multi-Tab Sync, Reconnect Catch-up, Incognito Fallback, Soft Delete Filtering & Force Cache Purge

const DB_NAME = 'ClinicHub_OfflineStore';
const DB_VERSION = 2;

const STORES = [
  'patients',
  'treatments',
  'branches',
  'queue',
  'pos_transactions',
  'inventory',
  'inventory_logs',
  'setting_pos',
  'finance_revenue',
  'finance_expenses',
  'staff',
  'staff_schedules',
  'settings',
  'logs',
  'sync_metadata'
];

// Safeguard 1: Multi-Tab Synchronization via BroadcastChannel
const syncChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window)
  ? new BroadcastChannel('clinichub_store_sync')
  : null;

// Safeguard 3: Memory Store Fallback for Incognito Mode / Quota Exceeded
const memoryStore = {};
STORES.forEach(s => { memoryStore[s] = []; });
let isIndexedDBSupported = true;

function broadcastStoreChange(storeName, action = 'UPDATE') {
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: 'STORE_UPDATED',
        storeName,
        action,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('[OfflineStore] BroadcastChannel send note:', e);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clinichub_store_updated', {
      detail: {
        type: 'STORE_UPDATED',
        storeName,
        action,
        timestamp: Date.now()
      }
    }));
  }
}

// Safeguard 2: Automatic Reconnect Event Listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineStore] Network reconnected. Broadcasting sync check...');
    broadcastStoreChange('*', 'NETWORK_RECONNECTED');
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      isIndexedDBSupported = false;
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === 'sync_metadata') {
            db.createObjectStore(storeName, { keyPath: 'key' });
          } else {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      isIndexedDBSupported = false;
      reject(event.target.error);
    };
  });
}

// Get all items from a table in IndexedDB (or Memory Fallback)
export async function getLocalStore(storeName) {
  if (!isIndexedDBSupported) {
    return (memoryStore[storeName] || []).filter(item => !item.is_deleted && !item.isDeleted);
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        // Safeguard 5: Filter out soft deleted items locally
        const activeItems = items.filter(item => !item.is_deleted && !item.isDeleted);
        memoryStore[storeName] = activeItems;
        resolve(activeItems);
      };

      request.onerror = () => {
        resolve((memoryStore[storeName] || []).filter(item => !item.is_deleted && !item.isDeleted));
      };
    });
  } catch (err) {
    console.warn(`[OfflineStore] Failed to get local store ${storeName}, using memory fallback:`, err);
    return (memoryStore[storeName] || []).filter(item => !item.is_deleted && !item.isDeleted);
  }
}

// Upsert (add or update) items in IndexedDB
export async function upsertLocalStore(storeName, items, options = {}) {
  const shouldBroadcast = options.broadcast !== false;
  if (!Array.isArray(items) || items.length === 0) return;

  // Update memory fallback
  items.forEach(item => {
    const itemId = item.id || item.hn || item.username;
    if (!itemId) return;
    const existingIdx = (memoryStore[storeName] || []).findIndex(x => (x.id || x.hn || x.username) === itemId);
    if (item.is_deleted || item.isDeleted) {
      if (existingIdx >= 0) memoryStore[storeName].splice(existingIdx, 1);
    } else {
      if (existingIdx >= 0) memoryStore[storeName][existingIdx] = { ...item, id: itemId };
      else memoryStore[storeName].push({ ...item, id: itemId });
    }
  });

  if (!isIndexedDBSupported) {
    if (shouldBroadcast) broadcastStoreChange(storeName, 'UPSERT');
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => {
        const itemId = item.id || item.hn || item.username;
        if (!itemId) return;

        const record = { ...item, id: itemId };
        if (record.is_deleted || record.isDeleted) {
          store.delete(itemId);
        } else {
          store.put(record);
        }
      });

      transaction.oncomplete = () => {
        if (shouldBroadcast) broadcastStoreChange(storeName, 'UPSERT');
        resolve(true);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn(`[OfflineStore] Failed to upsert local store ${storeName}:`, err);
    if (shouldBroadcast) broadcastStoreChange(storeName, 'UPSERT');
  }
}

// Replace entire store (used for full initial load or hard reset)
export async function replaceLocalStore(storeName, items, options = {}) {
  const shouldBroadcast = options.broadcast !== false;
  memoryStore[storeName] = Array.isArray(items) ? items.filter(x => !x.is_deleted && !x.isDeleted) : [];

  if (!isIndexedDBSupported) {
    if (shouldBroadcast) broadcastStoreChange(storeName, 'REPLACE');
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();

      if (Array.isArray(items)) {
        items.forEach(item => {
          const itemId = item.id || item.hn || item.username;
          if (itemId && !item.is_deleted && !item.isDeleted) {
            store.put({ ...item, id: itemId });
          }
        });
      }

      transaction.oncomplete = () => {
        if (shouldBroadcast) broadcastStoreChange(storeName, 'REPLACE');
        resolve(true);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn(`[OfflineStore] Failed to replace local store ${storeName}:`, err);
    if (shouldBroadcast) broadcastStoreChange(storeName, 'REPLACE');
  }
}

// Last Sync Metadata Management
export async function getLastSyncTime(storeName) {
  if (!isIndexedDBSupported) return memoryStore[`_sync_${storeName}`] || null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('sync_metadata', 'readonly');
      const store = transaction.objectStore('sync_metadata');
      const request = store.get(storeName);

      request.onsuccess = () => {
        resolve(request.result?.timestamp || memoryStore[`_sync_${storeName}`] || null);
      };

      request.onerror = () => resolve(memoryStore[`_sync_${storeName}`] || null);
    });
  } catch (err) {
    return memoryStore[`_sync_${storeName}`] || null;
  }
}

export async function setLastSyncTime(storeName, timestamp) {
  const ts = timestamp || new Date().toISOString();
  memoryStore[`_sync_${storeName}`] = ts;
  if (!isIndexedDBSupported) return;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('sync_metadata', 'readwrite');
      const store = transaction.objectStore('sync_metadata');
      store.put({ key: storeName, timestamp: ts });
      transaction.oncomplete = () => resolve(true);
    });
  } catch (err) {
    console.warn(`[OfflineStore] Failed to set last sync time for ${storeName}:`, err);
  }
}

// Safeguard 4: Force Hard Refresh & Clear All Local Stores
export async function clearAllLocalStores() {
  STORES.forEach(s => { memoryStore[s] = []; });
  if (!isIndexedDBSupported) {
    broadcastStoreChange('*', 'CLEAR_ALL');
    return true;
  }
  try {
    const db = await openDB();
    STORES.forEach(storeName => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
    });
    broadcastStoreChange('*', 'CLEAR_ALL');
    return true;
  } catch (err) {
    console.warn('[OfflineStore] Failed to clear local stores:', err);
    return false;
  }
}

// Subscribe to store updates across browser tabs and within the same tab
export function subscribeStoreUpdates(callback) {
  const cleanups = [];

  if (syncChannel) {
    const handler = (event) => {
      if (event.data && typeof callback === 'function') {
        callback(event.data);
      }
    };
    syncChannel.addEventListener('message', handler);
    cleanups.push(() => syncChannel.removeEventListener('message', handler));
  }

  if (typeof window !== 'undefined') {
    const customHandler = (event) => {
      if (event.detail && typeof callback === 'function') {
        callback(event.detail);
      }
    };
    window.addEventListener('clinichub_store_updated', customHandler);
    cleanups.push(() => window.removeEventListener('clinichub_store_updated', customHandler));
  }

  return () => {
    cleanups.forEach(fn => fn());
  };
}
