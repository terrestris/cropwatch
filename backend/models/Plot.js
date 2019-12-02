'use strict';

module.exports = (sequelize, DataTypes) => {
  const Plot = sequelize.define('Plot', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'uniquePlotNameInField'
    },
    remarks: {
      type: DataTypes.STRING
    },
    geom: {
      type: DataTypes.GEOMETRY('Polygon', 4326),
      allowNull: false
    },
    harvestyear: {
      type: DataTypes.INTEGER
    },
    croprotation: {
      type: DataTypes.STRING
    },
    replicationlevel: {
      type: DataTypes.INTEGER
    },
    factors: {
      type: DataTypes.JSONB,
      allowNull: false
    }
  }, {
    indexes: [{
      fields: ['geom'],
      using: 'gist'
    }],
    validate: {
      FieldOrPlot() {
        if ((this.PlotID === null) && (this.ExperimentID === null)) {
          throw new Error('Require a PlotID or ExperimentID');
        }
      }
    }
  });

  Plot.associate = (models) => {
    Plot.belongsTo(models.Experiment, {
      foreignKey: 'ExperimentID'
    });
    Plot.belongsTo(models.Crop, {
      foreignKey: 'CropID'
    });
    Plot.belongsTo(models.Crop, {
      as: 'Precrop',
      foreignKey: 'PrecropID'
    });
    Plot.belongsTo(models.Sort, {
      foreignKey: 'SortID'
    });
    Plot.belongsTo(models.Field, {
      foreignKey: {
        name: 'FieldID',
        unique: 'uniquePlotNameInField'
      },
      onDelete: 'cascade'
    });
  };

  return Plot;
};
