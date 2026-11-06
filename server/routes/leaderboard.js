const express = require('express');
const db = require('../db/database');

const router = express.Router();

/**
 * GET /api/leaderboard
 * Returns top 10 scores
 */
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const leaderboard = db.getLeaderboard(Math.min(limit, 50));

    return res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
