var express = require('express');
var router = express.Router();
const { sequelize } = require('../model');

const { Op } = require('sequelize');

/**
 * Deposits money into the the the balance of a client,
 * a client can't deposit more than 25% his total of jobs to pay.
 * (at the deposit moment)
 */
router.post('/deposit/:userId', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { userId } = req.params;
  let { depositAmount } = req.body;

  depositAmount = Number(depositAmount);

  if (isNaN(depositAmount) || isNaN(userId) || depositAmount <= 0) {
    return res.status(400).json({ error: 'invalid parameters' });
  }

  try {
    await sequelize.transaction(async (t) => {
      const withTransactionAndLock = {
        transaction: t,
        lock: true,
      };

      // sum job debt ('jobs to pay')
      const jobsDebt = await Job.findOne({
        include: {
          model: Contract,
          where: {
            ClientId: userId,
            status: {
              [Op.ne]: 'terminated', // only 'new' and 'in_progress' contracts
            },
          },
        },
        attributes: [[sequelize.fn('sum', sequelize.col('price')), 'total_debt']],
        where: {
          paid: null,
        },
        ...withTransactionAndLock,
      });

      if (!jobsDebt) {
        throw new Error('no jobs to pay');
      }

      const debt = jobsDebt.toJSON();

      // a client can't deposit more than 25% his total of 'jobs to pay'
      // round up to the nearest integer
      const maximumAmount = Math.ceil(debt.total_debt * 0.25);

      if (depositAmount > maximumAmount) {
        // rollback is managed by sequelize
        throw new Error(`depositAmount must be less or equal than ${maximumAmount}`);
      }

      // increment client's balance
      await Profile.increment('balance', {
        by: depositAmount,
        where: { id: userId },
        ...withTransactionAndLock,
      });
    });

    // If the execution reaches this line, the transaction has been committed successfully
    return res.sendStatus(200);
  } catch (error) {
    // If the execution reaches this line, an error occurred.
    // The transaction has already been rolled back automatically by Sequelize!
    return res.status(500).json(error.message);
  }
});

module.exports = router;
