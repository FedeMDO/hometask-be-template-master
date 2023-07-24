const {
  getUserDebt,
  incrementProfileBalance,
  checkValidDepositAmount,
  decrementProfileBalance,
} = require('./balances.service');
const { Op } = require('sequelize');

// mock the sequelize models with jest
jest.mock('../models', () => {
  return {
    Profile: {
      increment: jest.fn(),
      decrement: jest.fn(),
    },
    Contract: {},
    Job: {
      // return a job with random values
      findOne: jest.fn(),
    },
    sequelize: {
      transaction: jest.fn(),
      col: jest.fn(),
      fn: jest.fn(),
    },
  };
});

describe('getUserDebt', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Job.findOne with the correct parameters', async () => {
    // spy on findOne
    const { Job, sequelize, Contract } = require('../models');
    jest.spyOn(Job, 'findOne').mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({}),
    });

    const userId = 1;
    const transaction = { test: 'test' };

    await getUserDebt(userId, transaction);

    expect(Job.findOne).toHaveBeenCalledWith({
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
  });

  it('should throw error if there are no jobs to pay', async () => {
    const { Job } = require('../models');
    jest.spyOn(Job, 'findOne').mockResolvedValue(null);

    const userId = 1;
    const transaction = { test: 'test' };

    await expect(getUserDebt(userId, transaction)).rejects.toThrowError();
  });
});

describe('incrementProfileBalance', () => {
  it('should call Profile.increment with the correct parameters', async () => {
    const { Profile } = require('../models');
    jest.spyOn(Profile, 'increment');

    const userId = 1;
    const amount = 100;
    const transaction = { test: 'test' };

    await incrementProfileBalance(userId, amount, transaction);

    expect(Profile.increment).toHaveBeenCalledWith('balance', {
      by: amount,
      where: { id: userId },
      transaction,
      lock: true,
    });
  });
});

describe('checkValidDepositAmount', () => {
  it('should throw error if depositAmount is greater than 25% of totalDebt', () => {
    const totalDebt = 100;
    const depositAmount = 26;

    expect(() => checkValidDepositAmount(totalDebt, depositAmount)).toThrowError();
  });

  it('should not throw error if depositAmount is less or equal than 25% of totalDebt', () => {
    const totalDebt = 100;
    const depositAmount = 25;

    expect(() => checkValidDepositAmount(totalDebt, depositAmount)).not.toThrowError();
  });
});

describe('decrementProfileBalance', () => {
  it('should call Profile.decrement with the correct parameters', async () => {
    const { Profile } = require('../models');
    jest.spyOn(Profile, 'decrement');

    const userId = 1;
    const amount = 100;
    const transaction = { test: 'test' };

    await decrementProfileBalance(userId, amount, transaction);

    expect(Profile.decrement).toHaveBeenCalledWith('balance', {
      by: amount,
      where: { id: userId },
      transaction,
      lock: true,
    });
  });
});
