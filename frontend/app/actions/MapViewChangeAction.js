/**
 * Action types
 */
export const SET_CENTER = 'SET_CENTER';
export const SET_ZOOM = 'SET_ZOOM';
export const ZOOM_IN = 'ZOOM_IN';
export const ZOOM_OUT = 'ZOOM_OUT';
export const TOGGLE_FEATURE_INFO = 'TOGGLE_FEATURE_INFO';
export const SET_MAPVIEW = 'SET_MAPVIEW';

/**
 * Action creators
 */
export function setCenter(action) {
  return {
    type: SET_CENTER,
    center: action
  };
}
export function setZoom(zoom) {
  return {
    type: SET_ZOOM,
    zoom: zoom
  };
}
export function zoomIn() {
  return {
    type: ZOOM_IN
  };
}
export function zoomOut() {
  return {
    type: ZOOM_OUT
  };
}
export function setMapView(mapView) {
  return {
    type: SET_MAPVIEW,
    mapView
  };
}
export function toggleFeatureInfo() {
  return {
    type: TOGGLE_FEATURE_INFO
  };
}
