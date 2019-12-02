import {
  combineReducers
} from 'redux';

import mapLayers from './MapLayersReducer';
import mapView from './MapViewReducer';
import app from './AppReducer';
import feature from './FeatureReducer';
import grid from './GridReducer';
import measurements from './MeasurementReducer';
import entityDisplayValues from './EntityDisplayValuesReducer';
import chartData from './ChartDataReducer';
import storedQueries from './StoredQueryReducer';
import appEvents from './AppEventsReducer';
import measurementsStyle from './MeasurementsStyleReducer';

const reducer = combineReducers({
  mapLayers,
  mapView,
  app,
  feature,
  grid,
  measurements,
  measurementsStyle,
  entityDisplayValues,
  chartData,
  storedQueries,
  appEvents
});

export default reducer;
