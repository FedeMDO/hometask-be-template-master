const Sequelize = require('sequelize');

module.exports = (sequelize) => {
  class Profile extends Sequelize.Model {}
  Profile.init(
    {
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      profession: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      balance: {
        type: Sequelize.DECIMAL(12, 2),
      },
      type: {
        type: Sequelize.ENUM('client', 'contractor'),
      },
      fullName: {
        type: Sequelize.VIRTUAL,
        get() {
          return `${this.firstName} ${this.lastName}`;
        },
      },
    },
    {
      sequelize,
      modelName: 'Profile',
      paranoid: true,
    },
  );
  return Profile;
};
