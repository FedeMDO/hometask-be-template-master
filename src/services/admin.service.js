const { sequelize, Profile, Contract, Job } = require('../models');
const { Op } = require('sequelize');

async function findBestProfession(start, end) {
  const jobWhere = {
    paid: true,
    createdAt: {
      [Op.gte]: start,
      [Op.lte]: end,
    },
  };

  // find best profession
  // 1. find all contractors
  // 2. find all jobs that belong to those contractors
  // 3. sum the price of those jobs
  // 4. group by profession
  // 5. order by total_paid DESC
  // 6. return the top result
  const bestProfession = await Profile.findAll({
    subQuery: false,
    where: { type: 'contractor' },
    group: 'profession',
    order: sequelize.literal('`Contractor.Jobs.total_paid` DESC'),
    limit: 1,
    include: [
      {
        model: Contract,
        as: 'Contractor',
        required: true,
        include: {
          model: Job,
          where: jobWhere,
          attributes: ['ContractId', [sequelize.fn('sum', sequelize.col('price')), 'total_paid']],
          group: 'ContractId',
          required: true,
        },
      },
    ],
  });

  if (!bestProfession.length) {
    throw new Error('no jobs found');
  }

  // bestProfession is an array with one element
  const [best] = bestProfession;

  return {
    profession: best.profession,
    paid: best.Contractor[0].Jobs[0].dataValues.total_paid,
  };
}

function mapBestClients(bestClients) {
  return bestClients.map((x) => {
    return {
      id: x.id,
      fullName: x.fullName, // fullName is virtual in the model
      paid: x.Client[0].Jobs[0].dataValues.total_spent,
    };
  });
}

async function findBestClients(start, end, limit) {
  const jobWhere = {
    paid: true,
    createdAt: {
      [Op.gte]: start,
      [Op.lte]: end,
    },
  };

  // find best clients
  // 1. find all clients
  // 2. find all jobs that belong to those clients
  // 3. sum the price of those jobs
  // 4. group by client
  // 5. order by total_spent DESC
  // 6. return top 'limit' results
  const bestClients = await Profile.findAll({
    limit,
    subQuery: false,
    where: { type: 'client' },
    group: 'Profile.id',
    order: sequelize.literal('`Client.Jobs.total_spent` DESC'),
    include: [
      {
        model: Contract,
        as: 'Client',
        required: true,
        include: {
          model: Job,
          where: jobWhere,
          attributes: ['ContractId', [sequelize.fn('sum', sequelize.col('price')), 'total_spent']],
          group: 'ContractId',
          required: true,
        },
      },
    ],
  });

  return {
    limit,
    count: bestClients.length,
    bestClients: mapBestClients(bestClients),
  };
}

module.exports = {
  findBestProfession,
  findBestClients,
  mapBestClients,
};
