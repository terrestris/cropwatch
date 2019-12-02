'use strict';

module.exports = (sequelize, DataTypes) => {
  const Experiment = sequelize.define('Experiment', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    expcode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    geom: {
      type: DataTypes.GEOMETRY('Polygon', 4326)
    },
    areasize: {
      type: DataTypes.FLOAT
    },
    question: {
      type: DataTypes.STRING
    },
    harvestyear: {
      type: DataTypes.INTEGER
    },
    timeperiod: {
      type: DataTypes.STRING
    },
    plotsize: {
      type: DataTypes.FLOAT
    },
    plotnumber: {
      type: DataTypes.INTEGER
    },
    experimentaldesign: {
      type: DataTypes.STRING
    },
    replicationquantity: {
      type: DataTypes.INTEGER
    },
    sowing: {
      type: DataTypes.STRING
    },
    fertilizing: {
      type: DataTypes.STRING
    },
    plantprotection: {
      type: DataTypes.STRING
    },
    harvesting: {
      type: DataTypes.STRING
    },
    investigations: {
      type: DataTypes.STRING
    },
    remarks: {
      type: DataTypes.STRING
    }
  });

  Experiment.associate = (models) => {
    Experiment.belongsTo(models.Field, {
      foreignKey: {
        name: 'FieldID',
        allowNull: false
      }
    });
    Experiment.hasMany(models.Plot, {
      foreignKey: 'ExperimentID'
    });
    Experiment.belongsToMany(models.Manager, {
      through: 'Manager_Experiment'
    });
    Experiment.belongsToMany(models.ExperimentalFactor, {
      through: 'Experiment_ExperimentalFactor'
    });
    Experiment.belongsToMany(models.Crop, {
      through: 'Experiment_Crop'
    });
  };

  return Experiment;
};
