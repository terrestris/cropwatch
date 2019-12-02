import { REQUEST_FEATURES, RECEIVE_FEATURES, ERROR_RECEIVE_FEATURES } from '../actions/FeatureAction';

function feature(state = {
  isFetching: false,
  items: {}
}, action) {
  switch (action.type) {
    case REQUEST_FEATURES:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_FEATURES:
      return Object.assign({}, state, {
        evtCoordinate: action.evtCoordinate,
        isFetching: false,
        items: action.features,
        lastUpdated: action.receivedAt
      });
    case ERROR_RECEIVE_FEATURES:
      return Object.assign({}, state, {
        isFetching: false,
        items: action.features,
        lastUpdated: action.receivedAt
      });
    default:
      return state;
  }
}

export default feature;
