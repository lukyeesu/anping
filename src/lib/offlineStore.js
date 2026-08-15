// IndexedDB Storage & Delta Sync Helper for ClinicHub
// Includes 5 Critical Safeguards: Multi-Tab Sync, Reconnect Catch-up, Incognito Fallback, Soft Delete Filtering & Privacy Wipeout

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
let isDatabasePurged = false;

export function resetDatabasePurgedFlag() {
  isDatabasePurged = false;
}

export function getIsDatabasePurged() {
  return isDatabasePurged;
}

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
    if (isDatabasePurged) return;
    console.log('[OfflineStore] Network reconnected. Broadcasting sync check...');
    broadcastStoreChange('*', 'NETWORK_RECONNECTED');
  });
}

function openDB(force = false) {
  if (isDatabasePurged && !force) {
    return Promise.reject(new Error('IndexedDB is currently locked until user logs in.'));
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
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
      reject(event.target.error);
    };
  });
}

// Get all items from a table in IndexedDB (or Memory Fallback)
export async function getLocalStore(storeName) {
  if (isDatabasePurged) {
    return [];
  }
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
    return (memoryStore[storeName] || []).filter(item => !item.is_deleted && !item.isDeleted);
  }
}

// Upsert (add or update) items in IndexedDB
export async function upsertLocalStore(storeName, items, options = {}) {
  if (isDatabasePurged) return;
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
    if (shouldBroadcast) broadcastStoreChange(storeName, 'UPSERT');
  }
}

// Replace entire store (used for full initial load or hard reset)
export async function replaceLocalStore(storeName, items, options = {}) {
  if (isDatabasePurged) return;
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
    if (shouldBroadcast) broadcastStoreChange(storeName, 'REPLACE');
  }
}

// Delete a specific item from IndexedDB and memoryStore
export async function deleteFromLocalStore(storeName, itemId, options = {}) {
  if (isDatabasePurged) return;
  const shouldBroadcast = options.broadcast !== false;
  if (!itemId) return;
  const targetId = String(itemId).trim();

  // Update memory fallback
  if (memoryStore[storeName]) {
    const existingIdx = memoryStore[storeName].findIndex(x => String(x.id || x.hn || x.username || '').trim() === targetId);
    if (existingIdx >= 0) {
      memoryStore[storeName].splice(existingIdx, 1);
    }
  }

  if (!isIndexedDBSupported) {
    if (shouldBroadcast) broadcastStoreChange(storeName, 'DELETE');
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.delete(targetId);

      transaction.oncomplete = () => {
        if (shouldBroadcast) broadcastStoreChange(storeName, 'DELETE');
        resolve(true);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    if (shouldBroadcast) broadcastStoreChange(storeName, 'DELETE');
  }
}

// Reconcile local store with authoritative server items
export async function reconcileLocalStore(storeName, serverItems = [], scopeFilterFn = null, options = {}) {
  if (isDatabasePurged) return [];
  const shouldBroadcast = options.broadcast !== false;
  const cleanServerItems = Array.isArray(serverItems)
    ? serverItems.filter(x => x && !x.is_deleted && !x.isDeleted)
    : [];

  const serverMap = new Map();
  cleanServerItems.forEach(item => {
    const id = String(item.id || item.hn || item.username || '').trim();
    if (id) serverMap.set(id, { ...item, id });
  });

  let finalList = [];
  if (typeof scopeFilterFn === 'function') {
    const currentLocal = await getLocalStore(storeName);
    const outOfScope = currentLocal.filter(item => !scopeFilterFn(item));
    const serverReconciled = Array.from(serverMap.values());
    finalList = [...outOfScope, ...serverReconciled];
  } else {
    finalList = Array.from(serverMap.values());
  }

  await replaceLocalStore(storeName, finalList, { broadcast: shouldBroadcast });
  return finalList;
}

// Differential sync comparison between local store and server manifest ({ id, updated_at, is_deleted })
export async function diffLocalStore(storeName, serverManifest = [], scopeFilterFn = null) {
  if (isDatabasePurged) {
    return { idsToFetch: [], deletedIds: [], localItems: [] };
  }
  const localItems = await getLocalStore(storeName);
  const inScopeLocal = typeof scopeFilterFn === 'function' ? localItems.filter(scopeFilterFn) : localItems;

  const localMap = new Map();
  inScopeLocal.forEach(item => {
    const id = String(item.id || item.hn || item.username || '').trim();
    if (id) localMap.set(id, item);
  });

  const serverMap = new Map();
  (serverManifest || []).forEach(m => {
    const id = String(m.id || m.hn || m.username || '').trim();
    if (id) {
      serverMap.set(id, {
        id,
        updated_at: m.updated_at || m.created_at || null,
        is_deleted: !!(m.is_deleted || m.isDeleted)
      });
    }
  });

  const deletedIds = [];
  const idsToFetch = [];

  // 1. ตรวจหารายการที่ถูกลบไปแล้วบน Server
  for (const [localId] of localMap.entries()) {
    const serverEntry = serverMap.get(localId);
    if (!serverEntry || serverEntry.is_deleted) {
      deletedIds.push(localId);
    }
  }

  // 2. ตรวจหารายการใหม่ หรือรายการที่มีการแก้ไขบน Server
  for (const [serverId, serverEntry] of serverMap.entries()) {
    if (serverEntry.is_deleted) continue;

    const localItem = localMap.get(serverId);
    if (!localItem) {
      idsToFetch.push(serverId);
    } else {
      const serverTime = serverEntry.updated_at ? new Date(serverEntry.updated_at).getTime() : 0;
      const localTime = (localItem.updated_at || localItem.updatedAt || localItem.created_at || localItem.createdAt)
        ? new Date(localItem.updated_at || localItem.updatedAt || localItem.created_at || localItem.createdAt).getTime()
        : 0;

      if (serverTime && localTime && serverTime > (localTime + 500)) {
        idsToFetch.push(serverId);
      } else if (serverTime && !localTime) {
        idsToFetch.push(serverId);
      }
    }
  }

  // 3. ลบรายการที่ถูกลบออกจาก IndexedDB ทันที
  for (const delId of deletedIds) {
    await deleteFromLocalStore(storeName, delId, { broadcast: false });
  }

  return {
    idsToFetch,
    deletedIds,
    localItems
  };
}

// Last Sync Metadata Management
export async function getLastSyncTime(storeName) {
  if (isDatabasePurged) return null;
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
  if (isDatabasePurged) return;
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
  } catch (err) {}
}

// Safeguard 4: Force Hard Refresh & Clear All Local Stores (Privacy & Security Wipeout)
export async function clearAllLocalStores() {
  isDatabasePurged = true;

  // 1. ล้าง Memory Store ทั้งหมด
  STORES.forEach(s => { memoryStore[s] = []; });
  Object.keys(memoryStore).forEach(k => delete memoryStore[k]);

  if (typeof window === 'undefined' || !window.indexedDB) {
    broadcastStoreChange('*', 'CLEAR_ALL');
    return true;
  }

  // 2. เคลียร์ข้อมูลในทุก Object Store แบบ Transaction
  try {
    const db = await openDB(true);
    if (db) {
      const existingStores = Array.from(db.objectStoreNames);
      if (existingStores.length > 0) {
        await new Promise((resolve) => {
          const transaction = db.transaction(existingStores, 'readwrite');
          existingStores.forEach(storeName => {
            try {
              transaction.objectStore(storeName).clear();
            } catch (e) {}
          });
          transaction.oncomplete = () => {
            db.close();
            resolve(true);
          };
          transaction.onerror = () => {
            db.close();
            resolve(false);
          };
        });
      } else {
        db.close();
      }
    }
  } catch (err) {
    console.warn('[OfflineStore] Failed to clear stores in transaction:', err);
  }

  // 3. สั่ง Delete Database ทันทีเพื่อล้างข้อมูลจากเครื่องให้สะอาด 100%
  try {
    await new Promise((resolve) => {
      const delReq = indexedDB.deleteDatabase(DB_NAME);
      delReq.onsuccess = () => resolve(true);
      delReq.onerror = () => resolve(false);
      delReq.onblocked = () => resolve(false);
    });
  } catch (e) {}

  broadcastStoreChange('*', 'CLEAR_ALL');
  return true;
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
