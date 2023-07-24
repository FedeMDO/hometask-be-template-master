var express = require('express');
var router = express.Router();
const { sequelize } = require('../model');

const { Op } = require('sequelize');

/**
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 */
router.get('/best-profession', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { start, end } = req.query;

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
    return res.status(404).json({ error: 'no jobs found' });
  }

  // bestProfession is an array with one element
  const [best] = bestProfession;

  return res.json({
    profession: best.profession,
    paid: best.Contractor[0].Jobs[0].dataValues.total_paid,
  });
});

/**
 * returns the clients the paid the most for jobs in the query time period.
 * limit query parameter should be applied, default limit is 2.
 */
router.get('/best-clients', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { start, end, limit } = req.query;
  const queryLimit = parseInt(limit) || 2;

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
  // 6. return top 'queryLimit' results
  const bestClients = await Profile.findAll({
    limit: queryLimit,
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

  return res.json({
    limit: queryLimit,
    count: bestClients.length,
    bestClients: bestClients.map((x) => {
      return {
        id: x.id,
        fullName: x.fullName, // fullName is virtual in the model
        paid: x.Client[0].Jobs[0].dataValues.total_spent,
      };
    }),
  });
});

module.exports = router;
