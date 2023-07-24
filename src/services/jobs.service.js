const { sequelize, Profile, Contract, Job } = require('../models');
const { Op } = require('sequelize');

async function getUnpaidJobs(profileId) {
  return await Job.findAll({
    include: [
      {
        model: Contract,
        attributes: [], // we don't need to send any attributes from Contract
        where: {
          // I assume 'active contracts only' means 'in_progress'
          status: 'in_progress',
          // contract must belong to profile
          [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
        },
      },
    ],
    where: {
      paid: null, // seedDb.js doesn't initialize this field to false, so its mapped to NULL in DB
    },
  });
}

async function payForJob(profile, jobId) {
  // transaction to update profiles' balances and job payment info
  return await sequelize.transaction(async (t) => {
    const withTransactionAndLock = {
      transaction: t,
      lock: true,
    };

    const job = await Job.findOne({
      include: [
        {
          model: Contract,
          where: {
            ClientId: profile.id,
          },
        },
      ],
      where: {
        id: jobId,
        paid: null, // we only want unpaid jobs
      },
      ...withTransactionAndLock,
    });

    if (!job) {
      return res.sendStatus(404);
    }

    if (profile.balance < job.price) {
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
      where: { id: profile.id },
      ...withTransactionAndLock,
    });

    // update job payment info
    await Job.update(
      {
        paid: true,
        paymentDate: new Date().toISOString(), // timestamp
      },
      { where: { id: jobId }, ...withTransactionAndLock },
    );

    // increment contractor's balance
    await Profile.increment('balance', {
      by: job.price,
      where: { id: contractor.id },
      ...withTransactionAndLock,
    });
  });
}

module.exports = {
  getUnpaidJobs,
  payForJob,
};
