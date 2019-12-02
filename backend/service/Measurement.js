const db = require('../sequelize.js');
const {
  models,
  sequelizeMain
} = db;
const {
  Op,
} = sequelizeMain;

/**
 * The Measurement Service.
 *
 * @class Measurement
 */
class Measurement {

  /**
   * Create a where condition for measurements by given parameters.
   *
   * @static
   * @param {Object} params Params object containing the following key:
   *  - useGeomIntersection
   *  - username
   *  - traits
   *  - plots
   *  - weatherStations
   *  - startDate
   *  - endDate
   * @return {Object} The where condition that can be used by sequelize.
   */
  static getMeasurementCondition(params) {
    const {
      useGeomIntersection,
      traits,
      plots,
      weatherStations,
      startDate,
      endDate
    } = params;

    let condition = {
      [Op.and]: {
        TraitID: {
          [Op.or]: traits
        },
        [Op.or]: {
          PlotID: {
            [Op.or]: plots
          },
          WeatherStationID: {
            [Op.or]: weatherStations
          },
          geom: {
            [Op.not]: null
          }
        }
      }
    };

    if (useGeomIntersection) {
      const getIntersectionWithPlot = plotID => {
        const geomFromPlotID = sequelizeMain.literal(`(SELECT geom FROM auswertung."Plots" WHERE ID=${plotID})`);
        const intersectsPlot = sequelizeMain.fn(
          'ST_Intersects',
          sequelizeMain.literal('"Measurement"."geom"'),
          geomFromPlotID
        );
        return sequelizeMain.where(intersectsPlot, true);
      };
      condition[Op.and][Op.or] = plots.map(plotID => getIntersectionWithPlot(plotID));
    }

    if (startDate || endDate) {
      condition[Op.and].timestamp = {};
      if (startDate) {
        condition[Op.and].timestamp[Op.gt] = new Date(startDate);
      }
      if (endDate) {
        condition[Op.and].timestamp[Op.lt] = new Date(endDate);
      }
    }
    return condition;
  }


  /**
   * Count the measurements by given parameters.
   *
   * @param {Object} params Params object. Compare `getMeasurementCondition`.
   * @return {Promise} Promise resolving with the count of the matching measurements.
   */
  countMeasurements (params) {
    const condition = Measurement.getMeasurementCondition(params);
    return models.Measurement.count({
      where: condition
    });
  }

  /**
   * Get the measurements by given parameters.
   *
   * @param {Object} params Params object. Compare `getMeasurementCondition`.
   * @return {Promise} Promise resolving with the matching measurements.
   */
  getMeasurements (params) {
    const {
      plots,
      weatherStations
    } = params;
    const condition = Measurement.getMeasurementCondition(params);
    let include = [];

    if (plots.length > 0) {
      include.push({
        model: models.Plot,
        include: [{
          model: models.Sort
        }, {
          model: models.Experiment,
          attributes: ['title', 'expcode']
        }, {
          model: models.Field,
          attributes: ['name'],
          include: [{
            model: models.Farm,
            attributes: ['name']
          }]
        }]
      });
    }
    if (weatherStations.length > 0) {
      include.push({
        model: models.WeatherStation
      });
    }

    return models.Measurement.findAll({
      where: condition,
      include: include
    });
  }

}

module.exports = Measurement;
