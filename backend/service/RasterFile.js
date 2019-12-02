const JsZip = require('jszip');
const streamToBuffer = require('stream-to-buffer');
const fs = require('fs');
const db = require('../sequelize.js');
const {
  models,
  sequelizeMain
} = db;
const {
  Op,
} = sequelizeMain;
const uploadConfig = require('../config/upload.js');
const logger = require('../config/logger');

/**
 * The RasterFile Service.
 *
 * @class RasterFile
 */
class RasterFile {

  /**
   * Get all RasteFiles where isLayer = true, status = 'IMPORT_COMPLETE' and
   * geoServerLayerName is not null.
   *
   * @return {Promise} Promise resolving with the matching RasterFiles.
   */
  getImportLayers() {
    return models.RasterFile.findAll({
      where: {
        [Op.and]: {
          isLayer: true,
          status: 'IMPORT_COMPLETE',
          geoServerLayerName: {
            [Op.not]: null
          }
        }
      },
      include: models.Experiment
    })
  }

  /**
   *
   * @param {string} layer
   * @param {string} day
   * @param {string} image
   * @param {function} callback
   */
  getTractorImage(layer, day, image, callback) {
    models.RasterFile.findOne({
      where: {
        geoServerLayerName: layer
      }
    })
    .then(rasterFile => {
      const path = `${uploadConfig.uploadPath}/${rasterFile.files[day]}`;
      const readStream = fs.readFileSync(path);
      const zip = new JsZip();
      logger.debug(`Load Tractorimage ${image} from ${path}`);
      zip.loadAsync(readStream)
        .then(zip => {
          zip.forEach((filename, entry) => {
            if (filename === image) {
              streamToBuffer(entry.nodeStream(), callback);
            }
          });
        });
    });
  }

}

module.exports = RasterFile;
