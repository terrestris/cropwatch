import {
  SET_ALL_TRAITS,
  SET_COUNT,
  SET_TRAITS,
  SET_MEASUREMENTS,
  SET_TRAIT_COLLECTIONS,
  SET_PLOTS,
  SET_FIELDS,
  SET_EXPERIMENTS,
  SET_EXPERIMENTAL_FACTORS,
  ADD_EXPERIMENTAL_FACTOR,
  SET_WEATHERSTATIONS,
  SET_INCLUDEPOINTS,
  RESET_ALL,
  SET_STARTDATE,
  SET_ENDDATE,
  SET_DATE_INTERVAL_COUNT,
  SET_DATE_INTERVAL_TYPE,
  SET_COMPARE_BY_TIMESTAMP,
  SET_GROUPED_DATA
} from '../actions/MeasurementsAction';

import initialState from '../store/initialState';

function measurements(state = initialState.measurements, action) {
  switch (action.type) {
    case SET_ALL_TRAITS:
      return Object.assign({}, state, {
        ...state.measurements,
        allTraits: action.allTraits
      });
    case SET_STARTDATE:
      return Object.assign({}, state, {
        ...state.measurements,
        startDate: action.startDate
      });
    case SET_ENDDATE:
      return Object.assign({}, state, {
        ...state.measurements,
        endDate: action.endDate
      });
    case SET_DATE_INTERVAL_COUNT:
      return Object.assign({}, state, {
        ...state.measurements,
        dateIntervalCount: action.dateIntervalCount
      });
    case SET_DATE_INTERVAL_TYPE:
      return Object.assign({}, state, {
        ...state.measurements,
        dateIntervalType: action.dateIntervalType
      });
    case SET_INCLUDEPOINTS:
      return Object.assign({}, state, {
        ...state.measurements,
        includePoints: action.includePoints
      });
    case SET_COUNT:
      return Object.assign({}, state, {
        ...state.count,
        count: action.count
      });
    case SET_TRAITS:
      return Object.assign({}, state, {
        ...state.measurements,
        traits: action.traits
      });
    case SET_MEASUREMENTS:
      return Object.assign({}, state, {
        ...state.measurements,
        data: action.measurements
      });
    case SET_TRAIT_COLLECTIONS:
      return Object.assign({}, state, {
        ...state.measurements,
        traitCollections: action.traitCollections
      });
    case SET_PLOTS:
      return Object.assign({}, state, {
        ...state.measurements,
        plots: action.plots
      });
    case SET_FIELDS:
      return Object.assign({}, state, {
        ...state.measurements,
        fields: action.fields
      });
    case SET_EXPERIMENTS:
      return Object.assign({}, state, {
        ...state.measurements,
        experiments: action.experiments
      });
    case SET_EXPERIMENTAL_FACTORS:
      return Object.assign({}, state, {
        ...state.measurements,
        experimentalFactors: action.experimentalFactors
      });
    case ADD_EXPERIMENTAL_FACTOR:
      return Object.assign({}, state, {
        ...state.measurements,
        experimentalFactors: [
          ...state.experimentalFactors,
          action.experimentalFactor
        ]
      });
    case SET_WEATHERSTATIONS:
      return Object.assign({}, state, {
        ...state.weatherStations,
        weatherStations: action.weatherStations
      });
    case RESET_ALL:
      return initialState.measurements;
    case SET_COMPARE_BY_TIMESTAMP:
      return Object.assign({}, state, {
        ...state.compareByTimestamp,
        compareByTimestamp: action.compareByTimestamp
      });
    case SET_GROUPED_DATA:
      return Object.assign({}, state, {
        ...state.groupedData,
        groupedData: action.groupedData
      });
    default:
      return state;
  }
}

export default measurements;
