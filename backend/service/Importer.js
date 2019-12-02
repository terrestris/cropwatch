/**
 * The ImporterService takes care of adding layers from uploaded raster files.
 *
 * @class ImporterService
 */
class ImporterService {

  /**
   * Creates a new layer for an uploaded raster file.
   * @param {User} user the uploading user
   * @param {String} uploadObject An uploadObject as stored in the UploadService.uploadStore.
   */
  async createLayer(user, uploadObject, filePath) {
    const {
      rasterFile,
      fileName
    } = uploadObject;
    const ws = webSocket.getSocket(user);

    uploadService.setUploadStatus(rasterFile, 'IMPORT_INIT');
    ws.send(JSON.stringify({
      message: 'Import.prepareImport',
      importStage: 1
    }));
    const importResponse = await this.prepareImport();

    uploadService.setUploadStatus(rasterFile, 'IMPORT_PENDING');
    ws.send(JSON.stringify({
      message: 'Import.prepareTask',
      importStage: 2
    }));
    const importId = importResponse['import'].id;
    if (!filePath) {
      filePath  = `${config.uploadPath}/${fileName}`;
    }
    await this.prepareTask(importId, filePath);

    uploadService.setUploadStatus(rasterFile, 'IMPORT_RUNNING');
    ws.send(JSON.stringify({
      message: 'Import.runImport',
      importStage: 3
    }));
    await this.performImport(importId);
    ws.send(JSON.stringify({
      message: 'Import.getLayerName',
      importStage: 4
    }));
    const layerNameResponse = JSON.parse(await this.getLayerName(importId));

    const layerName = layerNameResponse.task.layer.name;
    uploadService.setUploadStatus(rasterFile, 'IMPORT_COMPLETE');
    uploadService.setGeoServerLayerName(rasterFile, layerName);
    ws.send(JSON.stringify({
      message: 'Import.importSuccess',
      importStage: 5,
      i18nOpts: {
        layer: layerName
      },
      importDone: true,
      rasterFile: rasterFile
    }));
    logger.debug(`Import task with id ${importId} completed.`);
    return true;
  }

  /**
  * Prepares the initial empty import.
  * @return {Promise} the promise resolving once the import is created
  */
  prepareImport() {
    const url = `${config.geoserverPath}rest/imports`;
    logger.debug('Preparing import.');
    return request.post({
      url,
      json: true,
      body: {
        'import': {
          targetWorkspace: {
            workspace: {
              name: config.geoserverWorkspace
            }
          }
        }
      }
    });
  }

  /**
   * Prepares the task by uploading the raster .zip to the geoserver
   * @param {Number} importId the import id
   * @param {String} file the path to the raster .zip
   * @return {Promise} a promise resolving once the task has been created
   */
  prepareTask(importId, file) {
    const name = path.basename(file);
    const url = `${config.geoserverPath}rest/imports/${importId}/tasks`;
    logger.debug(`Preparing import task with id ${importId} for ${name}.`);

    return request.post(url, {
      formData: {
        file: {
          value: fs.createReadStream(file),
          options: {
            filename: `${name}`,
            contentType: 'application/zip'
          }
        }
      }
    });
  }

  /**
   * Trigger the actual import.
   * @param  {Number} importId the import id
   * @return {Promise} a promise resolving once the import task is done.
   */
  performImport(importId) {
    logger.debug(`Performing import task with id ${importId}.`);
    const url = `${config.geoserverPath}rest/imports/${importId}`;
    return request.post(url);
  }

  /**
   * Extract the layer name after successful import.
   * @param {Number} importId the import id
   * @return {Promise} a promise resolving once the layer metadata has been
   * loaded.
   */
  getLayerName(importId) {
    logger.debug(`Get Layer name from import task with id ${importId}.`);
    const url = `${config.geoserverPath}rest/imports/${importId}/tasks/0`;
    return request(url);
  }

  /**
   * Import a previously uploaded tractor raster zip as a layer.
   *
   * @param {User} user the currently operating user
   * @param {Number} rasterFileId the id of the raster file to create the layer from
   * @param {String} fileName the raster file name
   * @param {String} fileNameField the field where the file name is stored
   * @param {String} displayNameField the field which should be used as title
   */
  async importTractorLayer(user, rasterFileId, fileName, fileNameField, displayNameField) {
    const zip = new JsZip();
    const rasterFile = await models.RasterFile.findById(rasterFileId, {
      include: models.Experiment
    });
    rasterFile.update({
      filenameField: fileNameField,
      displayField: displayNameField
    });
    // TODO find proper filename
    const path = `${uploadConfig.uploadPath}/${fileName}`;
    const outzip = new JsZip();
    // WARNING this doesn't scale for big files
    fs.readFile(path, async (err, data) => {
      const zipFile = await zip.loadAsync(data);
      zipFile.forEach(async (filename, entry) => {
        if (filename.match(/\.(shp|shx|dbf|prj)$/i)) {
          outzip.file(filename, entry.nodeStream());
        }
      });
      const outfile = tmp.fileSync({postfix: '.zip'});
      outzip.generateNodeStream({
        type: 'nodebuffer',
        streamFiles: true
      })
      .pipe(fs.createWriteStream(outfile.name))
      .on('finish', () => {
        this.createLayer(user, {
          rasterFile,
          fileName
        }, outfile.name);
      });
      // no need to handle success/error here, it's handled by the import functions
    });
  }

}

// export before the requires in order to resolve circular dependencies
module.exports = ImporterService;

// TODO factor out common dependencies so the requires are not circular
const request = require('request-promise-native');
const uploadConfig = require('../config/upload.js');
const path = require('path');
const fs = require('fs');
const JsZip = require('jszip');
const tmp = require('tmp');

const logger = require('../config/logger');
const config = require('../config/upload.js');

const UploadService = require('./Upload');
const WebSocket = require('./WebSocket');

const uploadService = new UploadService();
const webSocket = new WebSocket();
const db = require('../sequelize.js');
const {
  models
} = db;
