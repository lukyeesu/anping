/**
 * Customer Display Media Cache Manager
 * Provides 100% offline persistent storage for customer display images & MP4 videos using IndexedDB.
 * Downloads the ENTIRE media file as a whole chunk into local IndexedDB storage (not sliced byte-ranges),
 * completely eliminating 2-3 second buffering stalls, network jitter, and allowing continuous playback even when internet is disconnected.
 */

const DB_NAME = 'AnpingMediaCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.warn('[MediaCache] IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Retrieve blob from IndexedDB
 */
export async function getBlobFromIndexedDB(url) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        resolve(req.result?.blob || null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (e) {
    return null;
  }
}

/**
 * Save binary blob to IndexedDB
 */
export async function saveBlobToIndexedDB(url, blob, mimeType = null) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        url,
        blob,
        mimeType: mimeType || blob.type || 'video/mp4',
        size: blob.size,
        cachedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.warn('[MediaCache] Failed to save blob to IndexedDB:', e.target?.error);
        resolve(false);
      };
    });
  } catch (e) {
    console.warn('[MediaCache] IndexedDB save error:', e);
    return false;
  }
}

/**
 * Clear all records from IndexedDB
 */
export async function clearIndexedDB() {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

const blobUrlMap = new Map(); // Reuses created ObjectURLs across slides to avoid memory leaks
const pendingDownloads = new Map(); // Deduplicates concurrent downloads for the same URL
const cacheListeners = new Set();

/**
 * Subscribe to media cache events (invoked when a media file finishes downloading into IndexedDB)
 */
export function addMediaCacheListener(listener) {
  if (typeof listener === 'function') {
    cacheListeners.add(listener);
    return () => cacheListeners.delete(listener);
  }
  return () => {};
}

function notifyMediaCached(url, objectUrl) {
  cacheListeners.forEach(listener => {
    try {
      listener(url, objectUrl);
    } catch (e) {
      console.warn('[MediaCache] Listener error:', e);
    }
  });
}

/**
 * Extract YouTube Video ID from any standard YouTube URL (watch, shorts, youtu.be, embed)
 */
export function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

/**
 * Check if a URL is a YouTube video URL
 */
export function isYouTubeUrl(url) {
  return !!getYouTubeVideoId(url);
}

/**
 * Check if a media item is a video
 */
export function isMediaVideo(url, type = null) {
  if (type === 'video' || type === 'youtube') return true;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (isYouTubeUrl(trimmed)) return true;
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(trimmed) || trimmed.includes('/api/media');
}

/**
 * Format Google Drive or external URL to direct streaming link
 */
export function formatMediaUrl(url, type = null) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If already a local blob, data url, or YouTube URL
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || isYouTubeUrl(trimmed)) {
    return trimmed;
  }

  const isVideo = isMediaVideo(trimmed, type);

  // Google Drive format: convert to direct streamable CDN or video download link
  const gdMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|drive\.usercontent\.google\.com\/download\?id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/);
  if (gdMatch && gdMatch[1]) {
    const fileId = gdMatch[1];
    if (isVideo) {
      return `/api/media?id=${fileId}`;
    }
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

/**
 * Download the ENTIRE media file as a whole chunk and save to IndexedDB.
 * Returns local blob: URL.
 */
export async function downloadAndCacheMedia(rawUrl, type = null) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || isYouTubeUrl(trimmed)) return trimmed;

  // 1. If already created in memory
  if (blobUrlMap.has(trimmed)) {
    return blobUrlMap.get(trimmed);
  }

  // 2. If already saved in IndexedDB
  try {
    const existingBlob = await getBlobFromIndexedDB(trimmed);
    if (existingBlob && existingBlob.size > 1000) {
      const objectUrl = URL.createObjectURL(existingBlob);
      blobUrlMap.set(trimmed, objectUrl);
      return objectUrl;
    }
  } catch (e) {}

  // 3. Deduplicate active download
  if (pendingDownloads.has(trimmed)) {
    return pendingDownloads.get(trimmed);
  }

  const downloadPromise = (async () => {
    try {
      const isVideo = isMediaVideo(trimmed, type);
      const streamUrl = formatMediaUrl(trimmed, type);

      // Fetch whole file at once (single request, no range fragmentation)
      const res = await fetch(streamUrl, { mode: 'cors' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      let blob = await res.blob();
      if (!blob || blob.size < 1000) {
        throw new Error('Downloaded file is empty or invalid');
      }

      // Ensure proper MIME type so browser decoders handle it flawlessly
      if (isVideo && (!blob.type || blob.type === 'application/octet-stream')) {
        blob = new Blob([blob], { type: 'video/mp4' });
      } else if (!isVideo && (!blob.type || blob.type === 'application/octet-stream')) {
        blob = new Blob([blob], { type: 'image/jpeg' });
      }

      // Save to IndexedDB persistently for 100% offline usage
      await saveBlobToIndexedDB(trimmed, blob, blob.type);
      console.log(`[MediaCache] Successfully cached ${isVideo ? 'video' : 'image'} to IndexedDB (${Math.round(blob.size / 1024)} KB):`, trimmed);

      // Create ObjectURL for instant local zero-latency playback
      const objectUrl = URL.createObjectURL(blob);
      blobUrlMap.set(trimmed, objectUrl);
      notifyMediaCached(trimmed, objectUrl);
      return objectUrl;
    } catch (err) {
      console.warn(`[MediaCache] Download whole file failed for ${trimmed}, fallback to direct URL:`, err.message || err);
      return formatMediaUrl(trimmed, type);
    } finally {
      pendingDownloads.delete(trimmed);
    }
  })();

  pendingDownloads.set(trimmed, downloadPromise);
  return downloadPromise;
}

/**
 * Pre-cache a single media file into IndexedDB
 */
export async function cacheMediaUrl(rawUrl, type = null) {
  return downloadAndCacheMedia(rawUrl, type);
}

/**
 * Get cached ObjectURL from IndexedDB, or fallback to stream URL while caching in background
 */
export async function getCachedOrDirectMediaUrl(rawUrl, type = null) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || isYouTubeUrl(trimmed)) return trimmed;

  // 1. In-memory hit
  if (blobUrlMap.has(trimmed)) {
    return blobUrlMap.get(trimmed);
  }

  // 2. IndexedDB persistent hit (Works 100% OFFLINE!)
  try {
    const cachedBlob = await getBlobFromIndexedDB(trimmed);
    if (cachedBlob && cachedBlob.size > 1000) {
      const objectUrl = URL.createObjectURL(cachedBlob);
      blobUrlMap.set(trimmed, objectUrl);
      return objectUrl;
    }
  } catch (e) {
    console.warn('[MediaCache] IndexedDB read error:', e);
  }

  // 3. Not yet cached: trigger background download into IndexedDB immediately
  downloadAndCacheMedia(trimmed, type).catch(() => {});

  // For immediate first-time playback before download finishes, return stream URL
  return formatMediaUrl(trimmed, type);
}

/**
 * Preload all active ads (both videos and images) into IndexedDB
 */
export async function preloadAllAdsMedia(adsList = [], onProgress = null) {
  if (!Array.isArray(adsList) || adsList.length === 0) return;

  const validMedia = adsList.filter(ad => ad && ad.isActive !== false && ad.url && !isYouTubeUrl(ad.url));
  let loaded = 0;
  const total = validMedia.length;
  if (total === 0) {
    if (typeof onProgress === 'function') {
      onProgress({ loaded: 0, total: 0, percent: 100 });
    }
    return;
  }

  // Preload sequentially to ensure complete whole-file downloads without bandwidth contention
  for (const ad of validMedia) {
    try {
      await downloadAndCacheMedia(ad.url, ad.type);
    } catch (e) {
      console.warn('[MediaCache] Preload item skipped:', ad.url, e);
    }
    loaded++;
    if (typeof onProgress === 'function') {
      onProgress({ loaded, total, percent: Math.round((loaded / total) * 100) });
    }
  }
}

/**
 * Clean up blob URLs when component unmounts to prevent memory leaks
 */
export function revokeAllCachedBlobUrls() {
  for (const objectUrl of blobUrlMap.values()) {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch (e) {}
  }
  blobUrlMap.clear();
}

/**
 * Purge cache storage & IndexedDB completely
 */
export async function clearMediaCache() {
  revokeAllCachedBlobUrls();
  await clearIndexedDB();
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      await caches.delete('anping_customer_display_media_v1');
      await caches.delete('anping_customer_display_media_v2');
    } catch (e) {}
  }
  return true;
}
