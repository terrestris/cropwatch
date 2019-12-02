/**
 * The UploadService handles upload operations such as creating tmp files and
 * stream operations.
 *
 * @class UploadService
 */
class UploadService {

  /**
   * Adds an uploadObject to the UploadService.uploadStore.
   *
   * @param {RasterFile} rasterFile The RasterFile of the current upload.
   * @param {String} fileName The file name to store the file into.
   * @return {Promise} A Promise resolving with the updated rasterFile.
   */
  async storeUpload(rasterFile, fileName) {
    const status = 'UPLOADING';
    return rasterFile.update({status})
      .then(rasterFile => {
        const {
          id
        } = rasterFile;
        const path = `${uploadConfig.uploadPath}/${fileName}`;
        const fileDescriptor = fs.openSync(path, 'w');
        UploadService.uploadStore[id] = {
          fileDescriptor,
          rasterFile,
          fileName
        };
        return rasterFile;
      })
      .catch(error => {
        logger.error(`Error while setting status on rasterFile ${rasterFile.id}: ${error}`);
      });
  }

  /**
   *
   * @param {Integer} id The ID of a RasterFile.
   * @return {Object} The uploadObject as added to the store.
   */
  getUpload(id) {
    return UploadService.uploadStore[id];
  }

  /**
   * Delete an uploadObject from the UploadService.uploadStore by the id.
   *
   * @param {Integer} id The ID of a RasterFile.
   */
  deleteUpload(id) {
    try {
      delete UploadService[id];
    } catch (error) {
      return false;
    }
    return true;
  }

  /**
   * Sets the Satus of a RasterFile.
   *
   * @param {RasterFile} rasterFile The RasterFile.
   * @param {ENUM} status Compare RasterFile status property
   * @return {Promise} Promise resolving with the updated RasterFile.
   */
  async setUploadStatus(rasterFile, status) {
    return rasterFile.update({status})
      .catch(error => {
        logger.error(`Error while setting status on rasterFile ${rasterFile.id}: ${error}`);
      })
  }

  /**
   *  Sets the geoServerLayerName of a RasterFile.
   *
   * @param {RasterFile} rasterFile The RasterFile.
   * @param {String} geoServerLayerName The geoServerLayerName to set.
   * @return {Promise} Promise resolving with the updated RasterFile.
   */
  async setGeoServerLayerName(rasterFile, geoServerLayerName) {
    return rasterFile.update({
      geoServerLayerName,
      isLayer: true
    })
      .catch(error => {
        logger.error(`Error while setting status on rasterFile ${rasterFile.id}: ${error}`);
      })
  }

  /**
   * Writes to an currently opened file.
   *
   * @param {Integer} fileDescriptor The descriptor of the file.
   * @param {Buffer} msg The buffer to write to the file.
   * @return {Promise} A Promise resolving with {written, buffer}.
   */
  async writeFile(fileDescriptor, msg) {
    return new Promise((resolve, reject) => {
      fs.write(fileDescriptor, msg, (error, written, buffer) => {
        if (error) {
          reject(error);
        } else {
          resolve({written, buffer});
        }
      });
    });
  }

  /**
   * Examines a tractor zip file for layer data. Currently checks only for shape files.
   * Sends the properties of the first row to the client if successful.
   *
   * @param {RasterFile} rasterFile the raster file to examine
   * @param {User} user the current user
   * @param {String} fileName the raster filename
   */
  async postprocessTractorFile(rasterFile, user, fileName) {
    const ws = webSocket.getSocket(user);
    if (Object.keys(rasterFile.files).length > 1) {
      const message = `Es wurde bereits ein passender Layer angelegt.`;
      ws.send(JSON.stringify({
        message,
        type: 'info'
      }));
      rasterFile.update({status: 'IMPORT_COMPLETE'});
      return new Promise((resolve, reject) => {
        reject();
      });
    }
    const message = `Untersuche Datei auf mögliche Layerinfos...`;
    ws.send(JSON.stringify({
      message,
      type: 'info'
    }));
    return new Promise((resolve, reject) => {
      const path = `${uploadConfig.uploadPath}/${fileName}`;

      // WARNING this doesn't scale for big files
      fs.readFile(path, (err, data) => {
        shpjs(data)
        .then(json => {
          const props = json.features[0].properties;
          ws.send(JSON.stringify({
            message: 'Datei kann als Layer veröffentlicht werden!',
            type: 'info'
          }));
          ws.send(JSON.stringify({
            tractorLayerDetected: true,
            exampleProperties: props,
            rasterFileId: rasterFile.id,
            rasterFileName: fileName
          }));
        })
        .catch((error) => {
          const message = `Konnte keine Layerinfos finden: ${error}`;
          logger.info(message);
          ws.send(JSON.stringify({
            message,
            type: 'info'
          }));
          reject();
        });
      })
    });
  }

  /**
   * Starts an upload of rasterData.
   *
   * @param {Object} obj The configuration object. Usualy the passed json from WebSocket
   * @param {Object} obj.experiment The experiment of the upload.
   * @param {String} obj.category The category of the upload.
   * @param {Date} obj.date The date of the upload.
   * @param {String} obj.sensor The sensor of the upload.
   * @param {String} obj.product The product of the upload.
   * @param {Boolean} obj.addAsLayer Wheither the upload should be added as layer or not.
   * @param {User} user
   * @memberof UploadService
   */
  async startFile({experiment, category, date, sensor, format, product, addAsLayer}, user) {
    const ws = webSocket.getSocket(user);
    const mdate = moment.utc(date);
    const gdate = mdate.format('YYYYMMDD');
    let fileName = `${experiment.expcode}_${category}_${gdate}_${sensor}_${format}.zip`;

    logger.debug(`User ${user.username} started an import for experiment ${experiment.expcode}.`);

    if (!fs.existsSync(uploadConfig.uploadPath)){
        fs.mkdirSync(uploadConfig.uploadPath);
    }

    return models.RasterFile.findAll({
      where: {
        type: category,
        ExperimentID: experiment.id,
        timestamp: date
      }
    })
      .then(result => {
        if (result.length === 1) {
          if (category === 'PhotosTractor') {
            const rasterFile = result[0];
            rasterFile.files[gdate] = fileName;
            const files = rasterFile.files;
            files[gdate] = fileName;
            const promise = rasterFile.update({files});
            return {
              update: true,
              rasterFile: promise
            };
          }
          const message = `Rasterfile of Type ${category} in Experiment ${experiment.title} already exists at this date.`;
          ws.send(JSON.stringify({
            message,
            type: 'warning'
          }));
          return false;
        }
        return true;
      })
      .then(shallContinue => {
        if (!shallContinue) {
          return;
        }
        let promise;
        if (shallContinue.update) {
          promise = shallContinue.rasterFile;
        } else {
          const files = {};
          files[gdate] = fileName;
          promise = models.RasterFile.create({
            files,
            sensor,
            format,
            product,
            isLayer: addAsLayer,
            type: category,
            timestamp: date,
            ExperimentID: experiment.id,
            UserID: user.id
          });
        }
        promise
          .then(rasterFile => {
            return models.RasterFile.findById(rasterFile.id, {
            include: models.Experiment
          })
        })
          .then(rasterFile => this.storeUpload(rasterFile, fileName))
          .then(rasterFile => {
            const message = `RasterFile ${fileName} added to database.`;
            logger.debug(message);
            const handle = rasterFile.id;
            ws.send(JSON.stringify({
              handle
            }));
            ws.send(JSON.stringify({
              message,
              type: 'success'
            }));
          })
          .catch(error => {
            const message = `Could not add rasterFile ${fileName}: ${error}`;
            logger.warn(message);
            ws.send(JSON.stringify({
              message,
              type: 'warning'
            }));
          });
        })
  }

  /**
   * Finshes an upload by creating a layer if configured and deleting the entry
   * from the uploadStore afterwards;
   *
   * @param {*} json
   * @param {*} user
   * @memberof UploadService
   */
  async endFile(json, user) {
    const ws = webSocket.getSocket(user);
    const uploadObject = this.getUpload(json.handle);
    fs.fdatasyncSync(uploadObject.fileDescriptor);
    fs.closeSync(uploadObject.fileDescriptor);
    const {
      rasterFile,
      fileName
    } = uploadObject;

    if (rasterFile.type === 'PhotosTractor') {
      this.postprocessTractorFile(rasterFile, user, fileName)
      .catch(() => {
        // we can safely ignore this, probably the layer already exists (or an error message has been sent to the client)
      });
      return;
    }
    if (rasterFile.isLayer) {
      importer.createLayer(user, uploadObject)
        .then(success => {
          if (success) {
            this.deleteUpload(json.handle);
          } else {
            this.setUploadStatus(rasterFile, 'ERROR');
            ws.send(JSON.stringify({
              message: 'Import.error',
              type: 'error'
            }));
          }
        }).catch((error) => {
          logger.error(`Error creating layer: ${error}.`);
          this.setUploadStatus(rasterFile, 'ERROR');
          ws.send(JSON.stringify({
            message: 'Import.error',
            type: 'error'
          }));
        });
    }
  }
}

/**
 * Stores the uploadObjects as a map with RasterFile.id as key.
 * UploadObjects contain:
 *    {Integer} id The id of the RasterFile.
 *    {Integer} fileDescriptor Integer representing the file descriptor.
 *    {String} fileName The name of the file.
 *    {Boolean} publishAsLayer Wheither the uploaded file should be published as layer.
 */
UploadService.uploadStore = {};

module.exports = UploadService;

// TODO: FIX
// For some f*****g reason (circular dependcies with node cache) we need
// to write the imports after the export
const fs = require('fs');
const uploadConfig = require('../config/upload.js');
const logger = require('../config/logger');
const shpjs = require('shpjs');

const Importer = require('./Importer');
const WebSocket = require('./WebSocket');
const moment = require('moment');

const importer = new Importer();
const webSocket = new WebSocket();

const db = require('../sequelize.js');
const {
  models
} = db;
