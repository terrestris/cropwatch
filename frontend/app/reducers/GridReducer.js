import {
  SET_GRID_FILTERMODEL,
  SET_GRID_SORTMODEL,
  SET_STATISTICS,
  GRID_LOADING
} from '../actions/GridAction';

function grid(state = {
  gridLoading: false,
  filterModel: {},
  sortModel: [],
  filterOverride: null
}, action) {
  switch (action.type) {
    case GRID_LOADING:
      return Object.assign({}, state, {
        ...state.gridLoading,
        gridLoading: action.gridLoading
      });
    case SET_GRID_FILTERMODEL:
      return Object.assign({}, state, {
        ...state.filterModel,
        filterModel: action.filterModel
      });
    case SET_GRID_SORTMODEL:
      return Object.assign({}, state, {
        ...state.sortModel,
        sortModel: action.sortModel
      });
    case SET_STATISTICS:
      return Object.assign({}, state, {
        ...state.statistics,
        statistics: action.statistics
      });
    default:
      return state;
  }
}

export default grid;
