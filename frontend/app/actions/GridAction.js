/**
 * Action types
 */
export const GRID_LOADING = 'GRID_LOADING';
export const SET_GRID_FILTERMODEL = 'SET_GRID_FILTERMODEL';
export const SET_GRID_SORTMODEL = 'SET_GRID_SORTMODEL';
export const SET_STATISTICS = 'SET_STATISTICS';

export function gridLoading(gridLoading) {
  return {
    type: GRID_LOADING,
    gridLoading
  };
}

export function setFilterModel(filterModel) {
  return {
    type: SET_GRID_FILTERMODEL,
    filterModel
  };
}

export function setSortModel(sortModel) {
  return {
    type: SET_GRID_SORTMODEL,
    sortModel
  };
}

export function setStatistics(statistics) {
  return {
    type: SET_STATISTICS,
    statistics
  };
}
