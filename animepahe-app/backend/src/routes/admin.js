const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const COOKIES_PATH = path.join('/tmp', 'cookies.json');

// POST /api/admin/cookies
// Body: { cookies: "cf_clearance=abc; __ddg1_=xyz" }
// Lets you manually inject cookies from your browser so AnimePahe works
// when the automated Playwright bypass fails.
router.post('/cookies', async (req, res) => {
  const { cookies } = req.body;
  if (!cookies || typeof cookies !== 'string' || !cookies.trim()) {
    return res.status(400).json({ error: 'cookies field required (cookie header string)' });
  }

  let cleanCookies = cookies.trim();
  // Remove surrounding quotes if present
  if ((cleanCookies.startsWith("'") && cleanCookies.endsWith("'")) ||
      (cleanCookies.startsWith('"') && cleanCookies.endsWith('"'))) {
    cleanCookies = cleanCookies.slice(1, -1).trim();
  }

  // Strip "Cookie: " or "cookie: " prefix if present
  if (cleanCookies.toLowerCase().startsWith('cookie:')) {
    cleanCookies = cleanCookies.substring(7).trim();
  }

  const parsed = cleanCookies.split(';').map(c => {
    const eqIdx = c.indexOf('=');
    if (eqIdx === -1) return null;
    return { name: c.slice(0, eqIdx).trim(), value: c.slice(eqIdx + 1).trim() };
  }).filter(Boolean);

  if (parsed.length === 0) {
    return res.status(400).json({ error: 'No valid cookies parsed' });
  }

  const cookieData = { timestamp: Date.now(), cookies: parsed };

  try {
    await fs.mkdir(path.dirname(COOKIES_PATH), { recursive: true });
    await fs.writeFile(COOKIES_PATH, JSON.stringify(cookieData, null, 2));
    
    // Also inject into library immediately
    const animepahe = require('animepahe-api');
    const cookieHeader = parsed.map(c => `${c.name}=${c.value}`).join('; ');
    animepahe.Config.setCookies(cookieHeader);

    res.json({ ok: true, injected: parsed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/cookies — check current cookie age
router.get('/cookies', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(COOKIES_PATH, 'utf8'));
    const ageMs = Date.now() - data.timestamp;
    const ageDays = (ageMs / 86400000).toFixed(1);
    res.json({ ok: true, cookieCount: data.cookies.length, ageDays: Number(ageDays) });
  } catch {
    res.json({ ok: false, message: 'No cookies file found — browser bypass needed' });
  }
});

// DELETE /api/admin/cookies — force cookie refresh on next request
router.delete('/cookies', async (req, res) => {
  try {
    await fs.unlink(COOKIES_PATH);
    res.json({ ok: true, message: 'Cookies cleared — will refresh on next request' });
  } catch {
    res.json({ ok: true, message: 'Nothing to clear' });
  }
});

module.exports = router;
