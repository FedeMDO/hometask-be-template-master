var express = require('express');
var router = express.Router();

const { getProfile } = require('../middleware/getProfile');
const { getUnpaidJobs, payForJob } = require('../services/jobs.service');

/**
 * Get all unpaid jobs for a user (either a client or contractor), active contracts only.
 */
router.get('/unpaid', getProfile, async (req, res) => {
  const userProfileId = req.profile.id;

  try {
    const unpaidJobs = await getUnpaidJobs(userProfileId);
    res.json(unpaidJobs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay.
 * The amount should be moved from the client's balance to the contractor balance.
 */
router.post('/:job_id/pay', getProfile, async (req, res) => {
  const { job_id } = req.params;

  try {
    await payForJob(req.profile, job_id);
    // If the execution reaches this line, the transaction has been committed successfully
    return res.sendStatus(200);
  } catch (error) {
    // If the execution reaches this line, an error occurred.
    // The transaction has already been rolled back automatically by Sequelize!
    return res.sendStatus(500);
  }
});

module.exports = router;
