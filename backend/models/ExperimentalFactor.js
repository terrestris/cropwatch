'use strict';

module.exports = (sequelize, DataTypes) => {
  const ExperimentalFactor = sequelize.define('ExperimentalFactor', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    german: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    remarks: {
      type: DataTypes.STRING
    },
    unit: {
      type: DataTypes.STRING
    },
    type: {
      type: DataTypes.ENUM('VARCHAR', 'TIMESTAMP', 'INTEGER', 'DOUBLE PRECISION', 'DATE', 'TIME'),
      allowNull: false
    }
  }, {
    indexes: [{
      unique: true,
      fields: ['name', 'german', 'unit', 'type']
    }]
  });

  return ExperimentalFactor;
};
