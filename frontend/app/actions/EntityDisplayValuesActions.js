/**
 * Action types
 */
export const SET_EXPERIMENT_NAMES = 'SET_EXPERIMENT_NAMES';
export const SET_FIELD_NAMES = 'SET_FIELD_NAMES';
export const SET_PLOT_NAMES = 'SET_PLOT_NAMES';
export const SET_WEATHERSTATION_NAMES = 'SET_WEATHERSTATION_NAMES';

/**
 * Action creators
 */
export function setExperimentNames(names) {
  return {
    type: SET_EXPERIMENT_NAMES,
    names
  };
}
export function setFieldNames(names) {
  return {
    type: SET_FIELD_NAMES,
    names
  };
}
export function setPlotNames(names) {
  return {
    type: SET_PLOT_NAMES,
    names
  };
}
export function setWeatherStationNames(names) {
  return {
    type: SET_WEATHERSTATION_NAMES,
    names
  };
}
