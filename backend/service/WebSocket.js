const jsonwebtoken = require('jsonwebtoken');

const logger = require('../config/logger');
const { secretOrKey } = require('../config/passport');

const Generic = require('./Generic');
const UploadService = require('./Upload');
const EntityUploadService = require('./EntityUpload');
const ImporterService = require('./Importer');

const generic = new Generic();
const uploadService = new UploadService();
const entityUpload = new EntityUploadService();
const importService = new ImporterService();

/**
 * The WebSocketService handles websocket operations such as managing connections
 * and reading message.
 *
 * @class WebSocketService
 */
class WebSocketService {

  /**
   * Adds a socket to the WebSocketService.socketStore.
   *
   * @param {WebSocket} socket The WebSocket to add.
   * @param {User} user The user to add the WebSocket for.
   */
  addSocket(socket, user) {
    logger.debug(`WebSocket for user ${user.username} stored.`);
    WebSocketService.socketStore[user.username] = socket;
    // When closed, clean up the entry from the websockets hash.
    socket.on('close', () => {
      this.deleteSocket(user);
    });
  }

  /**
   * Get a WebSocket from the WebSocketService.socketStore.
   *
   * @param {User} user The user to get the WebSocket for.
   */
  getSocket(user) {
    return WebSocketService.socketStore[user.username];
  }

  /**
   * Deletes a Socket from the WebSocketService.socketStore.
   *
   * @param {User} user The user which WebSocket should be delted.
   */
  deleteSocket(user) {
    try {
      delete WebSocketService.socketStore[user.username];
      logger.debug(`WebSocket for user ${user.username} removed.`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the user from the WebSocket message. WebSocket messages send to the
   * backend have to contain the jason web token as key 'jwt'.
   *
   * @param {String} msg The WebSocket message.
   * @param {WebSocket} ws The WebSocket itself.
   * @return {Promise} A Promise resolving with the user or undefined
   * if no jwt could be detected.
   */
  getUserFromMessage(msg, ws) {
    const json = JSON.parse(msg);
    const jwt = json.jwt;
    return new Promise((resolve, reject) => {
      if (jwt) {
        const user = jsonwebtoken.verify(jwt, secretOrKey);
        resolve(generic.getEntityById('User', user.id));
      } else {
        const message = 'Could not read jwt from websocket message. Make sure to add the jwt to the json data';
        logger.warn(message);
        ws.send(JSON.stringify({
          message: message,
          type: 'error'
        }));
        reject(message);
      }
    });
  }

  /**
   * Read a websocket message.
   *
   * @param {Object} json The message content as json.
   * @param {User} user The user who the message.
   * @param {WebSocket} ws The WebSocket.
   */
  readMessage(json, user, ws) {
    switch (json.message) {
      // Once logged in, the websockets hash will map usernames to websockets.
      // This message causes the hash to be updated.
      case 'connect':
        try {
          this.addSocket(ws, user);
          ws.send(JSON.stringify({
            message: `WebSocket established for ${user.username}`,
            noPopup: true
          }));
        } catch (error) {
          logger.error(`Can not establish WebSocket: ${error}.`)
        }
        break;
      // Used to signal a new file transfer. A file will be opened and stored
      // in the global hash.
      case 'startfile': {
        try {
          uploadService.startFile(json, user);
        } catch (error) {
          logger.error(`Could not start file transfer: ${error}.`)
        }
        break;
      }
      // Used to signal the end of a file transfer. Causes the file handle
      // to be closed and be removed from the global hash.
      case 'endfile':
        try {
          uploadService.endFile(json, user);
        } catch (error) {
          logger.error(`Could not end file transfer: ${error}.`)
        }
        break;
      // starts a new entity import
      case 'startentityimport':
        entityUpload.startImport(user, json.modelName, ws);
        break;
      // get a slice of entity data
      case 'importdata':
        entityUpload.addData(user, json.data);
        break;
      // push the new entities into the DB
      case 'endentityimport':
        entityUpload.doImport(user, ws);
        break;
      case 'importtractorlayer':
        importService.importTractorLayer(user, json.rasterFileId, json.rasterFileName, json.fileNameAttribute, json.displayNameAttribute);
    }
  }
}

/**
 * Stores the WebSocket as a map with the username as key.
 */
WebSocketService.socketStore = {

};

module.exports = WebSocketService;
