'use strict';

module.exports = (sequelize, DataTypes) => {
  const Crop = sequelize.define('Crop', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });

  Crop.associate = (models) => {
    Crop.hasMany(models.Plot, {
      foreignKey: 'CropID'
    });
    Crop.hasMany(models.Plot, {
      as: 'Precrop',
      foreignKey: 'PrecropID'
    });
    Crop.hasMany(models.Sort, {
      foreignKey: 'CropID'
    });
    Crop.belongsToMany(models.Experiment, {
      through: 'Experiment_Crop'
    });
  };

  return Crop;
};
