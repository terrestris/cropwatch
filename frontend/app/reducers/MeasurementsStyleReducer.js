import {
  SET_STYLE
} from '../actions/MeasurementsStyleAction';

import initialState from '../store/initialState';

function measurementsStyle(state = initialState.measurementsStyle, action) {
  switch (action.type) {
    case SET_STYLE:
      return action.style;
    default:
      return state;
  }
}

export default measurementsStyle;
