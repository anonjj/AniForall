const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/search?q=naruto&page=1
router.get('/', async (req, res, next) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.status(400).json({ error: 'q param required' });
    const data = await animepahe.search(q, parseInt(page, 10));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
