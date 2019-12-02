export const SET_ALL_TRAITS = 'SET_ALL_TRAITS';
export const SET_COUNT = 'SET_COUNT';
export const SET_TRAITS = 'SET_TRAITS';
export const SET_MEASUREMENTS = 'SET_MEASUREMENTS';
export const SET_TRAIT_COLLECTIONS = 'SET_TRAIT_COLLECTIONS';
export const SET_PLOTS = 'SET_PLOTS';
export const SET_FIELDS = 'SET_FIELD';
export const SET_EXPERIMENTS = 'SET_EXPERIMENTS';
export const SET_EXPERIMENTAL_FACTORS = 'SET_EXPERIMENTAL_FACTORS';
export const ADD_EXPERIMENTAL_FACTOR = 'ADD_EXPERIMENTAL_FACTOR';
export const SET_WEATHERSTATIONS = 'SET_WEATHERSTATIONS';
export const SET_INCLUDEPOINTS = 'SET_INCLUDEPOINTS';
export const SET_STARTDATE = 'SET_STARTDATE';
export const SET_ENDDATE = 'SET_ENDDATE';
export const SET_DATE_INTERVAL_COUNT = 'SET_DATE_INTERVAL_COUNT';
export const SET_DATE_INTERVAL_TYPE = 'SET_DATE_INTERVAL_TYPE';
export const RESET_ALL = 'RESET_ALL';
export const SET_COMPARE_BY_TIMESTAMP = 'SET_COMPARE_BY_TIMESTAMP';
export const SET_GROUPED_DATA = 'SET_GROUPED_DATA';

export function setAllTraits(allTraits) {
  return {
    type: SET_ALL_TRAITS,
    allTraits: allTraits
  };
}


export function setStartDate(startDate) {
  return {
    type: SET_STARTDATE,
    startDate
  };
}

export function setEndDate(endDate) {
  return {
    type: SET_ENDDATE,
    endDate
  };
}

export function setDateIntervalCount(dateIntervalCount) {
  return {
    type: SET_DATE_INTERVAL_COUNT,
    dateIntervalCount
  };
}

export function setDateIntervalType(dateIntervalType) {
  return {
    type: SET_DATE_INTERVAL_TYPE,
    dateIntervalType
  };
}

export function setIncludePoints(includePoints) {
  return {
    type: SET_INCLUDEPOINTS,
    includePoints
  };
}

export function setCount(count) {
  return {
    type: SET_COUNT,
    count: count
  };
}

export function setTraits(traits) {
  return {
    type: SET_TRAITS,
    traits: traits
  };
}

export function setMeasurements(measurements) {
  return {
    type: SET_MEASUREMENTS,
    measurements: measurements
  };
}

export function setTraitCollections(traitCollections) {
  return {
    type: SET_TRAIT_COLLECTIONS,
    traitCollections: traitCollections
  };
}

export function setPlots(plots) {
  return {
    type: SET_PLOTS,
    plots: plots
  };
}

export function setFields(fields) {
  return {
    type: SET_FIELDS,
    fields: fields
  };
}

export function setExperiments(experiments) {
  return {
    type: SET_EXPERIMENTS,
    experiments: experiments
  };
}

export function setExperimentalFactors(experimentalFactors) {
  return {
    type: SET_EXPERIMENTAL_FACTORS,
    experimentalFactors: experimentalFactors
  };
}

export function addExperimentalFactor(experimentalFactor) {
  return {
    type: ADD_EXPERIMENTAL_FACTOR,
    experimentalFactor: experimentalFactor
  };
}

export function setWeatherStations(weatherStations) {
  return {
    type: SET_WEATHERSTATIONS,
    weatherStations: weatherStations
  };
}

export function resetAll() {
  return {
    type: RESET_ALL
  };
}

export function setCompareByTimestamp(compareByTimestamp) {
  return {
    type: SET_COMPARE_BY_TIMESTAMP,
    compareByTimestamp
  };
}

export function setGroupedData(groupedData) {
  return {
    type: SET_GROUPED_DATA,
    groupedData
  };
}
