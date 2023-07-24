const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

// controllers
const adminController = require('./controllers/admin.controller');
const balancesController = require('./controllers/balances.controller');
const contractsController = require('./controllers/contracts.controller');
const jobsController = require('./controllers/jobs.controller');

// use controllers
app.use('/admin', adminController);
app.use('/balances', balancesController);
app.use('/contracts', contractsController);
app.use('/jobs', jobsController);

module.exports = app;
