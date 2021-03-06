const db = require('../sequelize.js');
const logger = require('../config/logger');
const associationMapping = require('../config/pKeyAssociations.json');
const _ = require('lodash');
const {
  models,
  sequelizeMain
} = db;

class Generic {

  /**
   * Get a description of the attributes and associations of a given model.
   *
   * @param {*} modelName  The model to get the description for.
   * @return {Object} Object containing attributes and assocations of the model.
   */
  getModelDescription(modelName) {
    logger.debug(`Getting model description for ${modelName}.`);
    if (modelName) {

      const attributes = _.cloneDeep(models[modelName].attributes);
      const associations = _.cloneDeep(models[modelName].associations);

      Object.keys(attributes).forEach(attributeName => {
        const attribute = attributes[attributeName];
        attribute.dataType = attribute.type.key;
      });

      // Remove circular references
      Object.keys(associations).forEach(associationName => {
        const association = associations[associationName];
        delete association.options.sequelize;
        delete association.sequelize;
        delete association.source;
        delete association.target;
        delete association.manyFromSource;
        delete association.manyFromTarget;
        delete association.oneFromSource;
        delete association.oneFromTarget;
        delete association.paired;
        delete association.through;
        delete association.throughModel;
        delete association.toSource;
        delete association.toTarget;
      });

      return {attributes, associations};
    } else {
      logger.error(`Could not get model description for ${modelName}.`);
      throw new Error(`Could not get model description for ${modelName}.`);
    }
  }

  /**
   * Get a description of the Geometry column of a specific model.
   * e.g. SRID, TYPE
   *
   * @param {String} modelName The model to get the geometry column description
   * for.
   * @return {Object} Object containing the attributes of the geometry column.
   *
   */
  getGeometryDescription(modelName) {
    logger.debug(`Getting geometry description for ${modelName}.`);
    if (modelName) {
      return sequelizeMain
        .query('SELECT * ' +
          'FROM geometry_columns ' +
          'WHERE f_geometry_column = \'geom\' ' +
          'AND f_table_name = :table_name', {
          type: sequelizeMain.QueryTypes.SELECT,
          replacements: {
            table_name: modelName + 's'
          }
        })
        .catch(error => {
          logger.error(`Could not get geometry description for ${error}.`);
          throw error;
        });
    }
  }

  /**
   * Find an entity by its database id.
   *
   * @param {String} modelName The model to find the entity of.
   * @param {Number} id The id to find the entity of.
   * @param {Object} opt Options to be passed to the findById method of sequelize.
   * @return {Promise} Promise resolving with the found entity of the given modelName.
   */
  getEntityById(modelName, id, opt) {
    logger.debug(`Getting ${modelName} with id ${id}.`);
    if (modelName) {
      return models[modelName]
        .findById(id, opt || {})
        .catch(error => {
          logger.error(`Could not get ${modelName} with id ${id}: ${error}`);
          throw error;
        });
    }
  }

  /**
   * Find all entities of a given model.
   *
   * @param {String} modelName The model to find the entities of.
   * @param {Object} opt Options to be passed to the findAll method of sequelize.
   * @return {Promise} Promise resolving with all entities of the given modelName.
   */
  getAllEntities(modelName, opt) {
    logger.debug(`Getting all entities of ${modelName}.`);
    if (modelName) {
      return models[modelName]
        .findAll(opt || {})
        .catch(error => {
          logger.error(`Could not get all entities of ${modelName}: ${error}`);
          throw error;
        });
    }
  }

  /**
   * Creates an object to map a given id of an entity to a specific column.
   *
   * These id maps are (among others) used for the CSV import so you can e.g.
   * identify a Plot by its name and not by its (mostly unkonwn and dynamic)
   * database id.
   *
   * The associated column is defined by "associationMapping" from a config file.
   *
   * @param {String} modelName The model to create the id map for.
   * @param {Object} opt Options to be passed to the findAll method of sequelize.
   * @return {Object} The idMap mapping database id (key) with the
   *  associationColumn.
   */
  getIdMap(modelName, opt) {
    logger.debug(`Creating a id map for ${modelName}`);
    const associationColumn = associationMapping[modelName];
    const options = Object.assign({
      attributes: ['id', associationColumn]
    }, opt);

    return models[modelName]
      .findAll(options || {})
      .then((entities) => {
        const idMap = {};
        entities.forEach((entity) => {
          idMap[entity.id] = entity[associationColumn];
        });
        return idMap;
      })
      .catch(error => {
        logger.error(`Could not get idMap of ${modelName}: ${error}`);
        throw error;
      });
  }

  /**
   * Creates an entity of a given model.
   *
   * @param {String} modelName The name of the model of the entity that should
   *  be created.
   * @param {Object[]} data An object that should be created.
   * @return {Promise} Promise resolving with an objects containing the created
   * entity data.
   */
  createEntity(modelName, data) {
    logger.debug(`Creating ${modelName}.`);
    return models[modelName]
      .create(data)
      .catch(error => {
        logger.error(`Could not create entities of ${modelName}: ${error}`);
        throw error;
      });
  }

  /**
   * Creates multiple entities of a given model.
   *
   * @param {String} modelName The name of the model of the entities that should
   *  be created.
   * @param {Object[]} data An Array of entity objects that should be created.
   * @param {User} user An user.
   * @return {Promise} Promise resolving with an array of objects of the created
   * entities.
   */
  createEntities(modelName, data, user) {
    logger.debug(`Creating ${data.length} ${modelName}s.`);

    const associations = models[modelName].associations;
    const belongsToManyAssociations = {};
    Object.keys(associations).forEach((associationKey) => {
      const association = associations[associationKey];
      if (association.associationType === 'BelongsToMany') {
        belongsToManyAssociations[associationKey] = association;
      }
    });

    // If we are creating measurements we add the user to each tuple
    if (modelName === 'Measurement') {
      data.map(tuple => {
        tuple.UserID = user.id;
        return tuple;
      });
    }

    // The model contains belongsToManyAssociations. Bulk creation is not
    // supported for these models so we have to create them one by one.
    if (Object.keys(belongsToManyAssociations).length > 0) {
      return sequelizeMain.transaction((t) => {
        const promises = data.map(tupel => {
          return models[modelName]
            .create(tupel, {
              transaction: t
            })
            .then(instance => {
              // Set belongsToMany Associations
              const updatePromises = Object.keys(belongsToManyAssociations)
                .map((associationKey) => {
                  const association = associations[associationKey];
                  const key = association.as;
                  const value = tupel[key];
                  const associationSetter = association.accessors.set;
                  if (value) {
                    return instance[associationSetter](value, {
                      transaction: t
                    });
                  }
                });
              return sequelizeMain.Promise.all(updatePromises);
            })
            .catch(error => {
              logger.error(`Could not create entities of ${modelName}: ${error}`);
              throw error;
            });
        });

        return sequelizeMain.Promise.all(promises);
      });
    } else {
      // Bulk create instances
      logger.debug('… with bulkCreate');
      return models[modelName]
        .bulkCreate(data)
        .catch(error => {
          logger.error(`Could not bulk create entities of ${modelName}: ${error}`);
          throw error;
        });
    }
  }

  /**
   * Updates multiple entities of a given model.
   *
   * @param {String} modelName The name of the model of the entities that should
   *  be updated.
   * @param {Object[]} data An Array of entity objects that should be updated.
   * @return {Promise} Promise resolving with an array of objects of the updated
   * entities.
   */
  updateEntities(modelName, data) {
    logger.debug(`Updating ${data.length} ${modelName}s.`);

    const associations = models[modelName].associations;
    const belongsToManyAssociations = {};
    Object.keys(associations).forEach(associationKey => {
      const association = associations[associationKey];
      if (association.associationType === 'BelongsToMany') {
        belongsToManyAssociations[associationKey] = association;
      }
    });

    let promises = [];
    data.forEach((newdata) => {
      const id = newdata.id;
      delete newdata.id;
      promises.push(
        models[modelName]
          .findById(id).then((row) => {
            // Update belongsToMany Associations
            Object.keys(belongsToManyAssociations).forEach((associationKey) => {
              const association = associations[associationKey];
              const key = association.as;
              const value = newdata[key];
              const associationSetter = association.accessors.set;
              if (value) {
                row[associationSetter](value);
                delete newdata[key];
              }
            });
            return row.update(newdata);
          })
          .catch(error => {
            logger.error(`Could not update entities of ${modelName}: ${error}`);
          })
      );
    });

    return sequelizeMain.Promise.all(promises);
  }

  /**
   * Deletes entities of modelName by givven ids
   *
   * @param {String} modelName The name of the model of the entities that should
   *  be deleted.
   * @param {ID[]} ids An array of ids of entities that should be deleted.
   * @return {Promise} A Promise resolving with the number of affected rows.
   */
  deleteEntities(modelName, ids) {
    logger.debug(`Deleting ${modelName}s with ids ${ids}.`);
    return models[modelName]
      .destroy({
        where: {
          id: ids
        }
      })
      .catch(error => {
        logger.error(`Could not delete ${modelName} with ids ${ids}: ${error}`);
      });
  }

  /**
   * Count all Entities of a specific model.
   *
   * @param {String} modelName
   * @param {Object} options
   */
  countEntities(modelName, options = {}) {
    logger.debug(`Counting entities of ${modelName}.`);
    return models[modelName]
      .count(options)
      .catch(error => {
        logger.error(`Could not count entities of ${modelName}: ${error}`);
      });
  }
}

module.exports = Generic;
