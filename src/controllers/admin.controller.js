var express = require('express');
var router = express.Router();
const { findBestProfession, findBestClients } = require('../services/admin.service');
const { validateStartEndDate } = require('../middleware/validateStartEndDate');

/**
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 */
router.get('/best-profession', validateStartEndDate, async (req, res) => {
  const { start, end } = req.query;

  try {
    const bestProfession = await findBestProfession(start, end);
    res.json(bestProfession);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * returns the clients the paid the most for jobs in the query time period.
 * limit query parameter should be applied, default limit is 2.
 */
router.get('/best-clients', validateStartEndDate, async (req, res) => {
  const { start, end, limit } = req.query;
  const queryLimit = parseInt(limit) || 2;

  try {
    const bestClients = await findBestClients(start, end, queryLimit);
    return res.json(bestClients);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
