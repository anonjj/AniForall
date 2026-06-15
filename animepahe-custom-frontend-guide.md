# AnimePahe Custom Frontend — Complete Build Guide

> **Purpose:** This document is a self-contained instruction guide for building a personal,
> locally-hosted anime frontend that uses AnimePahe as its data/stream source with a
> custom UI and personal features (watchlist, progress tracking, better player, etc.).
> Feed this document back to Claude at the start of any session to resume work.

---

## Project Goal

Build a **locally-run web app** (not publicly hosted) with:
- AnimePahe as the data + stream backend
- A significantly better UI than the stock AnimePahe site
- Personal features: watchlist, watch progress, episode status indicators
- A proper video player with HLS support, keyboard shortcuts, speed control
- A local SQLite database for all personal data

**Strictly personal use. Do not deploy publicly.**

---

## Key Decision: Using `ElijahCodes12345/animepahe-api` as a Library

Rather than writing our own AnimePahe scraper and Kwik extractor from scratch,
we use the open-source `animepahe-api` library (MIT licensed) directly.

**Repo:** https://github.com/ElijahCodes12345/animepahe-api

This library handles:
- All AnimePahe API calls (search, series info, episode list, stream links)
- Kwik `.m3u8` extraction (the hardest part — already solved)
- Cloudflare bypass via **Playwright** headless Chromium
- Automatic cookie management

Install as a Node.js library:
```bash
npm install github:ElijahCodes12345/animepahe-api
npx playwright install chromium   # must run this separately — installs ~300MB Chromium
```

Library API surface we use:
```js
const animepahe = require('animepahe-api');

await animepahe.search('bleach');
// → { data: [ { id, title, type, episodes, status, year, score, poster, session } ] }

await animepahe.getInfo('session-id');
// → { id, title, description, episodes, status, genres[], poster, ... }

await animepahe.getReleases('session-id', 'episode_asc', 1);
// → { total, per_page, current_page, data: [ { id, episode, snapshot, session } ] }

await animepahe.getStreamingLinks('anime-session', 'episode-session');
// → { sources: [ { quality, url } ], downloads: [ ... ] }
// Pass downloads=false as 3rd arg for faster streaming-only response
```

> **Note:** `.m3u8` URLs returned by `getStreamingLinks` are time-limited and IP-bound.
> Never cache them. Resolve fresh on every play.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| AnimePahe data + streams | `animepahe-api` npm library | Handles scraping, Cloudflare bypass, Kwik extraction |
| Cloudflare bypass | Playwright + Chromium (bundled in library) | AnimePahe blocks plain axios requests |
| Backend | Node.js + Express | Thin proxy layer; wraps library, serves personal data |
| Frontend | React + Vite | Component-based, hot reload, fast |
| Styling | Tailwind CSS | Utility-first, no fighting with stylesheets |
| Video Player | Plyr + HLS.js | Plyr UI + HLS.js for `.m3u8` stream support |
| Local Database | SQLite via `better-sqlite3` | Zero-config, file-based, sync API |
| Dev tooling | concurrently, nodemon | Run frontend + backend together in one terminal |

---

## Project Structure

```
animepahe-app/
├── backend/
│   ├── src/
│   │   ├── index.js               # Express entry point
│   │   ├── routes/
│   │   │   ├── search.js          # GET /api/search?q=
│   │   │   ├── series.js          # GET /api/series/:session
│   │   │   ├── episodes.js        # GET /api/episodes/:session?page=&sort=
│   │   │   ├── stream.js          # GET /api/stream/:animeSession/:epSession
│   │   │   ├── watchlist.js       # CRUD /api/watchlist
│   │   │   └── progress.js        # CRUD /api/progress
│   │   └── db/
│   │       ├── database.js        # SQLite connection + init
│   │       └── schema.sql         # Table definitions
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── SearchBar.jsx
│   │   │   ├── AnimeCard.jsx
│   │   │   ├── EpisodeGrid.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   └── WatchlistButton.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Search landing page
│   │   │   ├── SeriesPage.jsx     # Series info + episode list
│   │   │   └── WatchPage.jsx      # Video player page
│   │   ├── hooks/
│   │   │   ├── useSearch.js
│   │   │   ├── useSeries.js
│   │   │   └── useProgress.js
│   │   └── api/
│   │       └── client.js          # Axios instance pointed at backend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── package.json                   # Root: runs both with concurrently
```

> **Removed vs original plan:** `services/animepahe.js` and `services/kwik.js` are gone.
> The library replaces both entirely.

---

## Phase 1 — ~~API Investigation~~ SKIPPED

**This phase is no longer needed.** The `animepahe-api` library has already reverse-engineered
all AnimePahe endpoints and the Kwik extractor. No manual DevTools recon required.

The library also handles Cloudflare's JS challenge via Playwright, which plain axios
requests cannot bypass. Attempting to replicate this manually would be significant work
with no benefit given the library already exists and is MIT licensed.

---

## Phase 2 — Backend Proxy

### 2.1 Setup

```bash
mkdir animepahe-app && cd animepahe-app
mkdir backend && cd backend
npm init -y
npm install express better-sqlite3 cors dotenv
npm install github:ElijahCodes12345/animepahe-api
npm install --save-dev nodemon
npx playwright install chromium
```

### 2.2 `package.json` scripts (inside `/backend`)

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

### 2.3 `.env` file

```
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
```

> The library manages `BASE_URL` internally (currently `https://animepahe.pw`).
> If AnimePahe changes domains, update the library or set `BASE_URL` in `.env`.

### 2.4 `src/index.js` — Express entry point

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(express.json());

app.use('/api/search',    require('./routes/search'));
app.use('/api/series',    require('./routes/series'));
app.use('/api/episodes',  require('./routes/episodes'));
app.use('/api/stream',    require('./routes/stream'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/progress',  require('./routes/progress'));

app.listen(process.env.PORT, () =>
  console.log(`Backend running on :${process.env.PORT}`)
);
```

### 2.5 `src/routes/search.js`

```js
const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/search?q=naruto&page=1
router.get('/', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.status(400).json({ error: 'q param required' });
    const data = await animepahe.search(q, page);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 2.6 `src/routes/series.js`

```js
const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/series/:session
router.get('/:session', async (req, res) => {
  try {
    const data = await animepahe.getInfo(req.params.session);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 2.7 `src/routes/episodes.js`

```js
const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/episodes/:session?sort=episode_asc&page=1
router.get('/:session', async (req, res) => {
  try {
    const { sort = 'episode_asc', page = 1 } = req.query;
    const data = await animepahe.getReleases(req.params.session, sort, page);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 2.8 `src/routes/stream.js`

```js
const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/stream/:animeSession/:epSession
// Returns { sources: [ { quality, url } ] }
// m3u8 URLs are time-limited + IP-bound — never cache, always resolve fresh
router.get('/:animeSession/:epSession', async (req, res) => {
  try {
    const { animeSession, epSession } = req.params;
    // Pass false to skip download links — faster response for streaming
    const data = await animepahe.getStreamingLinks(animeSession, epSession, false);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 2.9 Testing Routes (Postman / curl)

After starting the backend (`npm run dev`), test each route before touching the frontend:

```bash
# Search
curl "http://localhost:3001/api/search?q=bleach"

# Series info — use a session ID from search results
curl "http://localhost:3001/api/series/PUT_SESSION_HERE"

# Episodes — page 1
curl "http://localhost:3001/api/episodes/PUT_SESSION_HERE?page=1"

# Stream — use animeSession + epSession from episodes response
curl "http://localhost:3001/api/stream/ANIME_SESSION/EP_SESSION"
```

All 4 must return valid JSON before moving to Phase 3. The stream route should return
an object with a `sources` array containing at least one `{ quality, url }` entry
where `url` ends in `.m3u8`.

---

## Phase 3 — Frontend

### 3.1 Setup

```bash
cd ../  # back to animepahe-app root
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios react-router-dom @heroicons/react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.2 `vite.config.js` — proxy backend during dev

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

### 3.3 `tailwind.config.js`

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3.4 `src/api/client.js`

```js
import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export const searchAnime    = (q, page = 1) => client.get(`/search?q=${encodeURIComponent(q)}&page=${page}`);
export const getSeries      = (session)     => client.get(`/series/${session}`);
export const getEpisodes    = (session, sort = 'episode_asc', page = 1) =>
                                               client.get(`/episodes/${session}?sort=${sort}&page=${page}`);
export const getStream      = (animeSession, epSession) =>
                                               client.get(`/stream/${animeSession}/${epSession}`);
export const getWatchlist   = ()            => client.get('/watchlist');
export const addToWatchlist = (data)        => client.post('/watchlist', data);
export const updateWatchlistStatus = (session, status) =>
                                               client.patch(`/watchlist/${session}`, { status });
export const removeFromWatchlist = (session) => client.delete(`/watchlist/${session}`);
export const getProgress    = (seriesSession) => client.get(`/progress/${seriesSession}`);
export const updateProgress = (data)          => client.post('/progress', data);
```

### 3.5 `src/App.jsx` — Router setup

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home        from './pages/Home';
import SeriesPage  from './pages/SeriesPage';
import WatchPage   from './pages/WatchPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                                              element={<Home />} />
        <Route path="/series/:session"                              element={<SeriesPage />} />
        <Route path="/watch/:animeSession/:epSession/:episodeNum"   element={<WatchPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3.6 Pages Overview

**`Home.jsx`**
- Debounced search bar (400ms delay)
- Results grid: poster thumbnail + title + year + type + episode count
- Watchlist shelf at top if user has items saved

**`SeriesPage.jsx`** — route: `/series/:session`
- Series banner, title, genres, status, synopsis
- Episode grid (paginated, 30 per page) with prev/next page buttons
- Each episode card: thumbnail, episode number, watched/unwatched badge
- "Continue watching" button if progress record exists for this series
- Watchlist toggle button (add/remove + status dropdown)

**`WatchPage.jsx`** — route: `/watch/:animeSession/:epSession/:episodeNum`
- On mount: calls `GET /api/stream/:animeSession/:epSession`
- Feeds resolved `.m3u8` URL into VideoPlayer component
- Prev/Next episode navigation buttons (navigate to adjacent episode URLs)
- Auto-saves progress every 10 seconds (see Phase 5)
- Marks episode complete when playback position > 85% of duration

---

## Phase 4 — Video Player

### 4.1 Install

```bash
cd frontend
npm install hls.js plyr
```

### 4.2 `src/components/VideoPlayer.jsx`

```jsx
import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

export default function VideoPlayer({ streamUrl, startAt = 0, onTimeUpdate, onEnded }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startAt > 0) video.currentTime = startAt;
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = streamUrl;
      video.currentTime = startAt;
    }

    const player = new Plyr(video, {
      controls: [
        'play', 'rewind', 'fast-forward', 'progress',
        'current-time', 'duration', 'mute', 'volume',
        'settings', 'fullscreen'
      ],
      settings: ['speed', 'quality'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
      keyboard: { focused: true, global: true },
    });

    playerRef.current = player;

    video.addEventListener('timeupdate', () => onTimeUpdate?.(video.currentTime, video.duration));
    video.addEventListener('ended', onEnded);

    return () => {
      hlsRef.current?.destroy();
      playerRef.current?.destroy();
    };
  }, [streamUrl]);

  return (
    <div className="w-full aspect-video bg-black">
      <video ref={videoRef} className="w-full h-full" />
    </div>
  );
}
```

### 4.3 Keyboard Shortcuts (Plyr handles natively)

| Key | Action |
|---|---|
| `Space` | Play/Pause |
| `←` / `→` | Seek ±5s |
| `↑` / `↓` | Volume |
| `F` | Fullscreen |
| `M` | Mute |
| `<` / `>` | Speed down/up |

---

## Phase 5 — Persistence Layer (SQLite)

### 5.1 `src/db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS watchlist (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session      TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  poster       TEXT,
  status       TEXT DEFAULT 'watching',
  -- status options: watching | completed | on_hold | dropped | plan_to_watch
  added_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  series_session TEXT NOT NULL,
  episode_num    INTEGER NOT NULL,
  ep_session     TEXT NOT NULL,
  anime_session  TEXT NOT NULL,
  watched_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  position_sec   INTEGER DEFAULT 0,
  completed      INTEGER DEFAULT 0,   -- 0 = in progress, 1 = watched
  UNIQUE(series_session, episode_num)
);
```

### 5.2 `src/db/database.js`

```js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/animepahe.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
```

### 5.3 `src/routes/watchlist.js`

```js
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM watchlist ORDER BY added_at DESC').all());
});

router.post('/', (req, res) => {
  const { session, title, poster, status = 'plan_to_watch' } = req.body;
  db.prepare(`
    INSERT OR IGNORE INTO watchlist (session, title, poster, status) VALUES (?, ?, ?, ?)
  `).run(session, title, poster, status);
  res.json({ ok: true });
});

router.patch('/:session', (req, res) => {
  db.prepare('UPDATE watchlist SET status = ? WHERE session = ?')
    .run(req.body.status, req.params.session);
  res.json({ ok: true });
});

router.delete('/:session', (req, res) => {
  db.prepare('DELETE FROM watchlist WHERE session = ?').run(req.params.session);
  res.json({ ok: true });
});

module.exports = router;
```

### 5.4 `src/routes/progress.js`

```js
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/:seriesSession', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM progress WHERE series_session = ?'
  ).all(req.params.seriesSession);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { series_session, episode_num, ep_session, anime_session, position_sec, completed } = req.body;
  db.prepare(`
    INSERT INTO progress (series_session, episode_num, ep_session, anime_session, position_sec, completed)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(series_session, episode_num)
    DO UPDATE SET position_sec = excluded.position_sec,
                  completed    = excluded.completed,
                  watched_at   = CURRENT_TIMESTAMP
  `).run(series_session, episode_num, ep_session, anime_session, position_sec, completed);
  res.json({ ok: true });
});

module.exports = router;
```

### 5.5 Progress Auto-Save in `WatchPage.jsx`

```js
// Call this inside WatchPage, wired to VideoPlayer's onTimeUpdate prop
const handleTimeUpdate = (currentTime, duration) => {
  setCurrentTime(currentTime);

  // Auto-save every 10 seconds
  if (Math.floor(currentTime) % 10 === 0 && currentTime > 0) {
    updateProgress({
      series_session: seriesSession,   // from URL param
      episode_num:    episodeNum,      // from URL param
      ep_session:     epSession,       // from URL param
      anime_session:  animeSession,    // from URL param
      position_sec:   Math.floor(currentTime),
      completed:      duration > 0 && currentTime / duration > 0.85 ? 1 : 0,
    });
  }
};
```

---

## Phase 6 — Root Dev Setup

### 6.1 Root `package.json`

```json
{
  "name": "animepahe-app",
  "scripts": {
    "dev":      "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "backend":  "npm run dev --prefix backend",
    "frontend": "npm run dev --prefix frontend"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

### 6.2 Running

```bash
# From root
npm install
npm run dev
# → Backend on :3001
# → Frontend on :5173 (open this in browser)
```

---

## Build Order (Follow This Sequence)

```
[ ] 1.  Scaffold folder structure (mkdir backend, run vite for frontend)
[ ] 2.  Set up backend: npm init, install deps, install animepahe-api library
[ ] 3.  Run: npx playwright install chromium  ← do not skip
[ ] 4.  Write index.js + all 4 anime routes (search, series, episodes, stream)
[ ] 5.  Start backend, test all 4 routes with curl/Postman — confirm .m3u8 URLs return
[ ] 6.  Write db/schema.sql + db/database.js
[ ] 7.  Write watchlist.js + progress.js routes, test with curl
[ ] 8.  Scaffold React frontend with Vite, configure Tailwind
[ ] 9.  Write api/client.js + App.jsx with router
[ ] 10. Build Home.jsx (debounced search + results grid)
[ ] 11. Build SeriesPage.jsx (metadata + paginated episode grid)
[ ] 12. Build VideoPlayer.jsx (Plyr + HLS.js)
[ ] 13. Build WatchPage.jsx (fetch stream, render player, prev/next nav)
[ ] 14. Wire up progress auto-save and episode completion (handleTimeUpdate)
[ ] 15. Add watchlist CRUD to SeriesPage and Home watchlist shelf
[ ] 16. Polish: loading spinners, error states, empty states
[ ] 17. Test full end-to-end flow: search → series → episode → watch → progress saved
```

---

## Known Gotchas & Solutions

| Problem | Solution |
|---|---|
| `npx playwright install` forgotten | Playwright throws a clear error; run `npx playwright install chromium` in `/backend` |
| AnimePahe domain changes | Library manages the base URL internally; update the library if needed, or set `BASE_URL` in `.env` |
| `.m3u8` URL expired / won't play | Expected — never cache stream URLs; always call `/api/stream/...` fresh on each play |
| Library cold start is slow (2–5s) | Playwright spins up a headless browser on first request; subsequent calls reuse it |
| CORS errors in browser | Confirm backend CORS `origin` matches exactly `http://localhost:5173` |
| Some episodes return 0 sources | AnimePahe occasionally has broken episodes; show a "source unavailable" message, don't crash |
| Pagination — 500+ episode series | Episode grid must have page buttons; never fetch all pages at once |
| Episode session vs series session confusion | Episode `session` comes from the releases list. Series `session` comes from search results. Keep variable names explicit in every file. |
| HLS.js fails silently | Open the raw `.m3u8` URL in VLC to verify it works before debugging the player code |
| SQLite UNIQUE constraint error on progress | Use `ON CONFLICT ... DO UPDATE` (upsert) — already in the schema above |

---

## Feature Additions (Post-MVP)

- [ ] Currently airing shelf on Home page (`GET /api/airing` from the library)
- [ ] Continue watching shelf on Home page (query progress table for incomplete episodes)
- [ ] Search history (localStorage, no backend needed)
- [ ] Episode skip intro button (manual timestamp stored per series in SQLite)
- [ ] Quality selector in player UI (library returns multiple `sources` qualities)
- [ ] Export watchlist as JSON backup
- [ ] Dark/Light mode toggle
- [ ] Mobile-responsive layout

---

## Session Resume Instructions

When resuming work in a new Claude session:

1. Paste this document as context
2. State which step number you're on from the Build Order checklist
3. Share any error messages or relevant code you need help debugging
4. Specify which file you're currently working on

Claude will pick up from exactly where you left off.
