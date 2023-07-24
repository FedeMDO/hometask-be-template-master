const { Contract, Job } = require('../models');
const { Op } = require('sequelize');

async function getActiveContracts(profileId) {
  return await Contract.findAll({
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
}

async function getOneContract(profileId, contractId) {
  return await Contract.findOne({
    where: {
      id: contractId,
      // must belong to profile
      [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
    },
  });
}

module.exports = {
  getActiveContracts,
  getOneContract,
};
