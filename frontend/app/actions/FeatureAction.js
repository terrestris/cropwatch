/**
 * Action types
 */
export const REQUEST_FEATURES = 'REQUEST_FEATURES';
export const RECEIVE_FEATURES = 'RECEIVE_FEATURES';
export const ERROR_RECEIVE_FEATURES = 'ERROR_RECEIVE_FEATURES';

/**
 * Action creators
 */
export function requestFeatures() {
  return {
    type: REQUEST_FEATURES
  };
}

export function receiveFeatures(json, evtCoordinate) {
  let features = json ? json.features : undefined;
  return {
    type: RECEIVE_FEATURES,
    features: features,
    evtCoordinate: evtCoordinate,
    receivedAt: Date.now()
  };
}

export function errorReceiveFeatures(/*error*/) {
  return {
    type: ERROR_RECEIVE_FEATURES,
    features: [],
    receivedAt: Date.now()
  };
}

export function fetchFeatures(url, evtCoordinate) {
  return function (dispatch) {
    dispatch(requestFeatures(url));
    return fetch(url)
      .then(response => response.json())
      .then(json => dispatch(receiveFeatures(json, evtCoordinate)))
      .catch(error => dispatch(errorReceiveFeatures(error, evtCoordinate)));
  };
}
