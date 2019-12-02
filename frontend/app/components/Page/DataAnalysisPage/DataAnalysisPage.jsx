import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
  withRouter
} from 'react-router-dom';
import {translate} from 'react-i18next';
import moment from 'moment';
import {
  Checkbox,
  DatePicker,
  Icon,
  Tooltip,
  Select,
  Input,
  Popconfirm,
  Form,
  Switch
} from 'antd';

import _isEmpty from 'lodash/isEmpty';

const Option = Select.Option;

import {
  SimpleButton,
  Toolbar,
  Window
} from '@terrestris/react-geo';
import StringUtil from '@terrestris/base-util/dist/StringUtil/StringUtil';
import RemoteSelectField from '../../Selectfield/RemoteSelectField/RemoteSelectField.jsx';
import StoreQueryPanel from '../../Panel/StoreQueryPanel/StoreQueryPanel.jsx';
import {appConfig} from '../../../config/app.config.js';

import {
  resetAll,
  setTraits,
  setCount,
  setTraitCollections,
  setMeasurements,
  setFields,
  setExperiments,
  setPlots,
  setWeatherStations,
  setIncludePoints,
  setStartDate,
  setEndDate,
  setDateIntervalCount,
  setDateIntervalType,
  setCompareByTimestamp
} from '../../../actions/MeasurementsAction';

import {
  setExperimentNames,
  setFieldNames,
  setPlotNames
} from '../../../actions/EntityDisplayValuesActions';

import {setStoredQueries} from '../../../actions/StoredQueryAction';

import {gridLoading} from '../../../actions/GridAction';

import './DataAnalysisPage.less';
import { Api } from '../../../util/Api';
import { EventLogger } from '../../../util/EventLogger';

@connect((store) => {
  return {
    user: store.app.user,
    measurements: store.measurements,
    displayNames: store.entityDisplayValues,
    storedQueries: store.storedQueries
  };
})
@translate()
@withRouter
class DataAnalysisPage extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    t: PropTypes.func,
    mapView: PropTypes.object,
    user: PropTypes.object,
    location: PropTypes.object,
    history: PropTypes.object,
    children: PropTypes.object,
    measurements: PropTypes.object,
    displayNames: PropTypes.object,
    storedQueries: PropTypes.array,
    compareByTimestamp: PropTypes.bool
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    const env = process.env.NODE_ENV;
    const api = appConfig.api[env];
    document.title = appConfig.header.title;

    const user = this.props.user;
    this.userRoles = user
      ? user.roles
      : [];
    this.notAuthorizedPath = '/login';

    this.state = {
      advancedMode: false,
      api: api,
      counting: false,
      searching: false,
      value: undefined,
      storedQueryId: null,
      storeQueryWindowVisible: false
    };

  }

  UNSAFE_componentWillMount() {
    this.prepareExperimentDisplayValues();
    this.prepareFieldDisplayValues();
    this.preparePlotDisplayValues();
    this.prepareStoredQueries();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const {
      traitCollections: newTraitCollections
    } = nextProps.measurements;
    const {
      traitCollections: oldTraitCollections
    } = this.props.measurements;

    if (newTraitCollections && newTraitCollections !== oldTraitCollections) {
      let traits = [];
      newTraitCollections.forEach(traitCollection => {
        if (traitCollection.Traits) {
          traits = [...traits, ...traitCollection.Traits];
        } else {
          EventLogger.log(`TraitCollection ${traitCollection.title} is empty`, 'warning', 'Analysis');
        }
      });

      this.props.dispatch(setTraits(traits));
    }
  }

  componentDidUpdate(oldProps) {
    const {
      experiments: newExperiments,
      fields: newFields,
      plots: newPlots,
      traits: newTraits,
      traitCollections: newTraitCollections,
      weatherStations: newWeatherStations,
      includePoints: newIncludePoints,
      startDate: newStartDate,
      endDate: newEndDate
    } = this.props.measurements;
    const {
      experiments: oldExperiments,
      fields: oldFields,
      plots: oldPlots,
      traits: oldTraits,
      traitCollections: oldTraitCollections,
      weatherStations: oldWeatherStations,
      includePoints: oldIncludePoints,
      startDate: oldStartDate,
      endDate: oldEndDate
    } = oldProps.measurements;

    if (newTraits.length > 0) {
      if(
        newExperiments.length != oldExperiments.length ||
        newFields.length != oldFields.length ||
        newPlots.length != oldPlots.length ||
        newTraits.length != oldTraits.length ||
        newTraitCollections.length != oldTraitCollections.length ||
        newWeatherStations.length != oldWeatherStations.length ||
        newIncludePoints != oldIncludePoints ||
        newStartDate != oldStartDate ||
        newEndDate != oldEndDate
      ) {
        this.count();
      }
    }
  }

  /**
   * Loads all stored queries for now (could be restricted to the user in the
   * future).
   * @return {Promise} a promise that resolves with all stored queries if
   * successful
   */
  prepareStoredQueries = () => {
    return Api.getAllEntities('StoredQuery')
      .then(data => {
        this.props.dispatch(setStoredQueries(data));
      });
  }

  prepareExperimentDisplayValues = () => {
    return Api.getAllEntities('Experiment')
      .then(data => {
        let displayNames ={};
        data.forEach(row => {
          displayNames[row.id] = row.expcode;
        });
        this.props.dispatch(setExperimentNames(displayNames));
      });
  }

  preparePlotDisplayValues = () => {
    return Api.getAllEntities('Plot')
      .then(data => {
        let displayNames ={};
        data.forEach(row => {
          displayNames[row.id] = row.name;
        });
        this.props.dispatch(setPlotNames(displayNames));
      });
  }

  prepareFieldDisplayValues = () => {
    return Api.getAllEntities('Field')
      .then(data => {
        let displayNames ={};
        data.forEach(row => {
          displayNames[row.id] = row.name;
        });
        this.props.dispatch(setFieldNames(displayNames));
      });
  }

  onTraitCollectionChange = value => {
    this.props.dispatch(setTraitCollections([value]));
  }

  onPlotsChange = (value = []) => {
    this.props.dispatch(setPlots(value));
  }

  onExperimentsChange = (value = []) => {
    this.props.dispatch(setExperiments(value));
  }

  onTraitsChange = (value = []) => {
    this.props.dispatch(setTraits(value));
  }

  onFieldsChange = (value = []) => {
    this.props.dispatch(setFields(value));
  }

  onWeatherStationChange = (value = []) => {
    this.props.dispatch(setWeatherStations(value));
  }

  onStartDateChange = value => {
    this.props.dispatch(setStartDate(value));
  }

  onEndDateChange = value => {
    this.props.dispatch(setEndDate(value));
  }

  onIncludePointsChange = evt => {
    const value = evt.target.checked;
    this.props.dispatch(setIncludePoints(value));
  }

  /**
   * Updates start/end date from the given parameters.
   * @param  {number} count the count to subtract from now
   * @param  {string} type  the type of time unit to subtract (months, days etc.)
   */
  updateFromDateInterval(count, type) {
    const now = moment();
    const from = now.clone().subtract(count, type);
    this.props.dispatch(setStartDate(from));
    this.props.dispatch(setEndDate(now));
  }

  /**
   * Updates the date interval count. If the type is set as well, updates the
   * start/end date as well.
   * @param  {Event} event the change event with the new value
   */
  onDateIntervalCountChange = event => {
    const value = event.target.value ? parseInt(event.target.value) : 0;
    if (value && this.props.measurements.dateIntervalType) {
      this.updateFromDateInterval(value, this.props.measurements.dateIntervalType);
    }
    this.props.dispatch(setDateIntervalCount(value));
  }

  /**
   * Updates the date interval type. If the count is set as well, updates the
   * start/end date as well.
   * @param  {string} value the new interval type (months, days etc.)
   */
  onDateIntervalTypeChange = value => {
    if (value && this.props.measurements.dateIntervalCount) {
      this.updateFromDateInterval(this.props.measurements.dateIntervalCount, value);
    }
    this.props.dispatch(setDateIntervalType(value));
  }

  sendDataRequest = url => {
    const {
      measurements: {
        plots,
        weatherStations,
        includePoints,
        traits,
        startDate,
        endDate
      },
      user
    } = this.props;

    const body = {
      plots: plots.map(e => e.id),
      traits: traits.map(t => t.id),
      weatherStations: weatherStations.map(t => t.id),
      username: user.username,
      startDate: startDate,
      endDate: endDate,
      useGeomIntersection: includePoints
    };

    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json());
  }

  reset = () => {
    this.setState({storedQueryId: undefined});
    this.props.dispatch(resetAll());
  }

  search = () => {
    const {
      dispatch,
      location,
      history,
      t
    } = this.props;
    const api = this.state.api;
    const url = `${api}/Measurement/get`;

    dispatch(gridLoading(true));
    this.setState({searching: true});
    this.sendDataRequest(url)
      .then(response => {
        if (response.success) {
          const data = response.data.map(tuple => {
            tuple.value = StringUtil.coerce(tuple.value);
            return tuple;
          });
          const rowData = this.prepareRowData(data);
          dispatch(setMeasurements(rowData));
          dispatch(gridLoading(false));
          this.setState({searching: false});
          const message = t('DataAnalysisPage.measurementsLoaded', {count: rowData.length});
          EventLogger.log(message, 'success', 'Analysis');
          const noViewSelected = location.pathname.endsWith('analysis');
          if(noViewSelected) {
            history.push('/analysis/grid');
          }
        } else {
          EventLogger.log('Couldn\'t get data.', 'warning', 'Analysis');
        }
      });
  }

  count = () => {
    const api = this.state.api;
    const url = `${api}/Measurement/count`;
    this.setState({counting: true});
    this.sendDataRequest(url)
      .then(response => {
        if (response.success) {
          this.setState({
            counting: false
          });
          this.props.dispatch(setCount(response.data));
        }
      });
  }

  /**
   * Prepares the list of measurements by aggregating spatial and time precise data.
   *
   * @param {*} data
   */
  prepareRowData = data => {
    const {
      traits,
      experimentalFactors
    } = this.props.measurements;
    let rowData = [];
    const traitNames = {};
    const factorNames = {};

    traits.forEach(trait => {
      traitNames[trait.id] = trait.name;
    });
    experimentalFactors.forEach(experimentalFactor => {
      factorNames[experimentalFactor.id] = experimentalFactor.name;
    });

    data.forEach(tuple => {
      // Existing data with the tuples spatial reference
      const spatialData = rowData.filter(row => {
        return (tuple.PlotID && row.PlotID === tuple.PlotID) ||
        (tuple.WeatherStationID && row.WeatherStationID === tuple.WeatherStationID) ||
        (tuple.geom && row.geom === tuple.geom);
      });
      // Existing data with the tuples spatial refrence and the tuples timestamp
      const spatialTimeData = spatialData.filter(row => row.timestamp === tuple.timestamp)[0];

      const traitName = traitNames[tuple.TraitID];

      // Do we have a matching row allready just add the value
      if (spatialTimeData) {
        spatialTimeData[traitName] = tuple.value;
      // Otherwise create a new row
      } else {
        let rowObject = {
          timestamp: tuple.timestamp
        };
        if (tuple.PlotID) {
          rowObject.PlotID = tuple.PlotID;
          if (tuple.Plot && tuple.Plot.factors) {
            const factorsObject = JSON.parse(tuple.Plot.factors);
            Object.keys(factorsObject).forEach(id => {
              const factorName = factorNames[id];
              rowObject[factorName] = factorsObject[id];
            });
          }
        }
        if (tuple.Plot) {
          rowObject.Plot = tuple.Plot;
        }
        if (tuple.WeatherStationID) {
          rowObject.WeatherStationID = tuple.WeatherStationID;
        }
        if (tuple.WeatherStation) {
          rowObject.WeatherStation = tuple.WeatherStation;
        }
        if (tuple.geom) {
          rowObject.geom = tuple.geom;
        }
        rowObject[traitName] = tuple.value;
        rowData.push(rowObject);
      }
    });

    return rowData;
  }

  experimentsFilter = experiment => {
    const fields = this.props.measurements.fields;
    let include = fields.length === 0;
    fields.forEach(field => {
      if (field.Experiments) {
        field.Experiments.forEach(fieldExperiment => {
          if (experiment.id === fieldExperiment.id) {
            include = true;
          }
        });
      }
    });
    return include;
  }

  onCompareByTimestampChange = event => {
    this.props.dispatch(setCompareByTimestamp(event.target.checked));
  }

  plotsFilter = plot => {
    const {
      fields,
      experiments
    } = this.props.measurements;
    let include = fields.length === 0 && experiments.length === 0;

    if (experiments.length === 0) {
      fields.forEach(field => {
        if (field.Plots) {
          field.Plots.forEach(fieldPlot => {
            if (plot.id === fieldPlot.id) {
              include = true;
            }
          });
        }
      });
    }

    experiments.forEach(experiment => {
      if (experiment.Plots) {
        experiment.Plots.forEach(experimentPlot => {
          if (plot.id === experimentPlot.id) {
            include = true;
          }
        });
      }
    });

    return include;
  }

  /**
   * Create the list of <Option>s for the stored queries.
   * @return {<Option>[]} the array of <Option>s
   */
  getStoredQueryOptions() {
    const {
      storedQueries
    } = this.props;

    return storedQueries.map(query => {
      return <Option key={query.id} value={query.id}>
        {query.title}
      </Option>;
    });
  }

  /**
   * Dispatches all kinds of actions to set the various filter values to the
   * values stored in the stored query.
   * @param  {number} value the selected stored query id
   */
  storedQuerySelected = value => {
    const {
      dispatch,
      storedQueries
    } = this.props;
    const storedQuery = storedQueries.find(query => query.id === value);
    const query = storedQuery.query;
    dispatch(resetAll());

    this.setState({storedQueryId: value});

    const {
      traits,
      traitCollections,
      fields,
      experiments,
      plots,
      weatherStations,
      includePoints,
      startDate,
      endDate,
      dateIntervalCount,
      dateIntervalType,
      compareByTimestamp
    } = query;

    if (fields || includePoints || dateIntervalCount !== 0 || dateIntervalType || compareByTimestamp) {
      this.setState({
        advancedMode: true
      });
    }

    if (traits) dispatch(setTraits(traits));
    if (!_isEmpty(traitCollections)) dispatch(setTraitCollections(traitCollections));
    if (fields) dispatch(setFields(fields));
    if (experiments) dispatch(setExperiments(experiments));
    if (plots) dispatch(setPlots(plots));
    if (weatherStations) dispatch(setWeatherStations(weatherStations));
    if (includePoints) dispatch(setIncludePoints(includePoints));
    if (startDate) dispatch(setStartDate(moment(startDate)));
    if (endDate) dispatch(setEndDate(moment(endDate)));
    if (dateIntervalCount) dispatch(setDateIntervalCount(dateIntervalCount));
    if (dateIntervalType) dispatch(setDateIntervalType(dateIntervalType));
    if (compareByTimestamp) dispatch(setCompareByTimestamp(compareByTimestamp));
    if (dateIntervalCount !== 0 && dateIntervalType) {
      this.updateFromDateInterval(dateIntervalCount, dateIntervalType);
    }

    this.count();
  }

  onStoredQueryRemove = () => {
    const {
      storedQueryId
    } = this.state;
    Api.deleteEntities('StoredQuery', [storedQueryId])
      .then(() => {
        EventLogger.log(`StoredQuery ${storedQueryId.title} removed`, 'success', 'Analysis');
        this.props.dispatch(resetAll());
        this.setState({storedQueryId: null});
        this.prepareStoredQueries();
      });
  }

  onModeChange = advancedMode => {
    this.setState({
      advancedMode
    });
  }

  switchView = () => {
    const {
      location,
      history
    } = this.props;
    const gridVisible = location.pathname.includes('/analysis/grid');
    const newRoute = gridVisible ? '/analysis/chart' : '/analysis/grid';
    history.push(newRoute);
  }

  render() {
    const env = process.env.NODE_ENV;
    const api = appConfig.api[env];

    const {
      location,
      measurements: {
        count,
        plots,
        traits,
        traitCollections,
        fields,
        experiments,
        weatherStations,
        includePoints,
        startDate,
        endDate,
        dateIntervalCount,
        dateIntervalType,
        compareByTimestamp
      },
      displayNames,
      t
    } = this.props;

    const {
      advancedMode,
      storedQueryId,
      storeQueryWindowVisible
    } = this.state;

    const gridVisible = location.pathname.includes('/analysis/grid');

    return (
      <div className="page data-analysis-page">
        <h2 className="centered">{t('DataAnalysisPage.search')}</h2>
        <Toolbar className="top-toolbar">
          <Form.Item
            label={t('DataAnalysisPage.selectStoredQuery')}
          >
            <Select
              style={{width: 250}}
              value={storedQueryId}
              onChange={this.storedQuerySelected}
              placeholder={t('DataAnalysisPage.selectStoredQuery')}
              dropdownMatchSelectWidth={false}
            >
              {this.getStoredQueryOptions()}
            </Select>
          </Form.Item>
          {
            !storedQueryId ? null :
              <Popconfirm
                title={t('General.delete') + ' (' + t('Entities.storedquery') + ')?'}
                onConfirm={this.onStoredQueryRemove}
                okText={t('General.yes')}
                cancelText={t('General.no')}
              >
                <SimpleButton
                  tooltip={t('General.delete') + ' (' + t('Entities.storedquery') + ')'}
                  tooltipPlacement="left"
                  icon="trash-o"
                />
              </Popconfirm>
          }
          <SimpleButton
            style={{
              margin: '0 10px 0 0'
            }}
            type="primary"
            onClick={() => this.setState({storeQueryWindowVisible: true})}
          >
            {t('DataAnalysisPage.storeQuery')}
          </SimpleButton>
          <Form.Item
            label={t('DataAnalysisPage.advancedMode')}
          >
            <Switch
              checked={advancedMode}
              onChange={this.onModeChange}
            />
          </Form.Item>
        </Toolbar>
        <div className="form">
          <Form layout="horizontal" className="entity-fields">
            <Form.Item
              label={t('DataAnalysisPage.weatherStations')}
            >
              <RemoteSelectField
                className="data-analysis-item"
                url={`${api}/WeatherStation/get`}
                placeholder={t('DataAnalysisPage.weatherStations')}
                mode="multiple"
                maxTagCount={1}
                allowClear
                sortKey="name"
                value={weatherStations.map(t => t.id)}
                renderFunction={(tuple) => {
                  return `${tuple.name} (${tuple.harvestyear})`;
                }}
                onChange={this.onWeatherStationChange}
              />
            </Form.Item>
            {
              !advancedMode ? null :
                <Form.Item
                  label={t('DataAnalysisPage.fields')}
                >
                  <RemoteSelectField
                    className="data-analysis-item"
                    url={`${api}/Field/get?include=all`}
                    placeholder={t('DataAnalysisPage.fields')}
                    mode="multiple"
                    maxTagCount={1}
                    allowClear
                    sortKey="name"
                    value={fields.map(t => t.id)}
                    renderFunction={(tuple) => {
                      return tuple.name;
                    }}
                    onChange={this.onFieldsChange}
                  />
                </Form.Item>
            }
            <Form.Item
              label={t('DataAnalysisPage.experiments')}
            >
              <RemoteSelectField
                className="data-analysis-item"
                url={`${api}/Experiment/get?include=all`}
                placeholder={t('DataAnalysisPage.experiments')}
                mode="multiple"
                maxTagCount={1}
                allowClear
                sortKey="expcode"
                filterFunction={this.experimentsFilter}
                value={experiments.map(t => t.id)}
                renderFunction={(tuple) => {
                  return tuple.expcode;
                }}
                onChange={this.onExperimentsChange}
              />
            </Form.Item>
            <Form.Item
              label={t('DataAnalysisPage.parcel')}
            >
              <RemoteSelectField
                style={{
                  flex: 1
                }}
                className="data-analysis-item"
                url={`${api}/Plot/get`}
                placeholder={t('DataAnalysisPage.parcel')}
                mode="multiple"
                maxTagCount={1}
                allowClear
                sortKey="name"
                filterFunction={this.plotsFilter}
                value={plots.map(t => t.id)}
                renderFunction={(tuple) => {
                  let additonalName;
                  if (tuple.ExperimentID) {
                    additonalName = displayNames.experiments[tuple.ExperimentID];
                  } else {
                    additonalName = displayNames.fields[tuple.FieldID];
                  }
                  return `${tuple.name} (${additonalName})`;
                }}
                onChange={this.onPlotsChange}
              />
            </Form.Item>
          </Form>
          <div className="temporal-fields">
            <Form.Item
              label={t('DataAnalysisPage.from')}
            >
              <DatePicker
                placeholder={t('DataAnalysisPage.from')}
                format="DD.MM.YYYY HH:mm:ss"
                showTime={{
                  defaultValue: moment('00:00:00', 'HH:mm:ss')
                }}
                value={startDate}
                onChange={this.onStartDateChange}
              />
            </Form.Item>
            <Form.Item
              label={t('DataAnalysisPage.until')}
            >
              <DatePicker
                placeholder={t('DataAnalysisPage.until')}
                format="DD.MM.YYYY HH:mm:ss"
                showTime={{
                  defaultValue: moment('00:00:00', 'HH:mm:ss')
                }}
                value={endDate}
                onChange={this.onEndDateChange}
              />
            </Form.Item>
            {
              !advancedMode ? null :
                <Form.Item
                  label={t(`DataAnalysisPage.last${dateIntervalCount <= 1 ? '' : 's'}`)}
                >
                  <Input
                    type="number"
                    value={dateIntervalCount}
                    onChange={this.onDateIntervalCountChange}
                  />
                </Form.Item>
            }
            {
              !advancedMode ? null :
                <Form.Item
                  label={t(`DataAnalysisPage.intervalType`)}
                >
                  <Select
                    value={dateIntervalType}
                    placeholder={t(`DataAnalysisPage.intervalType`)}
                    onChange={this.onDateIntervalTypeChange}>
                    <Option value="years">{t(`DataAnalysisPage.year${dateIntervalCount <= 1 ? '' : 's'}`)}</Option>
                    <Option value="months">{t(`DataAnalysisPage.month${dateIntervalCount <= 1 ? '' : 's'}`)}</Option>
                    <Option value="weeks">{t(`DataAnalysisPage.week${dateIntervalCount <= 1 ? '' : 's'}`)}</Option>
                    <Option value="days">{t(`DataAnalysisPage.day${dateIntervalCount <= 1 ? '' : 's'}`)}</Option>
                  </Select>
                </Form.Item>
            }
          </div>
          <div className="measurment-fields">
            <Form.Item
              label={t('DataAnalysisPage.traitCollection')}
            >
              <RemoteSelectField
                className="data-analysis-item"
                url={`${api}/TraitCollection/get?include=all`}
                placeholder={t('DataAnalysisPage.traitCollection')}
                allowClear
                value={traitCollections.map(t => t.id)}
                renderFunction={(tuple) => {
                  return tuple.title;
                }}
                onChange={this.onTraitCollectionChange}
              />
            </Form.Item>
            <Form.Item
              label={t('DataAnalysisPage.traits')}
            >
              <RemoteSelectField
                style={{
                  flex: 1
                }}
                className="data-analysis-item"
                url={`${api}/Trait/get`}
                placeholder={t('DataAnalysisPage.traits')}
                mode="multiple"
                maxTagCount={1}
                allowClear
                sortKey="german"
                value={traits.map(t => t.id)}
                renderFunction={tuple => {
                  return <Tooltip title={tuple.remarks} filterField="german" >
                    <div>{tuple.german}</div>
                  </Tooltip>;
                }}
                onChange={this.onTraitsChange}
              />
            </Form.Item>
            {
              !advancedMode ? null :
                <Form.Item
                  label={t('DataAnalysisPage.includePoints')}
                >
                  <Checkbox
                    style={{
                      alignSelf: 'flex-end'
                    }}
                    checked={includePoints}
                    onChange={this.onIncludePointsChange}
                  >
                    <Tooltip title={t('DataAnalysisPage.includePointsTooltip')}>
                      <Icon type="question-circle" />
                    </Tooltip>
                  </Checkbox>
                </Form.Item>
            }
          </div>
          {
            !advancedMode ? null :
              <div className="temporal-comparsion-fields">
                <Form.Item
                  label={t('DataAnalysisPage.compareByTimestamp')}
                >
                  <Checkbox
                    defaultChecked={compareByTimestamp}
                    checked={compareByTimestamp}
                    onChange={this.onCompareByTimestampChange}
                  >
                    <Tooltip title={t('DataAnalysisPage.compareByTimestampTooltip')}>
                      <Icon type="question-circle" />
                    </Tooltip>
                  </Checkbox>
                </Form.Item>
              </div>
          }
        </div>
        <Toolbar className="bottom-toolbar">
          <SimpleButton
            disabled={count < 1 ||count > 20000}
            tooltip={ count > 20000 ?
              t('DataAnalysisPage.limitSearchs')
              : t('DataAnalysisPage.experiments', {
                count: count
              })
            }
            type="primary"
            onClick={this.search}
          >
            {t('DataAnalysisPage.searchResults', {
              count: count
            })}
            {this.state.counting ? <Icon type="sync" spin/>: null}
            {this.state.searching ? <Icon type="loading"/>: null}
          </SimpleButton>
          <SimpleButton
            type="primary"
            onClick={this.reset}
          >
            {t('DataAnalysisPage.reset')}
          </SimpleButton>
          <SimpleButton
            className="switch-view-button"
            type="primary"
            onClick={this.switchView}
            icon={gridVisible ? 'line-chart' : 'table'}
          >
            {gridVisible ? t('DataAnalysisPage.chartView') : t('DataAnalysisPage.gridView')}
          </SimpleButton>
        </Toolbar>
        {
          storeQueryWindowVisible ?
            <Window
              title={t('DataAnalysisPage.storeQuery')}
              onClose={() => this.setState({storeQueryWindowVisible: false})}
              onEscape={() => this.setState({storeQueryWindowVisible: false})}
              width={800}
              height={400}
              x={(window.innerWidth / 2 - 400) / 2}
              y={(window.innerHeight / 2 - 200) / 2}
              tools={[
                <SimpleButton
                  key="closeButton"
                  icon="close"
                  size="small"
                  tooltip={t('General.close')}
                  onClick={() => this.setState({storeQueryWindowVisible: false})}
                />
              ]}
            >
              <StoreQueryPanel
                onCancel={() => this.setState({storeQueryWindowVisible: false})}
                onStore= {storedQuery => {
                  this.prepareStoredQueries();
                  this.setState({
                    storeQueryWindowVisible: false,
                    storedQueryId: storedQuery ? storedQuery.id : null
                  });
                }}
              />
            </Window> :
            null
        }
      </div>
    );
  }
}

export default DataAnalysisPage;
