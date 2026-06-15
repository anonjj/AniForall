const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');
const axios = require('axios');

// Fix 2 — Cache successfully extracted m3u8 URLs for 20 minutes
const streamCache = new Map();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

function getCachedStream(key) {
  const cached = streamCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  streamCache.delete(key);
  return null;
}

// GET /api/stream/proxy?url=
// Proxies .m3u8, .ts, and .key files with correct Referer to bypass CDN blocks
router.get('/proxy', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url param required' });

    const parsedUrl = new URL(url);
    let referer = parsedUrl.origin + '/';
    if (parsedUrl.hostname.includes('uwucdn.top') || parsedUrl.hostname.includes('kwik.')) {
      referer = 'https://kwik.cx/';
    }

    // Problem 2: Pass Cloudflare cookies for kwik.cx to avoid rate limiting
    const cookies = animepahe.Config.cookies;

    // Allow the browser to read this response (needed for AES-128 keys)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const isM3u8 = url.includes('.m3u8');
    const isKey  = url.includes('.key') || url.endsWith('/key') || parsedUrl.pathname.endsWith('/mon.key');

    if (isM3u8) {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': animepahe.Config.userAgent,
          'Referer': referer,
          'Origin': 'https://kwik.cx',
          'Cookie': cookies,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        }
      });
      
      let body = response.data;
      if (typeof body !== 'string') {
        body = JSON.stringify(body);
      }
      
      const manifestUrl = url;

      // 1. Rewrite absolute URLs (http or https)
      // Matches URLs that look like media files (ts, jpg, m3u8, key, mp4, etc.)
      const absUrlPattern = /(https?:\/\/[^"'<>\s,]+\.(?:ts|jpg|jpeg|png|m3u8|key|m4s|mp4)[^\s"'<>,]*)/g;
      body = body.replace(absUrlPattern, (match) => {
        return `/api/stream/proxy?url=${encodeURIComponent(match)}`;
      });

      // 2. Rewrite #EXT-X-KEY URI="..." (handles both relative and absolute)
      const keyPattern = /(URI=")([^"]+)(")/g;
      body = body.replace(keyPattern, (match, prefix, origUrl, suffix) => {
        if (origUrl.startsWith('/api/stream/proxy')) return match; // Avoid double proxy
        const resolvedUrl = new URL(origUrl, manifestUrl).href;
        return `${prefix}/api/stream/proxy?url=${encodeURIComponent(resolvedUrl)}${suffix}`;
      });

      // 3. Handle relative URLs (lines that don't start with # and aren't already proxied)
      const lines = body.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('/api/stream/proxy') && !trimmed.startsWith('http')) {
          try {
            const resolved = new URL(trimmed, manifestUrl).href;
            return `/api/stream/proxy?url=${encodeURIComponent(resolved)}`;
          } catch (e) {
            return line;
          }
        }
        return line;
      });
      body = rewrittenLines.join('\n');
      
      res.setHeader('Content-Type', 'application/x-mpegURL');
      return res.send(body);
    } else if (isKey) {
      // Binary key file — must forward it with correct headers
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': animepahe.Config.userAgent,
          'Referer': referer,
          'Origin': 'https://kwik.cx',
          'Cookie': cookies,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        }
      });
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.send(Buffer.from(response.data));
    } else {
      // Stream segments directly (efficient!)
      const response = await axios.get(url, {
        responseType: 'stream',
        headers: {
          'User-Agent': animepahe.Config.userAgent,
          'Referer': referer,
          'Origin': 'https://kwik.cx',
          'Cookie': cookies,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        }
      });

      // Force video/MP2T for ANY segment that isn't a manifest/key
      // This solves the issue where some CDNs (uwucdn) serve .jpg segments
      // with image/jpeg mime types, which breaks the video player.
      res.setHeader('Content-Type', 'video/MP2T');
      
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      if (response.headers['cache-control']) {
        res.setHeader('Cache-Control', response.headers['cache-control']);
      }
      
      response.data.pipe(res);
    }
  } catch (err) {
    console.error('Proxy error for URL:', req.query.url, err.message);
    res.status(500).json({ error: 'Failed to proxy media segment' });
  }
});

// OPTIONS preflight for CORS
router.options('/proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
});

// GET /api/stream/:animeSession/:epSession
// Returns { sources: [ { quality, url } ] }
// m3u8 URLs are time-limited + IP-bound — never cache, always resolve fresh
router.get('/:animeSession/:epSession', async (req, res, next) => {
  try {
    const { animeSession, epSession } = req.params;
    const { quality = '1080' } = req.query; // Fix 3 — prioritized quality

    const cacheKey = `${animeSession}-${epSession}-${quality}`;
    const cached = getCachedStream(cacheKey);
    if (cached) return res.json(cached);

    // Pass false to skip download links — faster response for streaming
    const data = await animepahe.getStreamingLinks(animeSession, epSession, false);
    
    // Fix 3 — only extract the 1 quality needed (highest prioritized)
    if (data.sources && data.sources.length > 0) {
      const preferred = data.sources.find(s => s.resolution === quality) || 
                        data.sources.find(s => s.resolution === '720') ||
                        data.sources[0];
      
      data.sources = [preferred];
    }

    // Cache the resolved links for 20 minutes
    streamCache.set(cacheKey, { timestamp: Date.now(), data });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;