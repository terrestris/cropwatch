export const SET_STORED_QUERIES = 'SET_STORED_QUERIES';

export function setStoredQueries(storedQueries) {
  return {
    type: SET_STORED_QUERIES,
    storedQueries: storedQueries
  };
}
