/**
 * Customer Display Media Cache Manager
 * Provides offline caching for customer display images using CacheStorage & IndexedDB.
 * MP4 videos bypass CacheStorage/blob URLs completely to stream directly via native HTTP 206 Partial Content,
 * eliminating decoder starvation, RAM pressure, and video frame stuttering on iPad / mobile devices.
 */

const CACHE_NAME = 'anping_customer_display_media_v2';
const PREVIOUS_CACHES = ['anping_customer_display_media_v1'];

// Auto-cleanup legacy video-bloated caches
if (typeof window !== 'undefined' && 'caches' in window) {
  PREVIOUS_CACHES.forEach(oldName => {
    caches.delete(oldName).catch(() => {});
  });
}

const blobUrlMap = new Map(); // In-memory map to reuse created ObjectURLs for images and prevent memory leaks

/**
 * Check if a media item is a video
 */
export function isMediaVideo(url, type = null) {
  if (type === 'video') return true;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(trimmed) || trimmed.includes('/api/media');
}

/**
 * Format Google Drive or external URL to direct streaming link
 * Automatically distinguishes between images (lh3 CDN) and video MP4 streams (drive.usercontent download / /api/media)
 */
export function formatMediaUrl(url, type = null) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If already a local blob or data url
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
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
 * Pre-cache a single image file into CacheStorage
 * Videos bypass CacheStorage and return their direct stream URL immediately.
 */
export async function cacheMediaUrl(rawUrl, type = null) {
  const url = formatMediaUrl(rawUrl, type);
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Never cache videos in CacheStorage or as blobs!
  // Videos must stream directly via native HTTP 206 partial content range requests
  // to prevent decoder starvation, RAM saturation, and frame stuttering on mobile/iPad devices.
  if (isMediaVideo(url, type)) {
    return url;
  }

  if (blobUrlMap.has(url)) {
    return blobUrlMap.get(url);
  }

  if (typeof window === 'undefined' || !('caches' in window)) {
    return url;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (match) {
      const blob = await match.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlMap.set(url, objectUrl);
      return objectUrl;
    }

    // Fetch and store image in cache
    const response = await fetch(url, { mode: 'cors' });
    if (response && response.ok) {
      try {
        await cache.put(url, response.clone());
      } catch (cacheErr) {
        console.warn('[MediaCache] Cache storage quota skipped, utilizing blob URL:', cacheErr);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlMap.set(url, objectUrl);
      return objectUrl;
    }
  } catch (err) {
    // If CORS or fetch fails, fallback to direct url gracefully
    console.warn(`[MediaCache] Cache fetch skipped for ${url}:`, err.message || err);
  }

  return url;
}

/**
 * Get cached URL for images, or direct streamable URL for videos
 */
export async function getCachedOrDirectMediaUrl(rawUrl, type = null) {
  const url = formatMediaUrl(rawUrl, type);
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Videos stream natively — bypass CacheStorage and blobs completely
  if (isMediaVideo(url, type)) {
    return url;
  }

  if (blobUrlMap.has(url)) {
    return blobUrlMap.get(url);
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(url);
      if (match) {
        const blob = await match.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrlMap.set(url, objectUrl);
        return objectUrl;
      }
    } catch (e) {
      // Ignore cache lookup errors
    }
  }

  // Not yet cached, trigger caching in background and return direct url immediately
  cacheMediaUrl(url, type).catch(() => {});
  return url;
}

/**
 * Preload active static image ads into CacheStorage
 * Videos are filtered out and streamed on-demand natively by the browser video engine.
 */
export async function preloadAllAdsMedia(adsList = [], onProgress = null) {
  if (!Array.isArray(adsList) || adsList.length === 0) return;

  const validImageAds = adsList.filter(ad => {
    if (!ad || ad.isActive === false || !ad.url) return false;
    return !isMediaVideo(ad.url, ad.type);
  });

  let loaded = 0;
  const total = validImageAds.length;
  if (total === 0) {
    if (typeof onProgress === 'function') {
      onProgress({ loaded: 0, total: 0, percent: 100 });
    }
    return;
  }

  for (const ad of validImageAds) {
    try {
      await cacheMediaUrl(ad.url, ad.type);
    } catch (e) {
      // Continue next
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
 * Purge cache storage completely
 */
export async function clearMediaCache() {
  revokeAllCachedBlobUrls();
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      await caches.delete(CACHE_NAME);
      for (const oldName of PREVIOUS_CACHES) {
        await caches.delete(oldName);
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  return true;
}
