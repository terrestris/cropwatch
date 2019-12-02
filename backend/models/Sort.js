'use strict';

module.exports = (sequelize, DataTypes) => {
  const Sort = sequelize.define('Sort', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    identification: {
      type: DataTypes.INTEGER
    },
    approvalyear: {
      type: DataTypes.INTEGER
    },
    remarks: {
      type: DataTypes.STRING
    },
    characteristics: {
      type: DataTypes.JSONB
    }
  });

  Sort.associate = (models) => {
    Sort.belongsTo(models.Crop, {
      foreignKey: 'CropID'
    });
    Sort.hasMany(models.Plot, {
      foreignKey: 'SortID'
    });
  };

  return Sort;
};
