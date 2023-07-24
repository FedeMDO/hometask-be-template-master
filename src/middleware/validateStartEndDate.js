const validateStartEndDate = async (req, res, next) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query parameters are required' });
  }

  const isoDateRegex = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/;

  if (!isoDateRegex.test(start) || !isoDateRegex.test(end)) {
    return res.status(400).json({ error: 'start and end query parameters should be in ISO 8601 format' });
  }

  next();
};
module.exports = { validateStartEndDate };
