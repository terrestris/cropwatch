const config = require('../config/upload.js');
const request = require('request-promise-native');

/**
 * The ImporterService takes care of adding layers from uploaded raster files.
 *
 * @class ImporterService
 */
class GeoserverService {

  /**
  * Get all layers in the workspace.
  * @param {string} workspace the workspace to get the layers for
  * @return {Promise} the promise resolving once the layers have been fetched
  */
  getAllLayers(workspace) {
    const url = `${config.geoserverPath}rest/workspaces/${workspace}/layers.json`;
    return request.get({
      url,
      json: true
    });
  }

}

module.exports = GeoserverService;
