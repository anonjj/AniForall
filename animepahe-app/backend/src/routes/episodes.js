const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/episodes/:session?sort=episode_asc&page=1
router.get('/:session', async (req, res, next) => {
  try {
    const { sort = 'episode_asc', page = 1 } = req.query;
    const ALLOWED_SORTS = ['episode_asc', 'episode_desc'];
    const sortVal = ALLOWED_SORTS.includes(sort) ? sort : 'episode_asc';
    const data = await animepahe.getReleases(req.params.session, sortVal, parseInt(page, 10));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
