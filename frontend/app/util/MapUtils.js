import LayerParser from './LayerParser';

import OlMap from 'ol/Map';
import OlTileWMS from 'ol/source/TileWMS';
import OlSourceVector from 'ol/source/Vector';
import OlLayerVector from 'ol/layer/Vector';
import OlLayerTile from 'ol/layer/Tile';
import OlLayerGroup from 'ol/layer/Group';
import OlView from 'ol/View';
import OlStyleStyle from 'ol/style/Style';
import OlStyleFill from 'ol/style/Fill';
import OlStyleStroke from 'ol/style/Stroke';

import {
  get as OlGetProjection
} from 'ol/proj';
import {
  defaults as OlDefaultControls
} from 'ol/control';
import OlFormatGeoJSON from 'ol/format/GeoJSON';

import UrlUtil from '@terrestris/base-util/dist/UrlUtil/UrlUtil';
import MapUtil from '@terrestris/ol-util/dist/MapUtil/MapUtil';

import {appConfig} from '../config/app.config.js';
import Api from './Api';

const env = process.env.NODE_ENV;
const api = appConfig.api[env];

/**
 * Helper Class for Colors
 */
export class MapUtils {

  /**
   * The setupMap function
   *
   * initialize the OL map and its components
   *
   * @method setupMap
   */
  static setupMap(state) {
    const {
      mapView: {
        zoom,
        center,
        projection,
        resolutions
      },
      mapLayers
    } = state;

    const mapView = new OlView({
      center: center,
      zoom: zoom,
      projection: OlGetProjection(projection),
      resolutions: resolutions
    });

    let layers = LayerParser.parseLayers(mapLayers);

    const map = new OlMap({
      target: 'map',
      layers: layers,
      view: mapView,
      keyboardEventTarget: document,
      controls: OlDefaultControls({
        zoom: false,
        attributionOptions: {
          collapsible: true
        }
      })
    });

    MapUtils.addFieldLayers(map);
    MapUtils.addExperimentLayers(map);

    this.getImportLayerRasterFiles()
      .then(rasterFiles => {
        rasterFiles.forEach(rasterFile => MapUtils.addImportLayer(rasterFile, map));
      }).catch(err => {
        Error(`Error adding import Layers: ${err}`);
      });

    return map;
  }

  /**
   * Creates a Layer for Every Field
   *
   * @param {OlMap} map
   */
  static addFieldLayers(map) {
    Api.getAllEntities('Field', {})
      .then(fields => {
        const layers = fields
          .filter(field => field.geom)
          .map(field => {
            const layerProperties = {
              name: field.name
            };
            const requestParams = {
              typeName: 'cropwatch:Fields',
              CQL_FILTER: `id=${field.id}`
            };
            const layer = MapUtils.createWfsLayer(layerProperties, requestParams);
            layer.setStyle(
              new OlStyleStyle({
                stroke: new OlStyleStroke({
                  color: 'rgb(0, 0, 255)',
                  width: 3
                }),
                fil: new OlStyleFill({
                  color: 'rgba(0, 0, 255, 0.01)'
                })
              })
            );
            return layer;
          });
        const fieldsGrouprLayer = new OlLayerGroup({
          name: 'Fields',
          layers
        });
        map.addLayer(fieldsGrouprLayer);
      });
  }

  /**
   * Creates a layer for every Experiment
   *
   * @param {OlMap} map
   */
  static addExperimentLayers(map) {
    Api.getAllEntities('Experiment', {})
      .then(experiments => {
        const experimentLayers = experiments
          .filter(experiment => experiment.geom)
          .map(experiment => {
            const layerProperties = {
              name: experiment.expcode
            };
            const requestParams = {
              typeName: 'cropwatch:Experiments',
              CQL_FILTER: `id=${experiment.id}`
            };
            const layer = MapUtils.createWfsLayer(layerProperties, requestParams);
            layer.setStyle(
              new OlStyleStyle({
                stroke: new OlStyleStroke({
                  color: 'rgb(255, 0, 0)',
                  width: 3
                }),
                fil: new OlStyleFill({
                  color: 'rgba(255, 0, 0, 0.01)'
                })
              })
            );
            return layer;
          });
        const experimentsGroupLayer = new OlLayerGroup({
          name: 'Experiments',
          layers: experimentLayers
        });
        map.addLayer(experimentsGroupLayer);
      });
  }

  /**
   * Adds a single import layer with the given name.
   * @param {RasterFile} rasterFile The rasterFile
   * @param {ol.Map} map the openlayers map
   */
  static addImportLayer(rasterFile, map) {
    const {
      Experiment,
      geoServerLayerName,
      type
    } = rasterFile;

    let layer;

    if (type === 'PhotosCopter') {
      const targetGroup = MapUtil.getLayerByName(map, 'Drone Images');
      if (targetGroup) {
        layer = new OlLayerTile({
          source: new OlTileWMS({
            url: appConfig.geoServerDefaults[env].baseUrl,
            params: {
              'LAYERS': geoServerLayerName
            }
          }),
          copterLayer: true,
          visible: false,
          hideInLayertree: true,
          name: geoServerLayerName,
          rasterFile
        });
        targetGroup.getLayers().push(layer);
      }
    } else {
      const targetGroup = MapUtil.getLayerByName(map, 'Tractor Images');
      targetGroup.set('hideInLayertree', false);

      if (targetGroup) {
        layer = MapUtil.getLayerByName(targetGroup, Experiment.expcode);
        if (!layer) {
          const rasterFileMap = {};
          rasterFileMap[rasterFile.timestamp] = rasterFile;
          const layerProperties = {
            visible: true,
            isTractorLayer: true,
            name: Experiment.expcode,
            rasterFileMap
          };
          const requestParams = {
            typeName: `import:${geoServerLayerName}`
          };
          layer = MapUtils.createWfsLayer(layerProperties, requestParams);
          targetGroup.getLayers().push(layer);
        } else {
          const existingRasterFileMap = layer.get('rasterFileMap');
          existingRasterFileMap[rasterFile.timestamp] = rasterFile;
          layer.set('rasterFileMap', existingRasterFileMap);
        }
      }
    }
  }

  /**
   * Get the rasterFiles where isLayer = true, status = 'IMPORT_COMPLETE'
   * and geoServerLayerName is not null.
   *
   */
  static getImportLayerRasterFiles() {
    return new Promise((resolve, reject) => {
      return fetch(`${api}/importlayers`)
        .then(response => response.json())
        .then(response => {
          if (response.success) {
            resolve(response.data);
          } else {
            reject(Error(`Error getting import Layers.`));
          }
        });
    });
  }

  /**
   *
   * @param {Object} layerProperties
   * @param {Object} requestParams
   */
  static createWfsLayer(layerProperties, requestParams) {
    const params = {
      service: 'WFS',
      request: 'GetFeature',
      outputFormat: 'application/json',
      srsName: 'EPSG:3857',
      version: '1.1.0',
      ...requestParams
    };
    const baseUrl = appConfig.geoServerDefaults[env].baseUrl;
    const requestString = UrlUtil.objectToRequestString(params);
    const url = `${baseUrl}?${requestString}`;
    return new OlLayerVector({
      source: new OlSourceVector({
        format: new OlFormatGeoJSON(),
        url
      }),
      ...layerProperties
    });
  }

}
