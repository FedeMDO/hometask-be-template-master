const { sequelize, Profile, Contract, Job } = require('../models');
const { Op } = require('sequelize');

async function getUserDebt(userId, transaction) {
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
    transaction,
    lock: true,
  });

  if (!jobsDebt) {
    throw new Error('no jobs to pay');
  }

  const debt = jobsDebt.toJSON();

  return debt;
}

async function incrementProfileBalance(userId, amount, transaction) {
  return await Profile.increment('balance', {
    by: amount,
    where: { id: userId },
    transaction,
    lock: true,
  });
}

function checkValidDepositAmount(totalDebt, depositAmount) {
  // a client can't deposit more than 25% his total of 'jobs to pay'
  // round up to the nearest integer
  const maximumAmount = Math.ceil(totalDebt * 0.25);

  if (depositAmount > maximumAmount) {
    // rollback is managed by sequelize
    throw new Error(`depositAmount must be less or equal than ${maximumAmount}`);
  }
}

async function depositMoney(userId, depositAmount) {
  return await sequelize.transaction(async (t) => {
    const debt = await getUserDebt(userId, t);
    checkValidDepositAmount(debt.total_debt, depositAmount);
    await incrementProfileBalance(userId, depositAmount, t);
  });
}

module.exports = {
  depositMoney,
  getUserDebt,
  incrementProfileBalance,
  checkValidDepositAmount,
};
