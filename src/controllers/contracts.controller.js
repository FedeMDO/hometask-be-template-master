const express = require('express');
const router = express.Router();

const { getProfile } = require('../middleware/getProfile');
const { Op } = require('sequelize');
const { Job } = require('../models');

/**
 * Returns a list of contracts belonging to a user
 * (client or contractor), the list should only contain non terminated contracts.
 */
router.get('/', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const userProfileId = req.profile.id;

  const contracts = await Contract.findAll({
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
      [Op.or]: [{ ContractorId: userProfileId }, { ClientId: userProfileId }],
    },
  });

  res.json(contracts);
});

/**
 * Return the contract only if it belongs to the profile calling.
 */
router.get('/:id', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const userProfileId = req.profile.id;

  const contract = await Contract.findOne({
    where: {
      id: id,
      // must belong to profile
      [Op.or]: [{ ContractorId: userProfileId }, { ClientId: userProfileId }],
    },
  });

  if (!contract) {
    return res.sendStatus(404);
  }

  res.json(contract);
});

module.exports = router;
