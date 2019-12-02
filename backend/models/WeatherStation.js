'use strict';

module.exports = (sequelize, DataTypes) => {
  const WeatherStation = sequelize.define('WeatherStation', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'uniqueNameInHarvestyear'
    },
    geom: {
      type: DataTypes.GEOMETRY('Point', 4326),
      allowNull: false
    },
    harvestyear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'uniqueNameInHarvestyear'
    }
  });

  return WeatherStation;
};
