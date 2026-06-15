const express = require('express');
const router = express.Router();
const db = require('../db/database');

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
      position_sec,
      completed
    } = req.body;

    if (!series_session || episode_num === undefined || !ep_session || !anime_session) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.prepare(`
      INSERT INTO progress (series_session, episode_num, ep_session, anime_session, position_sec, completed)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(series_session, episode_num)
      DO UPDATE SET position_sec = excluded.position_sec,
                    completed    = excluded.completed,
                    watched_at   = CURRENT_TIMESTAMP
    `).run(series_session, episode_num, ep_session, anime_session, position_sec, completed);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
