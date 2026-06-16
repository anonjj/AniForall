require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const animepahe = require('animepahe-api');

let lastCookiesContent = '';

function importLocalCookies() {
  const paths = [
    path.join(__dirname, '../cookies.txt'),
    path.join(__dirname, 'cookies.txt'),
    path.join(process.cwd(), 'cookies.txt'),
    path.join(process.cwd(), 'backend/cookies.txt'),
    path.join(process.cwd(), 'backend/src/cookies.txt')
  ];
  const txtPath = paths.find(p => fs.existsSync(p));
  const jsonPath = path.join('/tmp', 'cookies.json');
  
  if (txtPath) {
    try {
      let rawCookies = fs.readFileSync(txtPath, 'utf8').trim();
      if (rawCookies) {
        if (rawCookies === lastCookiesContent) {
          return true; // Already imported this version
        }
        lastCookiesContent = rawCookies;
        
        let parsedCookies = [];

        // Check if JSON format
        if (rawCookies.startsWith('[') && rawCookies.endsWith(']')) {
          try {
            const list = JSON.parse(rawCookies);
            if (Array.isArray(list)) {
              parsedCookies = list.map(c => {
                if (c && c.name && c.value !== undefined) {
                  return { name: c.name, value: c.value };
                }
                return null;
              }).filter(Boolean);
            }
          } catch (e) {
            console.error('Failed to parse cookies.txt as JSON, trying other formats:', e.message);
          }
        }

        // Check if Netscape format (starts with comments or domain tabs)
        if (parsedCookies.length === 0 && (rawCookies.includes('\t') || rawCookies.startsWith('#'))) {
          const lines = rawCookies.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const parts = trimmed.split('\t');
            if (parts.length >= 7) {
              const name = parts[5];
              const value = parts[6];
              parsedCookies.push({ name, value });
            } else if (parts.length >= 2) {
              const name = parts[parts.length - 2];
              const value = parts[parts.length - 1];
              if (name && value) {
                parsedCookies.push({ name, value });
              }
            }
          }
        }

        // Fallback to key-value string format (e.g. name=val; name2=val2)
        if (parsedCookies.length === 0) {
          // Remove surrounding quotes if present
          if ((rawCookies.startsWith("'") && rawCookies.endsWith("'")) ||
              (rawCookies.startsWith('"') && rawCookies.endsWith('"'))) {
            rawCookies = rawCookies.slice(1, -1).trim();
          }

          // Strip "Cookie: " or "cookie: " prefix if present
          if (rawCookies.toLowerCase().startsWith('cookie:')) {
            rawCookies = rawCookies.substring(7).trim();
          }

          parsedCookies = rawCookies.split(';').map(part => {
            const eqIndex = part.indexOf('=');
            if (eqIndex === -1) return null;
            return {
              name: part.substring(0, eqIndex).trim(),
              value: part.substring(eqIndex + 1).trim()
            };
          }).filter(Boolean);
        }

        if (parsedCookies.length > 0) {
          const cookieData = {
            timestamp: Date.now(),
            cookies: parsedCookies
          };

          fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
          fs.writeFileSync(jsonPath, JSON.stringify(cookieData, null, 2));
          
          // Inject into library
          const cookieHeader = parsedCookies.map(c => `${c.name}=${c.value}`).join('; ');
          animepahe.Config.setCookies(cookieHeader);
          
          console.log(`Successfully imported ${parsedCookies.length} cookies from cookies.txt and injected into Config`);
          return true;
        } else {
          console.warn('No cookies could be parsed from cookies.txt');
        }
      }
    } catch (err) {
      console.error('Failed to import cookies.txt:', err);
    }
  }
  return false;
}

// Initialize local cookies
importLocalCookies();

// --- START MONKEY PATCHES ---
// Problem 1: Serialize kwik.cx requests to avoid Cloudflare 1015 (Rate Limit)
// Problem 3: Prevent Strategy 2 (Playwright) from firing aggressively on Strategy 1 failure
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
app.use('/api/search',    require('./routes/search'));
app.use('/api/airing',    require('./routes/airing'));
app.use('/api/series',    require('./routes/series'));
app.use('/api/episodes',  require('./routes/episodes'));
app.use('/api/stream',    require('./routes/stream'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/progress',  require('./routes/progress'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/metadata',  require('./routes/metadata'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
