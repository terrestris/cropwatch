'use strict';

module.exports = (sequelize, DataTypes) => {
  const StoredQuery = sequelize.define('StoredQuery', {
    query: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });

  return StoredQuery;
};
