import {
  SET_EXPERIMENT_NAMES,
  SET_FIELD_NAMES,
  SET_PLOT_NAMES,
  SET_WEATHERSTATION_NAMES
} from '../actions/EntityDisplayValuesActions';

function entityDisplayValues(state = {
  experiments: {},
  fields: {},
  plots: {}
}, action) {
  switch (action.type) {
    case SET_EXPERIMENT_NAMES:
      return {
        ...state,
        experiments: action.names
      };
    case SET_FIELD_NAMES:
      return {
        ...state,
        fields: action.names
      };
    case SET_PLOT_NAMES:
      return {
        ...state,
        plots: action.names
      };
    case SET_WEATHERSTATION_NAMES:
      return {
        ...state,
        plots: action.names
      };
    default:
      return state;
  }
}

export default entityDisplayValues;
