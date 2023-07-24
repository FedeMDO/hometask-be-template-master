var express = require('express');
var router = express.Router();
const { sequelize } = require('../models');

const { Op } = require('sequelize');
const { depositMoney } = require('../services/balances.service');

/**
 * Deposits money into the the the balance of a client,
 * a client can't deposit more than 25% his total of jobs to pay.
 * (at the deposit moment)
 */
router.post('/deposit/:userId', async (req, res) => {
  const { userId } = req.params;
  let { depositAmount } = req.body;

  depositAmount = Number(depositAmount);

  if (isNaN(depositAmount) || isNaN(userId) || depositAmount <= 0) {
    return res.status(400).json({ error: 'invalid parameters' });
  }

  try {
    await depositMoney(userId, depositAmount);
    return res.sendStatus(200);
  } catch (error) {
    // If the execution reaches this line, an error occurred.
    // The transaction has already been rolled back automatically by Sequelize!
    return res.status(500).json(error.message);
  }
});

module.exports = router;
