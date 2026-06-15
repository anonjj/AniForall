const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/series/:session
router.get('/:session', async (req, res, next) => {
  try {
    const data = await animepahe.getInfo(req.params.session);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
