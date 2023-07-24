const Sequelize = require('sequelize');

module.exports = (sequelize) => {
  class Contract extends Sequelize.Model {}
  Contract.init(
    {
      terms: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('new', 'in_progress', 'terminated'),
      },
    },
    {
      sequelize,
      modelName: 'Contract',
      paranoid: true,
    },
  );
  return Contract;
};
