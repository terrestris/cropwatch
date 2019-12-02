import OlFormatGeoJson from 'ol/format/GeoJSON';

/**
 * Action types
 */
export const FETCHING_FEATURES = 'FETCHING_FEATURES';
export const FETCHED_FEATURES = 'FETCHED_FEATURES';
export const ERROR_FETCHING_FEATURES = 'ERROR_FETCHING_FEATURES';

/**
 * Called if fetching starts.
 *
 * @return {Object} The action object.
 */
export function fetchingFeatures(type, passThroughOpts) {
  return {
    type: `${FETCHING_FEATURES}_${type}`,
    startedAt: Date.now(),
    passThroughOpts
  };
}

/**
 * Called if the response has arrived.
 *
 * @param {String} text The reponse text.
 * @param {ol.format} format The ol.format instance to read the fetched features
 *                           with.
 * @param {Object} readerOpts The options to apply to the readFeatures() method
 *                            provided by the ol.format instance.
 * @return {Object} The action object.
 */
export function fetchedFeatures(type, features, passThroughOpts) {
  return {
    type: `${FETCHED_FEATURES}_${type}`,
    features: features,
    receivedAt: Date.now(),
    passThroughOpts
  };
}

/**
 * Called on fetch's catch clause.
 *
 * @param {Error} error The fetch error object.
 * @return {Object} The action object.
 */
export function errorFetchingFeatures(type, error, passThroughOpts) {
  return {
    type: `${ERROR_FETCHING_FEATURES}_${type}`,
    error: error,
    receivedAt: Date.now(),
    passThroughOpts
  };
}

/**
 * This thunk is used to create an action method to request remote features,
 * e.g. via WMS GetFeatureInfo or WFS GetFeature.
 *
 * @param {String} urls The list of URLs to fetch the features from.
 * @param {Object} passThroughOpts An object that should be added to final
 *                                 state. It will be appended to the state as is
 *                                 with no further interpretation.
 * @param {Object} fetchOpts The options to apply to the fetch,
 *                           see https://github.github.io/fetch/.
 * @param {ol.format} format The ol.format instance to read the fetched features
 *                           with, default is to new ol.format.GeoJSON().
 * @param {Object} readerOpts The options to apply to the readFeatures() method
 *                            provided by the ol.format instance. The default
 *                            sets `featureProjection` to the current map
 *                            projection.
 * @return {Function} The thunk.
 */
export function fetchFeatures(type, urls, passThroughOpts, fetchOpts, format, readerOpts) {
  return function(dispatch, getState) {

    // Only proceed, if at least one URL is given.
    if (urls.length === 0) {
      return;
    }

    let defaultFetchOpts = {
      method: 'GET'
    };
    fetchOpts = Object.assign({}, defaultFetchOpts, fetchOpts);
    format = format || new OlFormatGeoJson();
    let defaultReaderOpts = {
      featureProjection: getState().mapView.projection
    };
    readerOpts = Object.assign({}, defaultReaderOpts, readerOpts);

    let dispatcher = [];

    // Iterate all given URLs and create a dispatcher method for each one.
    urls.forEach((url) => {
      dispatcher.push(dispatch(fetchFeaturesFromResource(url, fetchOpts, format, readerOpts)));
    });

    // Set loading to true by dispatching the following action.
    dispatch(fetchingFeatures(type, passThroughOpts));

    // Load all single resources.
    Promise.all(dispatcher)
      .then((features) => {
        // As soon as all single actions are fulfilled, write the combined
        // features into the state.
        return dispatch(fetchedFeatures(type, features, passThroughOpts));
      });
  };
}

/**
 * Fetches the response from the given url and parses the response (if any) as
 * ol features.
 *
 * @param {String} url The URL to fetch the features from.
 * @param {Object} fetchOpts The options to apply to the fetch,
 *                           see https://github.github.io/fetch/.
 * @param {ol.format} format The ol.format instance to read the fetched features
 *                           with.
 * @param {Object} readerOpts The options to apply to the readFeatures() method
 *                            provided by the ol.format instance.
 * @return {Function} The thunk.
 */
export function fetchFeaturesFromResource(url, fetchOpts, format, readerOpts) {
  return (/*dispatch*/) => {
    return fetch(url, fetchOpts)
      .then((response) => {
        return response.text();
      })
      .then((text) => {
        let features = format.readFeatures(text, readerOpts);
        return {
          request: url,
          features: features
        };
      })
      .catch((error) => {
        // TODO: decide
        // return dispatch(errorFetchingFeatures(error));
        return {
          request: url,
          features: [],
          error: error.message
        };
      });
  };
}
