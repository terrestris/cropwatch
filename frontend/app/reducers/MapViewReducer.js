import {
  SET_CENTER,
  SET_ZOOM,
  TOGGLE_FEATURE_INFO,
  SET_MAPVIEW,
  ZOOM_IN,
  ZOOM_OUT
} from '../actions/MapViewChangeAction';

function mapViewChange(mapViewState = {}, action) {
  switch (action.type) {
    case SET_CENTER:
      return Object.assign({}, mapViewState, {
        center: action.center
      });
    case SET_ZOOM:
      return Object.assign({}, mapViewState, {
        zoom: action.zoom
      });
    case ZOOM_IN:
      return Object.assign({}, mapViewState, {
        zoom: mapViewState.zoom + 1
      });
    case ZOOM_OUT:
      return Object.assign({}, mapViewState, {
        zoom: mapViewState.zoom - 1
      });
    case TOGGLE_FEATURE_INFO:
      return Object.assign({}, mapViewState, {
        featureInfoActive: !mapViewState.featureInfoActive
      });
    case SET_MAPVIEW:
      return Object.assign({}, mapViewState, {
        center: action.mapView.center,
        zoom: action.mapView.zoom
      });
    default:
      return mapViewState;
  }
}

export default mapViewChange;
