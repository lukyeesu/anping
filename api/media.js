import { Readable } from 'stream';

/**
 * Media Stream Proxy for Google Drive & External Video Content
 * Bypasses browser Cross-Origin-Resource-Policy (CORP) restrictions
 * Supports HTTP 206 Range requests for seamless video playback, scrubbing, and local caching.
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  let fileId = query.id || '';
  const urlParam = query.url || '';

  if (!fileId && urlParam) {
    const gdMatch = urlParam.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|drive\.usercontent\.google\.com\/download\?id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/);
    if (gdMatch && gdMatch[1]) {
      fileId = gdMatch[1];
    }
  }

  if (!fileId && !urlParam) {
    return res.status(400).json({ error: 'Missing file id or url parameter' });
  }

  const targetUrl = fileId
    ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`
    : urlParam;

  try {
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (req.headers.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const driveRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders,
      redirect: 'follow'
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      return res.status(driveRes.status).json({
        error: `Remote server responded with ${driveRes.status}`
      });
    }

    const contentType = driveRes.headers.get('content-type') || 'video/mp4';
    const contentLength = driveRes.headers.get('content-length');
    const contentRange = driveRes.headers.get('content-range');
    const acceptRanges = driveRes.headers.get('accept-ranges') || 'bytes';

    res.statusCode = driveRes.status;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }

    if (req.method === 'HEAD' || !driveRes.body) {
      return res.end();
    }

    // Stream response body to client
    const nodeStream = Readable.fromWeb(driveRes.body);
    nodeStream.on('error', (err) => {
      console.warn('[api/media] Stream piping error:', err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end();
      }
    });

    nodeStream.pipe(res);
  } catch (error) {
    console.error('[api/media] Proxy Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to proxy media stream' });
    }
  }
}
