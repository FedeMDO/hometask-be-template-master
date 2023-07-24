const { sequelize, Profile, Contract, Job } = require('../models');
const { Op } = require('sequelize');

async function depositMoney(userId, depositAmount) {
  return await sequelize.transaction(async (t) => {
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
}

module.exports = {
  depositMoney,
};
