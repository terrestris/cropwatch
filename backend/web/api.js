const Generic = require('../service/Generic');
const Measurement = require('../service/Measurement');
const RasterFile = require('../service/RasterFile');
const logger = require('../config/logger');
const {
  jwtMiddleWare
} = require('../service/Authentication');
const db = require('../sequelize.js');
const {
  models
} = db;

const generic = new Generic();
const measurementService = new Measurement();
const rasterFileService = new RasterFile();

const optionsFromQueryParams = (queryParams) => {
  const options = {};
  const {
    include
  } = queryParams;
  if (include) {
    if (include === "all") {
      options.include = [{ all: true }];
    } else {
      const includeModels = include.split(',');
      options.include = includeModels.map(model => {
        return {
          model: models[model]
        }
      });
    }
  }
  return options;
}

module.exports = app => {

  app.get('/', (req, res) => {
    res.send('CropWatch-API running.');
  });

  app.get('/:model/describe', (req, res) => {
    const modelName = req.params.model;
    try {
      const description = generic.getModelDescription(modelName);
      res.send({
        success: true,
        data: description
      });
    } catch (error) {
      res.send({
        success: false,
        error
      });
    }
  });

  app.get('/:model/idmap', (req, res) => {
    const modelName = req.params.model;
    const experimentId = req.query.experimentId;
    let options = optionsFromQueryParams(req.query);

    if (modelName === 'Plot') {
      if (experimentId) {
        options = {
          where: {
            ExperimentID: parseInt(experimentId)
          },
          ...options
        };
      } else {
        const error = 'No experimentId provided to idMap generation for plots.';
        logger.warn(error);
        res.send({
          success: false,
          error
        });
        return;
      }
    }

    generic.getIdMap(modelName, options)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));

  });

  app.get('/:model/get', (req, res) => {
    const modelName = req.params.model;
    const options = optionsFromQueryParams(req.query);
    generic.getAllEntities(modelName, options)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.get('/:model/get/:id', (req, res) => {
    const modelName = req.params.model;
    const id = req.params.id;
    const options = optionsFromQueryParams(req.query);
    generic.getEntityById(modelName, id, options)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.post('/:model/create', jwtMiddleWare, (req, res) => {
    const modelName = req.params.model;
    const data = req.body;
    const user = req.user;
    if (!user) {
      res.status(403).json({
        success: false,
        message: 'Couldn\'t get user from request.'
      });
    }
    generic.createEntities(modelName, data, user)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.post('/:model/update', jwtMiddleWare, (req, res) => {
    const modelName = req.params.model;
    const data = req.body;
    const user = req.user;
    if (!user) {
      res.status(403).json({
        success: false,
        message: 'Couldn\'t get user from request.'
      });
    }
    generic.updateEntities(modelName, data)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.post('/:model/delete', jwtMiddleWare, (req, res) => {
    const modelName = req.params.model;
    const data = req.body;
    const user = req.user;
    if (!user) {
      res.status(403).json({
        success: false,
        message: 'Couldn\'t get user from request.'
      });
    }
    generic.deleteEntities(modelName, data)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.post('/Measurement/count', (req, res) => {
    const params = req.body;
    measurementService.countMeasurements(params)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.post('/Measurement/get', (req, res) => {
    const params = req.body;
    measurementService.getMeasurements(params)
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.get('/importlayers', (req, res) => {
    rasterFileService.getImportLayers()
      .then(data => res.send({
        success: true,
        data
      }))
      .catch(error => res.send({
        success: false,
        error
      }));
  });

  app.get('/tractorimages/:layer/:day/:image', (req, res) => {
    const callback = (err, buf) => {
      res.send(buf);
    };
    rasterFileService.getTractorImage(req.params.layer, req.params.day, req.params.image, callback);
  });

}
