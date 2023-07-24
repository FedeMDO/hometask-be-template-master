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
  const userProfileId = req.profile.id;

  const contracts = await getActiveContracts(userProfileId);

  res.json(contracts);
});

/**
 * Return the contract only if it belongs to the profile calling.
 */
router.get('/:id', getProfile, async (req, res) => {
  const { id } = req.params;
  const userProfileId = req.profile.id;

  const contract = await getOneContract(userProfileId, id);

  if (!contract) {
    return res.sendStatus(404);
  }

  res.json(contract);
});

module.exports = router;
