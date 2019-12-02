'use strict';

module.exports = (sequelize, DataTypes) => {
  const RasterFile = sequelize.define('RasterFile', {
    files: {
      type: DataTypes.JSONB
    },
    format: {
      type: DataTypes.ENUM(['TIFF', 'PNG', 'JPG', 'RAW'])
    },
    isLayer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    geoServerLayerName: {
      type: DataTypes.STRING
    },
    displayField: {
      type: DataTypes.STRING
    },
    filenameField: {
      type: DataTypes.STRING
    },
    product: {
      type: DataTypes.ENUM(['project', 'ortho', 'dem', 'pointcloud', 'images'])
    },
    status: {
      type: DataTypes.ENUM([
        'UPLOADING',
        'IMPORT_INIT',
        'IMPORT_PENDING',
        'IMPORT_RUNNING',
        'IMPORT_COMPLETE',
        'ERROR',
        'CANCELED'
      ]),
    },
    sensor: {
      type: DataTypes.ENUM(['RGB', 'NIR'])
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      unique: 'exp_typ_time'
    },
    type: {
      type: DataTypes.ENUM(['PhotosTractor', 'PhotosCopter']),
      allowNull: false,
      unique: 'exp_typ_time'
    },
    ExperimentID: {
      type: DataTypes.INTEGER,
      unique: 'exp_typ_time'
    }
  });

  RasterFile.associate = models => {
    RasterFile.belongsTo(models.Experiment, {
      foreignKey: 'ExperimentID'
    });
    RasterFile.belongsTo(models.User, {
      foreignKey: {
        name: 'UserID',
        allowNull: false
      }
    });
  };

  return RasterFile;
};
