const fs = require('fs');
const logger = require('../config/logger');

const Upload = require('../service/Upload');
const WebSocket = require('../service/WebSocket');

const upload = new Upload();
const websocketService = new WebSocket();

module.exports = app => {
  /**
   * Handles binary upload streams. Uses the file handles from the fileHandles hash.
   */
  app.ws('/upload/:handle', (ws, req) => {
    const uploadObject = upload.getUpload(req.params.handle);
    const {
      fileDescriptor,
      fileName
    } = uploadObject;
    ws.on('message', msg => {
        fs.fdatasyncSync(fileDescriptor);
        upload.writeFile(fileDescriptor, msg)
          .then(({written}) => {
            logger.silly(`Wrote ${written} bytes to file ${fileName}.`);
          })
          .catch(error => {
            logger.error(`Error writing to uploaded file: ${error}.`);
          })
    });
  });

  /**
   * Handles messages between client and server.
   */
  app.ws('/websocket', ws => {
    ws.on('message', msg => {
      websocketService.getUserFromMessage(msg, ws)
        .then(user => {
          if (user) {
            try {
              websocketService.readMessage(JSON.parse(msg), user, ws)
            } catch (error) {
              logger.error(`Error reading WebSocket message ${msg}: ${error}.`);
            }
          } else {
            const message = 'Couldn\'t get user from request. Make sure to add the jwt to the request.';
            logger.warn(message);
            ws.send(JSON.stringify({
              message: message,
              type: 'error'
            }));
          }
        })
        .catch(error => {
          const message = `Error establishing WebSocket: ${error}.`;
          logger.error(message);
          ws.send(JSON.stringify({
            message: message,
            type: 'error'
          }));
        });
    });
  });
}
