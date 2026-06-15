const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/watchlist
router.get('/', (req, res, next) => {
  try {
    const list = db.prepare('SELECT * FROM watchlist ORDER BY added_at DESC').all();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist
router.post('/', (req, res, next) => {
  try {
    const { session, title, poster, status = 'plan_to_watch' } = req.body;
    if (!session || !title) {
      return res.status(400).json({ error: 'session and title are required' });
    }
    const VALID_STATUSES = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare(`
      INSERT OR IGNORE INTO watchlist (session, title, poster, status) VALUES (?, ?, ?, ?)
    `).run(session, title, poster, status);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/watchlist/:session
router.patch('/:session', (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }
    const VALID_STATUSES = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = db.prepare('UPDATE watchlist SET status = ? WHERE session = ?')
      .run(status, req.params.session);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Watchlist entry not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:session
router.delete('/:session', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM watchlist WHERE session = ?').run(req.params.session);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Watchlist entry not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
