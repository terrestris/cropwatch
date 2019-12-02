import OlLayerVector from 'ol/layer/Vector';
import OlSourceVector from 'ol/source/Vector';

import {
  appConfig
} from '../config/app.config.js';

const featureLayer = new OlLayerVector({
  source: new OlSourceVector(),
  name: 'Messungs Geometrien',
  style: appConfig.featureLayerStyle
});

const hoverLayer = new OlLayerVector({
  source: new OlSourceVector(),
  name: 'hoverLayer',
  hideInLayertree: true,
  style: appConfig.hoverLayerStyle
});

const selectLayer = new OlLayerVector({
  source: new OlSourceVector(),
  name: 'selectLayer',
  hideInLayertree: true,
  style: appConfig.selectLayerStyle
});

export default {
  mapView: appConfig.mapView,
  app: {
    config: appConfig,
    legendVisible: false,
    imprintVisible: false,
    mobileMenuVisible: false,
    featureGridVisible: false,
    eventLogVisible: false,
    user: null
  },
  feature: {
    evtCoordinate: null,
    isFetching: false,
    lastUpdated: null,
    items: [],
    featureLayer: featureLayer,
    selectLayer: selectLayer,
    hoverLayer: hoverLayer
  },
  grid: {
    gridLoading: false,
    filterModel: {},
    sortModel: [],
    statistics: []
  },
  mapLayers: appConfig.mapLayers,
  measurements: {
    count: 0,
    data: [],
    allTraits: [],
    traitCollections: [],
    traits: [],
    plots: [],
    weatherStations: [],
    fields: [],
    experiments: [],
    experimentalFactors: [],
    includePoints: false,
    startDate: null,
    endDate: null,
    dateIntervalCount: 0,
    dateIntervalType: null,
    compareByTimestamp: false,
    groupedData: []
  },
  measurementsStyle: null,
  entityDisplayValues: {
    traitCollections: {},
    experiments: {},
    fields: {},
    plots: {},
    weatherStations: {}
  },
  chartData: [],
  storedQueries: [],
  appEvents: []
};
