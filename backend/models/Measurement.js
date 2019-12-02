'use strict';

module.exports = (sequelize, DataTypes) => {
  const Measurement = sequelize.define('Measurement', {
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false
    },
    geom: {
      type: DataTypes.GEOMETRY('Geometry', 4326)
    }
  }, {
    indexes: [{
      fields: ['TraitID']
    }, {
      fields: ['PlotID']
    }, {
      fields: ['WeatherStationID']
    }, {
      fields: ['geom'],
      using: 'gist'
    }],
    validate: {
      geomOrPlot() {
        if ((this.geom === null) && (this.PlotID === null) && (this.WeatherStationID === null)) {
          throw new Error('Require a PlotID, WeatherStationID or geom');
        }
      }
    }
  });

  Measurement.associate = models => {
    Measurement.belongsTo(models.Plot, {
      foreignKey: 'PlotID'
    });
    Measurement.belongsTo(models.Trait, {
      foreignKey: 'TraitID'
    });
    Measurement.belongsTo(models.User, {
      foreignKey: {
        name: 'UserID',
        allowNull: false
      }
    });
    Measurement.belongsTo(models.WeatherStation, {
      foreignKey: 'WeatherStationID'
    });
  };

  return Measurement;
};
