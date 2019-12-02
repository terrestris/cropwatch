'use strict';

module.exports = (sequelize, DataTypes) => {
  const Trait = sequelize.define('Trait', {
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
      fields: ['name', 'type', 'unit', 'german']
    }]
  });

  Trait.associate = (models) => {
    Trait.belongsToMany(models.TraitCollection, {
      through: 'Trait_TraitCollection'
    });
  };

  return Trait;
};
