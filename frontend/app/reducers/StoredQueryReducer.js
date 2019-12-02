import {
  SET_STORED_QUERIES
} from '../actions/StoredQueryAction';

import initialState from '../store/initialState';

function storedQueries(state = initialState.storedQueries, action) {
  switch (action.type) {
    case SET_STORED_QUERIES:
      return action.storedQueries;
    default:
      return state;
  }
}

export default storedQueries;
