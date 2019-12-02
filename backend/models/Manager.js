'use strict';

module.exports = (sequelize, DataTypes) => {
  const Manager = sequelize.define('Manager', {
    firstname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING
    },
    street: {
      type: DataTypes.STRING
    },
    housenumber: {
      type: DataTypes.INTEGER
    },
    zip: {
      type: DataTypes.INTEGER
    },
    city: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING
    },
    mobile: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    fax: {
      type: DataTypes.STRING
    }
  });

  Manager.associate = (models) => {
    Manager.belongsTo(models.Farm, {
      foreignKey: 'FarmID'
    });
    Manager.belongsToMany(models.Experiment, {
      through: 'Manager_Experiment'
    });
  };

  return Manager;
};
