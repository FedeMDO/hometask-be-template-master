var express = require('express');
var router = express.Router();
const { sequelize } = require('../models');

const { getProfile } = require('../middleware/getProfile');
const { Op } = require('sequelize');

/**
 * Get all unpaid jobs for a user (either a client or contractor), active contracts only.
 */
router.get('/unpaid', getProfile, async (req, res) => {
  const { Job, Contract } = req.app.get('models');
  const userProfileId = req.profile.id;

  const unpaidJobs = await Job.findAll({
    include: [
      {
        model: Contract,
        attributes: [], // we don't need to send any attributes from Contract
        where: {
          // I assume 'active contracts only' means 'in_progress'
          status: 'in_progress',
          // contract must belong to profile
          [Op.or]: [{ ContractorId: userProfileId }, { ClientId: userProfileId }],
        },
      },
    ],
    where: {
      paid: null, // seedDb.js doesn't initialize this field to false, so its mapped to NULL in DB
    },
  });

  res.json(unpaidJobs);
});

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay.
 * The amount should be moved from the client's balance to the contractor balance.
 */
router.post('/:job_id/pay', getProfile, async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { job_id } = req.params;

  // transaction to update profiles' balances and job payment info
  try {
    await sequelize.transaction(async (t) => {
      const withTransactionAndLock = {
        transaction: t,
        lock: true,
      };

      const job = await Job.findOne({
        include: [
          {
            model: Contract,
            where: {
              ClientId: req.profile.id,
            },
          },
        ],
        where: {
          id: job_id,
          paid: null, // we only want unpaid jobs
        },
        ...withTransactionAndLock,
      });

      if (!job) {
        return res.sendStatus(404);
      }

      if (req.profile.balance < job.price) {
        return res.status(400).json({
          message: 'insufficient funds',
        });
      }

      // find contractor's profile
      const contractor = await Profile.findOne({
        include: {
          model: Contract,
          as: 'Contractor',
          where: { id: job.ContractId },
        },
        ...withTransactionAndLock,
      });

      // decrement client's balance
      await Profile.decrement('balance', {
        by: job.price,
        where: { id: req.profile.id },
        ...withTransactionAndLock,
      });

      // update job payment info
      await Job.update(
        {
          paid: true,
          paymentDate: new Date().toISOString(), // timestamp
        },
        { where: { id: job_id }, ...withTransactionAndLock },
      );

      // increment contractor's balance
      await Profile.increment('balance', {
        by: job.price,
        where: { id: contractor.id },
        ...withTransactionAndLock,
      });
    });
    // If the execution reaches this line, the transaction has been committed successfully
    return res.sendStatus(200);
  } catch (error) {
    // If the execution reaches this line, an error occurred.
    // The transaction has already been rolled back automatically by Sequelize!
    return res.sendStatus(500);
  }
});

module.exports = router;
