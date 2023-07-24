const {
  getUnpaidJobs,
  findOneJob,
  validateSufficientFunds,
  findContractor,
  tagJobAsPaid,
} = require('../services/jobs.service');
const { Op } = require('sequelize');

// mock the sequelize models with jest
jest.mock('../models', () => {
  return {
    Profile: {
      findOne: jest.fn(),
    },
    Contract: {},
    Job: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    },
  };
});

describe('getUnpaidJobs', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Job.findAll with the correct parameters', async () => {
    // spy on findAll
    const { Job, Contract } = require('../models');
    jest.spyOn(Job, 'findAll');

    const profileId = 1;

    await getUnpaidJobs(profileId);

    expect(Job.findAll).toHaveBeenCalledWith({
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
  });
});

describe('findOneJob', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Job.findOne with the correct parameters', async () => {
    // spy on findOne
    const { Job, Contract } = require('../models');
    jest.spyOn(Job, 'findOne').mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({}),
    });

    const profileId = 1;
    const jobId = 1;
    const transaction = { test: 'test' };

    await findOneJob(jobId, profileId, transaction);

    expect(Job.findOne).toHaveBeenCalledWith({
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
  });

  it('should throw error if job is not found', async () => {
    const { Job } = require('../models');
    jest.spyOn(Job, 'findOne').mockResolvedValue(null);

    const profileId = 1;
    const jobId = 1;
    const transaction = { test: 'test' };

    await expect(findOneJob(jobId, profileId, transaction)).rejects.toThrowError();
  });
});

describe('validateSufficientFunds', () => {
  it('should throw error if profile has insufficient funds', () => {
    const profile = {
      balance: 1,
    };
    const price = 2;

    expect(() => validateSufficientFunds(profile, price)).toThrowError();
  });

  it('should not throw error if profile has sufficient funds', () => {
    const profile = {
      balance: 2,
    };
    const price = 1;

    expect(() => validateSufficientFunds(profile, price)).not.toThrowError();
  });
});

describe('findContractor', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Profile.findOne with the correct parameters', async () => {
    // spy on findOne
    const { Profile, Contract } = require('../models');
    jest.spyOn(Profile, 'findOne').mockResolvedValue({
      toJSON: jest.fn().mockReturnValue({}),
    });

    const contractId = 1;
    const transaction = { test: 'test' };

    await findContractor(contractId, transaction);

    expect(Profile.findOne).toHaveBeenCalledWith({
      include: {
        model: Contract,
        as: 'Contractor',
        where: { id: contractId },
      },
      transaction,
      lock: true,
    });
  });

  it('should throw error if contractor is not found', async () => {
    const { Profile } = require('../models');
    jest.spyOn(Profile, 'findOne').mockResolvedValue(null);

    const contractId = 1;
    const transaction = { test: 'test' };

    await expect(findContractor(contractId, transaction)).rejects.toThrowError();
  });
});

describe('tagJobAsPaid', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Job.update with the correct parameters', async () => {
    // spy on update
    const { Job } = require('../models');
    jest.spyOn(Job, 'update');

    // mock " new Date().toISOString()" to return a fixed value
    const date = new Date('2020-01-01T00:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => date);
    const expectedPaymentDate = date.toISOString();

    const jobId = 1;
    const transaction = { test: 'test' };

    await tagJobAsPaid(jobId, transaction);

    expect(Job.update).toHaveBeenCalledWith(
      {
        paid: true,
        paymentDate: expectedPaymentDate, // timestamp
      },
      {
        where: {
          id: jobId,
        },
        transaction,
        lock: true,
      },
    );
  });
});
