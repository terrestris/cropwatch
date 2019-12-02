'use strict';

module.exports = (sequelize, DataTypes) => {
  const Field = sequelize.define('Field', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    location: {
      type: DataTypes.STRING
    },
    geom: {
      type: DataTypes.GEOMETRY('Polygon', 4326),
      allowNull: false
    }
  });

  Field.associate = (models) => {
    Field.belongsTo(models.Farm, {
      foreignKey: 'FarmID'
    });
    Field.hasMany(models.Experiment, {
      foreignKey: 'FieldID'
    });
    Field.hasMany(models.Plot, {
      foreignKey: 'FieldID'
    });
    Field.hasMany(models.WeatherStation, {
      foreignKey: 'FieldID'
    });
  };

  return Field;
};
