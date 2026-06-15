const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/progress/summary
// Returns the most recent progress entry for each series, ordered by last watched
router.get('/summary', (req, res, next) => {
  try {
    const list = db.prepare(`
      SELECT p.*
      FROM progress p
      INNER JOIN (
        SELECT series_session, MAX(watched_at) as max_watched
        FROM progress
        GROUP BY series_session
      ) latest ON p.series_session = latest.series_session AND p.watched_at = latest.max_watched
      ORDER BY p.watched_at DESC
      LIMIT 12
    `).all();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/progress/:seriesSession
router.get('/:seriesSession', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM progress WHERE series_session = ?'
    ).all(req.params.seriesSession);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/progress
router.post('/', (req, res, next) => {
  try {
    const {
      series_session,
      episode_num,
      ep_session,
      anime_session,
      title,
      poster,
      position_sec,
      completed
    } = req.body;

    if (!series_session || episode_num === undefined || !ep_session || !anime_session) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.prepare(`
      INSERT INTO progress (series_session, episode_num, ep_session, anime_session, title, poster, position_sec, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(series_session, episode_num)
      DO UPDATE SET position_sec = excluded.position_sec,
                    completed    = excluded.completed,
                    watched_at   = CURRENT_TIMESTAMP,
                    title        = COALESCE(excluded.title, title),
                    poster       = COALESCE(excluded.poster, poster)
    `).run(series_session, episode_num, ep_session, anime_session, title, poster, position_sec, completed);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
