import {
  SET_CHART_DATA
} from '../actions/ChartDataAction';

import initialState from '../store/initialState';

function chartData(state = initialState.chartData, action) {
  switch (action.type) {
    case SET_CHART_DATA:
      return action.chartData;
    default:
      return state;
  }
}

export default chartData;
