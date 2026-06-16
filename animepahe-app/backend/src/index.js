require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const animepahe = require('animepahe-api');

// Prevent process from crashing on unhandled promise rejections (e.g. from background scraper routines)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`[Uncaught Exception] Caught exception: ${err}\nOrigin: ${origin}`);
});

let lastCookiesContent = '';

function importLocalCookies() {
  const jsonPath = path.join('/tmp', 'cookies.json');
  const txtPaths = [
    path.join(__dirname, '../cookies.txt'),
    path.join(__dirname, 'cookies.txt'),
    path.join(process.cwd(), 'cookies.txt'),
    path.join(process.cwd(), 'backend/cookies.txt'),
    path.join(process.cwd(), 'backend/src/cookies.txt')
  ];
  const txtPath = txtPaths.find(p => fs.existsSync(p));
  
  try {
    let latestCookies = null;
    let source = '';

    // 1. Try loading from JSON (Manual injection via Admin Page)
    if (fs.existsSync(jsonPath)) {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (jsonData && jsonData.cookies) {
        latestCookies = jsonData.cookies;
        source = 'cookies.json (Admin Page)';
      }
    }

    // 2. Fallback to txt file if JSON is missing or if txt is newer
    if (txtPath) {
      const txtStat = fs.statSync(txtPath);
      const jsonStat = fs.existsSync(jsonPath) ? fs.statSync(jsonPath) : { mtimeMs: 0 };

      // If txt is newer than the last manual injection, use it
      if (txtStat.mtimeMs > jsonStat.mtimeMs || !latestCookies) {
        const rawCookies = fs.readFileSync(txtPath, 'utf8').trim();
        if (rawCookies && rawCookies !== lastCookiesContent) {
          lastCookiesContent = rawCookies;
          let parsed = parseCookieString(rawCookies);
          if (parsed.length > 0) {
            latestCookies = parsed;
            source = `cookies.txt (${path.basename(txtPath)})`;
          }
        }
      }
    }

    if (latestCookies && latestCookies.length > 0) {
      const cookieHeader = latestCookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      // Only update if changed
      if (animepahe.Config.cookies !== cookieHeader) {
        animepahe.Config.setCookies(cookieHeader);
        console.log(`[Cookies] Loaded ${latestCookies.length} cookies from ${source}`);
      }
      return true;
    }
  } catch (err) {
    console.error('[Cookies] Failed to import cookies:', err.message);
  }
  return false;
}

function parseCookieString(raw) {
  let parsedCookies = [];
  // Check if JSON format
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const list = JSON.parse(raw);
      return list.filter(c => c && c.name && c.value !== undefined);
    } catch (e) {}
  }

  // Netscape format
  if (raw.includes('\t') || raw.startsWith('#')) {
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('\t');
      if (parts.length >= 7) {
        parsedCookies.push({ name: parts[5], value: parts[6] });
      }
    }
    if (parsedCookies.length > 0) return parsedCookies;
  }

  // Key-value format
  let clean = raw;
  if (clean.toLowerCase().startsWith('cookie:')) clean = clean.substring(7).trim();
  if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1).trim();

  return clean.split(';').map(part => {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) return null;
    return {
      name: part.substring(0, eqIndex).trim(),
      value: part.substring(eqIndex + 1).trim()
    };
  }).filter(Boolean);
}

// Initialize local cookies
importLocalCookies();

// --- START MONKEY PATCHES ---

// Prevent Strategy 2 (Playwright) from firing and clearing our good cookies
// since it often fails on ARM/Cloudflare anyway.
animepahe.Animepahe.refreshCookies = async function() {
  console.log('[MonkeyPatch] Blocking automatic refresh to preserve manual cookies.');
  return false; 
};

// Problem 1: Serialize kwik.cx requests to avoid Cloudflare 1015 (Rate Limit)
const PlayModel = animepahe.models.PlayModel;
const originalHybrid = PlayModel.processHybridOptimized;

PlayModel.processHybridOptimized = async function(id, episodeId, items) {
  console.log(`[MonkeyPatch] Serializing ${items.length} kwik.cx requests to avoid rate limits...`);
  const results = [];
  for (const item of items) {
    try {
      // Process one at a time with a significant delay
      const sources = await animepahe.Animepahe.scrapeIframe(id, episodeId, item.url);
      results.push(sources.map(s => ({
        ...s,
        embed: item.embed,
        resolution: item.resolution,
        isDub: item.isDub,
        fanSub: item.fanSub,
        isBD: item.isBD || false,
      })));
      // Wait 1 second between items
      if (items.indexOf(item) < items.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`[MonkeyPatch] Failed ${item.resolution}:`, err.message);
      results.push([]);
    }
  }
  return results;
};

// Ensure sequential fallback doesn't make things worse
PlayModel.processSequentialFallback = async () => []; 
// --- END MONKEY PATCHES ---

// Override refreshCookies ...

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(express.json());

// Middleware to import cookies on every API request if cookies.txt changes
app.use((req, res, next) => {
  importLocalCookies();
  
  // Set the scraper's user-agent to match the user's browser user-agent!
  const userAgent = req.headers['user-agent'];
  if (userAgent && !userAgent.includes('node-fetch') && !userAgent.includes('axios') && !userAgent.startsWith('curl/')) {
    console.log(`[Middleware] Mirroring Browser User-Agent: "${userAgent}"`);
    animepahe.Config.userAgent = userAgent;
    
    // Set matching client hints to prevent header mismatch blocks
    animepahe.Config.clientHints = {
      'sec-ch-ua': req.headers['sec-ch-ua'],
      'sec-ch-ua-mobile': req.headers['sec-ch-ua-mobile'],
      'sec-ch-ua-platform': req.headers['sec-ch-ua-platform']
    };
  }
  
  next();
});

// Routes
app.use('/api/search',       require('./routes/search'));
app.use('/api/airing',       require('./routes/airing'));
app.use('/api/series',       require('./routes/series'));
app.use('/api/episodes',     require('./routes/episodes'));
app.use('/api/stream',       require('./routes/stream'));
app.use('/api/image-proxy',  require('./routes/image'));
app.use('/api/watchlist',    require('./routes/watchlist'));
app.use('/api/progress',     require('./routes/progress'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/metadata',     require('./routes/metadata'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
