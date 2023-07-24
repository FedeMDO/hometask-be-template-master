const { getActiveContracts, getOneContract } = require('./contracts.service');
const { Op } = require('sequelize');

// mock the sequelize models with jest
jest.mock('../models', () => {
  return {
    Contract: {
      findAll: jest.fn(),
      findOne: jest.fn(),
    },
    Job: {},
  };
});

describe('getActiveContracts', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Contract.findAll with the correct parameters', async () => {
    // spy on findAll
    const { Contract, Job } = require('../models');
    jest.spyOn(Contract, 'findAll');

    const profileId = 1;

    await getActiveContracts(profileId);

    expect(Contract.findAll).toHaveBeenCalledWith({
      include: [
        {
          model: Job,
          as: 'Jobs',
        },
      ],
      where: {
        status: {
          [Op.ne]: 'terminated',
        },
        // must belong to profile
        [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
      },
    });
  });
});

describe('getOneContract', () => {
  // test that the sequelize model is called with the correct parameters
  it('should call Contract.findOne with the correct parameters', async () => {
    // spy on findOne
    const { Contract } = require('../models');
    jest.spyOn(Contract, 'findOne');

    const profileId = 1;
    const contractId = 1;

    await getOneContract(profileId, contractId);

    expect(Contract.findOne).toHaveBeenCalledWith({
      where: {
        id: contractId,
        // must belong to profile
        [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
      },
    });
  });
});
