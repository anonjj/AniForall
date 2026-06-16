const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { searchAnilistByTitle } = require('../services/anilist');

const STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

router.get('/:session', async (req, res) => {
  const { session } = req.params;
  const { title } = req.query;

  if (!title) return res.json({ fallback: true });

  try {
    // Cache-first
    const cached = db.prepare('SELECT * FROM anime_metadata WHERE session = ?').get(session);
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < STALE_MS) {
        return res.json({
          session:      cached.session,
          anilist_id:   cached.anilist_id,
          cover_image:  cached.cover_image,
          banner_image: cached.banner_image,
          accent_color: cached.accent_color,
          score:        cached.score,
          genres:       cached.genres ? cached.genres.split(',') : [],
        });
      }
    }

    // Fetch from AniList
    const data = await searchAnilistByTitle(title);
    if (!data) return res.json({ fallback: true });

    db.prepare(`
      INSERT INTO anime_metadata (session, anilist_id, cover_image, banner_image, accent_color, score, genres, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(session) DO UPDATE SET
        anilist_id   = excluded.anilist_id,
        cover_image  = excluded.cover_image,
        banner_image = excluded.banner_image,
        accent_color = excluded.accent_color,
        score        = excluded.score,
        genres       = excluded.genres,
        fetched_at   = CURRENT_TIMESTAMP
    `).run(session, data.anilist_id, data.cover_image, data.banner_image, data.accent_color, data.score, data.genres);

    return res.json({
      session,
      anilist_id:   data.anilist_id,
      cover_image:  data.cover_image,
      banner_image: data.banner_image,
      accent_color: data.accent_color,
      score:        data.score,
      genres:       data.genres ? data.genres.split(',') : [],
    });
  } catch (err) {
    console.error('[metadata] AniList fetch error:', err.message);
    return res.json({ fallback: true });
  }
});

module.exports = router;
