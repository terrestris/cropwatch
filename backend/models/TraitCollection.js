'use strict';

module.exports = (sequelize, DataTypes) => {
  const TraitCollection = sequelize.define('TraitCollection', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });

  TraitCollection.associate = (models) => {
    TraitCollection.belongsToMany(models.Trait, {
      through: 'Trait_TraitCollection'
    });
  };

  return TraitCollection;
};
