const express = require('express');
const router = express.Router();
const animepahe = require('animepahe-api');

// GET /api/airing?page=1
router.get('/', async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const data = await animepahe.getAiring(page);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
