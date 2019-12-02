'use strict';

module.exports = (sequelize, DataTypes) => {
  const Farm = sequelize.define('Farm', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });

  Farm.associate = (models) => {
    Farm.hasMany(models.Manager, {
      foreignKey: 'FarmID'
    });
    Farm.hasMany(models.Field, {
      foreignKey: 'FarmID'
    });
  };

  return Farm;
};
