const { sequelize, Profile, Contract, Job } = require('../models');
const { Op } = require('sequelize');
const { incrementProfileBalance, decrementProfileBalance } = require('./balances.service');

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

async function findOneJob(jobId, profileId, transaction) {
  const job = await Job.findOne({
    include: [
      {
        model: Contract,
        where: {
          ClientId: profileId,
        },
      },
    ],
    where: {
      id: jobId,
      paid: null, // we only want unpaid jobs
    },
    transaction,
    lock: true,
  });

  if (!job) {
    throw new Error('job not found');
  }
}

function validateSufficientFunds(profile, price) {
  if (profile.balance < price) {
    throw new Error('insufficient funds');
  }
}

async function findContractor(contractId, transaction) {
  // find contractor's profile
  const contractor = await Profile.findOne({
    include: {
      model: Contract,
      as: 'Contractor',
      where: { id: contractId },
    },
    transaction,
    lock: true,
  });

  if (!contractor) {
    throw new Error('contractor not found');
  }

  return contractor;
}

async function tagJobAsPaid(jobId, transaction) {
  // update job payment info
  return await Job.update(
    {
      paid: true,
      paymentDate: new Date().toISOString(), // timestamp
    },
    { where: { id: jobId }, transaction, lock: true },
  );
}

async function payForJob(profile, jobId) {
  // transaction to update profiles' balances and job payment info
  return await sequelize.transaction(async (t) => {
    const job = await findOneJob(jobId, profile.id, t);

    validateSufficientFunds(profile, job.price);

    const contractor = await findContractor(job.ContractId, t);

    await decrementProfileBalance(profile.id, job.price, t);

    await tagJobAsPaid(job.id, t);

    await incrementProfileBalance(contractor.id, job.price, t);
  });
}

module.exports = {
  getUnpaidJobs,
  payForJob,
  findOneJob,
  validateSufficientFunds,
  findContractor,
  tagJobAsPaid,
};
