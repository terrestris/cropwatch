import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {AgGridReact} from 'ag-grid-react';
import {withRouter} from 'react-router-dom';
import { translate } from 'react-i18next';

import GridMenu from '../GridMenu/GridMenu.jsx';
import DateRenderer from '../CellRenderer/DateRenderer.jsx';
import { GridUtil } from '../../../util/GridUtil';

import {
  get as _get,
  isEqual as _isEqual
} from 'lodash';

import {
  setFilterModel,
  setSortModel
} from '../../../actions/GridAction';

import {
  SimpleButton
} from '@terrestris/react-geo';
import '../../../../node_modules/ag-grid-community/dist/styles/ag-grid.css';
import '../../../../node_modules/ag-grid-community/dist/styles/ag-theme-fresh.css';
import { setGroupedData } from '../../../actions/MeasurementsAction.js';

import './AnalysisGrid.less';

@connect((store) => {
  return {
    app: store.app,
    gridLoading: store.grid.gridLoading,
    measurements: store.measurements,
    filterModel: store.grid.filterModel,
    sortModel: store.grid.sortModel,
    statistics: store.grid.statistics,
    displayNames: store.entityDisplayValues
  };
})
@translate()
@withRouter
class AnalysisGrid extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    t: PropTypes.func,
    onGridReady: PropTypes.func,
    app: PropTypes.object,
    history: PropTypes.object,
    measurements: PropTypes.object,
    statistics: PropTypes.arrayOf(PropTypes.string),
    gridLoading: PropTypes.bool,
    displayNames: PropTypes.object,
    style: PropTypes.object,
    /**
     * The filterModel of the ag-grid.
     * @type {object}
     */
    filterModel: PropTypes.object,
    /**
     * The sortModel of the ag-grid.
     * @type {object}
     */
    sortModel: PropTypes.array
  };

  constructor(props) {
    super(props);

    this.state = {
      colDefs: [],
      grid: null,
      snackBarMessage: '',
      snackBarOpen: false,
      rowData: props.measurements.data,
      statisticRows: []
    };
  }

  componentDidMount = () => {
    const {
      measurements: {
        data,
        experiments,
        traits,
        compareByTimestamp
      },
      statistics
    } = this.props;

    const colDefs = this.getColDefs(traits, experiments, data, compareByTimestamp);

    const statisticTraitNames = colDefs
      .filter(colDef => colDef.category === 'trait')
      .map(colDef => colDef.field);

    this.setState({
      colDefs,
      rowData: data.slice(),
      statisticRows: GridUtil.getStatisticRows(data,
        statistics.filter(statistic => !statistic.startsWith('row')),
        statisticTraitNames
      )
    }, this.afterVisiblityChange);
  }

  UNSAFE_componentWillReceiveProps(props) {
    const {
      traits: newTraits,
      data: newData,
      experiments: newExperiments,
      compareByTimestamp: newCompareByTimestamp,
      groupedData: newGroupedData
    } = props.measurements;
    const {
      traits: oldTraits,
      data: oldData,
      experiments: oldExperiments,
      compareByTimestamp: oldCompareByTimestamp
    } = this.props.measurements;
    let newState = {};
    const oldDisplayNames = this.props.displayNames;
    const newDisplayNames = props.displayNames;
    const oldStatistics = this.props.statistics;
    const newStatistics = props.statistics;

    if (newDisplayNames.experiments !== oldDisplayNames.experiments ||
        newDisplayNames.fields !== oldDisplayNames.fields ||
        newDisplayNames.plots !== oldDisplayNames.plots ||
        newData !== oldData ||
        newExperiments !== oldExperiments ||
        newTraits !== oldTraits ||
        newCompareByTimestamp !== oldCompareByTimestamp ||
        oldStatistics !== newStatistics
    ) {
      const data = newData.slice();
      newState.colDefs = this.getColDefs(newTraits, newExperiments, data, newCompareByTimestamp);
      const statisticTraitNames = newState.colDefs
        .filter(colDef => colDef.category === 'trait')
        .map(colDef => colDef.field);
      newState.statisticRows = GridUtil.getStatisticRows(newCompareByTimestamp? newGroupedData :data,
        props.statistics.filter(statistic => !statistic.startsWith('row')),
        statisticTraitNames
      );
      newState.rowData = data.slice();
    }

    if (!_isEqual(props.filterModel, this.props.filterModel)) {
      this.state.grid.api.setFilterModel(props.filterModel);
    }

    if (!_isEqual(props.sortModel, this.props.sortModel)) {
      this.state.grid.api.setSortModel(props.sortModel);
    }

    this.setState(newState, this.afterVisiblityChange);
  }

  getColDefs(traits, experiments, data, compareByTimestamp) {
    const {
      dispatch,
      t
    } = this.props;

    let days = [];
    if (compareByTimestamp && data.length > 0) {
      days = GridUtil.getUniqueDays(data);
      data = GridUtil.groupDataByTimestamp(data, traits);
      dispatch(setGroupedData(data));
    }

    const containsPlots = !!data.find(tuple => tuple.PlotID !== undefined);
    const containsWeatherStations = !!data.find(tuple => tuple.WeatherStationD !== undefined);
    const containsGeoms = !!data.find(tuple => tuple.geom !== undefined);

    let defs = [
      {
        headerName: t('Entities.plot'),
        headerTooltip: t('Entities.plot'),
        category: 'allocation',
        field: 'Plot.name',
        hide: !containsPlots,
        menuTabs: [
          'filterMenuTab',
          'generalMenuTab',
          'columnsMenuTab'
        ]
      },
      {
        headerName: t('Entities.weatherstation'),
        headerTooltip: t('Entities.weatherstation'),
        category: 'allocation',
        field: 'WeatherStationID',
        hide: !containsWeatherStations,
        cellRenderer: (cell) => {
          const weatherStation = cell.data.WeatherStation;
          if (weatherStation) {
            return `${weatherStation.name} (${weatherStation.harvestyear})`;
          } else {
            return cell.value;
          }
        }
      },
      {
        headerName: t('AnalysisGrid.geometry') + ' (WGS 84)' ,
        headerTooltip: t('AnalysisGrid.geometry') + ' (WGS 84)' ,
        category: 'allocation',
        field: 'geom',
        hide: !containsGeoms,
        cellRenderer: (cell) => {
          const geometryType = _get(cell, 'value.type');
          if (cell.data.PlotID || cell.data.WeatherStationID) {
            return '';
          } else if (!geometryType) {
            return 'Invalid geometry';
          } else if (geometryType === 'Point') {
            return cell.value.coordinates.join(', ');
          }
          // : replace with icon
          return geometryType;
        }
      },
      {
        headerName: t('AnalysisGrid.timestamp'),
        headerTooltip: t('AnalysisGrid.timestamp'),
        category: 'allocation',
        field: 'timestamp',
        hide: compareByTimestamp,
        cellRendererFramework: DateRenderer
      }
    ];

    if (containsPlots) {
      const plotAssociationColumns = GridUtil.getPlotAssociationColumns(t);
      const plotPropertyColumns = GridUtil.getPlotPropertyColumns(t);
      const sortAttriubteColumns = GridUtil.getSortAttributeColumns(data);
      defs = [
        ...defs,
        ...plotAssociationColumns,
        ...plotPropertyColumns,
        ...sortAttriubteColumns
      ];
    }

    const experimentalFactorColumns = GridUtil.getExperimentalFactorColumns(experiments, t);
    const traitColumns = GridUtil.getTraitColumns(traits, compareByTimestamp, days);
    const statisticTraitNames = traitColumns.map(colDef => colDef.field);
    const statisticColumns = GridUtil.getStatisticColumns(
      statisticTraitNames,
      t
    );
    defs = [
      ...defs,
      ...experimentalFactorColumns,
      ...traitColumns,
      ...statisticColumns
    ];

    return defs;
  }

  afterVisiblityChange() {
    if (this.state.grid) {
      this.state.grid.api.sizeColumnsToFit();
    }
  }

  onGridReady(grid) {
    const {
      onGridReady,
      filterModel,
      sortModel
    } = this.props;

    this.setState({grid});
    if (onGridReady) {
      onGridReady(grid);
    }
    grid.api.setFilterModel(filterModel);
    grid.api.setSortModel(sortModel);
  }

  onSnackBarClose = () => {
    this.setState({
      snackBarOpen: false
    });
  }

  onFilterChanged = () => {
    if (this.state.grid) {
      const api = this.state.grid.api;
      this.props.dispatch(setFilterModel(api.getFilterModel()));
    }
  }

  onSortChanged = () => {
    if (this.state.grid) {
      const api = this.state.grid.api;
      this.props.dispatch(setSortModel(api.getSortModel()));
    }
  }

  getLoadingOverlayerTpl () {
    const {
      t
    } = this.props;
    return `<span className="ag-overlay-loading-center"><i class="fa fa-spinner fa-spin fa-3x fa-fw"></i> ${t('AnalysisGrid.dataLoading')} ...</span>`;
  }

  export = () => {
    this.state.grid.api.exportDataAsCsv();
  }

  render() {
    const {
      colDefs,
      grid,
      rowData,
      statisticRows
    } = this.state;

    const {
      gridLoading,
      measurements: {
        compareByTimestamp,
        groupedData
      },
      style,
      t
    } = this.props;

    if (grid && grid.api) {
      if (gridLoading) {
        grid.api.showLoadingOverlay();
      } else {
        grid.api.hideOverlay();
      }
    }

    return (
      <div
        className="page ag-theme-fresh analysis-grid"
        style={style}
      >
        <GridMenu
          title={t('AnalysisGrid.measurements')}
          grid={grid}
          extraTools={[
            <SimpleButton
              key="export"
              icon="file"
              tooltip={t('AnalysisGrid.exportAsCsv')}
              disabled={rowData.length === 0}
              onClick={this.export}
            />
          ]}
        />
        <div className="grid-wrapper">
          <AgGridReact
            enableSorting={true}
            enableFilter={true}
            enableColResize={true}
            rowData={compareByTimestamp ? groupedData : rowData}
            columnDefs={colDefs}
            onGridReady={this.onGridReady.bind(this)}
            onFilterChanged={this.onFilterChanged.bind(this)}
            onSortChanged={this.onSortChanged.bind(this)}
            overlayLoadingTemplate={this.getLoadingOverlayerTpl()}
            pinnedBottomRowData={statisticRows}
          />
        </div>
      </div>
    );
  }
}

export default AnalysisGrid;
