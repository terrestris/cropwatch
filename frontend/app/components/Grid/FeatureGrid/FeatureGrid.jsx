import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-i18next';
import {AgGridReact} from 'ag-grid-react';

import OlFormatGeoJSON from 'ol/format/GeoJSON';
import OlFeature from 'ol/Feature';
import OlInteractionSelect from 'ol/interaction/Select';
import {
  pointerMove as pointerMoveCondition
} from 'ol/events/condition';

import {
  get as _get,
  isEqual as _isEqual
} from 'lodash';

import {
  SimpleButton
} from '@terrestris/react-geo';

import GridMenu from '../GridMenu/GridMenu.jsx';

import DateRenderer from '../CellRenderer/DateRenderer.jsx';

import { toggleFeatureGrid } from '../../../actions/AppAction';
import {
  setFilterModel,
  setSortModel
} from '../../../actions/GridAction';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-fresh.css';

import './FeatureGrid.less';
import { EventLogger } from '../../../util/EventLogger';
import { Modal } from 'antd';
import { Style } from 'geostyler';
import GeoStylerGeoJsonParser from 'geostyler-geojson-parser';
import GeoStylerOpenLayersParser from 'geostyler-openlayers-parser';
import { GridUtil } from '../../../util/GridUtil.js';
import { setMeasurementsStyle } from '../../../actions/MeasurementsStyleAction.js';

import de_DE from 'geostyler/dist/locale/de_DE';
import en_US from 'geostyler/dist/locale/en_US';
import i18n from '../../../i18n.js';

@connect((store) => {
  return {
    featureLayer: store.feature.featureLayer,
    hoverLayer: store.feature.hoverLayer,
    selectLayer: store.feature.selectLayer,
    open: store.app.featureGridVisible,
    measurements: store.measurements,
    measurementsStyle: store.measurementsStyle,
    filterModel: store.grid.filterModel,
    sortModel: store.grid.sortModel,
    statistics: store.grid.statistics,
    displayNames: store.entityDisplayValues
  };
})
@translate()
class FeatureGrid extends React.Component {
  static propTypes = {
    map: PropTypes.object,
    dispatch: PropTypes.func,
    t: PropTypes.func,
    width: PropTypes.number,
    open: PropTypes.bool,
    featureLayer: PropTypes.object,
    hoverLayer: PropTypes.object,
    selectLayer: PropTypes.object,
    measurements: PropTypes.object,
    displayNames: PropTypes.object,
    /**
     * The filterModel of the ag-grid.
     * @type {object}
     */
    filterModel: PropTypes.object,
    /**
     * The sortModel of the ag-grid.
     * @type {object}
     */
    sortModel: PropTypes.array,
    statistics: PropTypes.arrayOf(PropTypes.string),
    style: PropTypes.object,
    onStyleButtonClicked: PropTypes.func,
    measurementsStyle: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.geoStylerGeoJsonParser = new GeoStylerGeoJsonParser();

    this.geoStylerOpenLayersParser = new GeoStylerOpenLayersParser();

    this.state = {
      wfsProvider: null,
      columnDefs: [],
      defaultColDef: {
        editable: false
      },
      rowData: null,
      geostylerModalVisible: null,
      geoStylerData: null,
      legendVisible: false
    };
  }

  componentDidMount() {
    this.getColumnDefs();

    const grid = this.grid;
    if (grid) {
      if (this.props.filterModel) {
        grid.api.setFilterModel(this.props.filterModel);
      }
      if (this.props.sortModel) {
        grid.api.setSortModel(this.props.sortModel);
      }
    }

  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.getColumnDefs();

    if (!_isEqual(nextProps.filterModel, this.props.filterModel)) {
      this.grid.api.setFilterModel(nextProps.filterModel);
    }

    if (!_isEqual(nextProps.sortModel, this.props.sortModel)) {
      this.grid.api.setSortModel(nextProps.sortModel);
    }

  }

  componentDidUpdate() {
    if (this.props.map && this.grid) {
      this.updateFeatureLayer();
    }
  }

  getColumnDefs = () => {
    const {
      measurements: {
        experiments,
        traits,
        compareByTimestamp,
        data: baseData,
        groupedData
      },
      t
    } = this.props;
    const data = compareByTimestamp ? groupedData : baseData;
    let days = [];
    if (compareByTimestamp && data.length > 0) {
      days = GridUtil.getUniqueDays(baseData);
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
          // TODO: replace with icon
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

    this.setState({
      columnDefs: defs
    }, this.afterVisiblityChange);
  }

  onGridReady(grid) {
    this.grid = grid;

    grid.api.setFilterModel(this.props.filterModel);
    grid.api.setSortModel(this.props.sortModel);

    if(this.props.measurements.data.length > 0) {
      this.updateFeatureLayer();
    }
  }

  updateFeatureLayer() {
    const {
      featureLayer,
      hoverLayer,
      selectLayer,
      map
    } = this.props;

    if (map.getLayers().getArray().indexOf(featureLayer) === -1) {
      map.addLayer(featureLayer);
    }

    if (map.getLayers().getArray().indexOf(hoverLayer) === -1) {
      this.addHoverLayer();
    }

    if (map.getLayers().getArray().indexOf(selectLayer) === -1) {
      this.addSelectLayer();
    }

    const featureSource = featureLayer.getSource();
    let newFeatures = [];
    this.grid.api.forEachNodeAfterFilterAndSort((row) => {
      const feature = this.getFeatureFromRowData(row.data);
      feature.set('rowNodeId', row.id);
      newFeatures.push(feature);
    });

    // TODO: Improve this check. Features must not be equal if length is equal
    if (newFeatures.length !== featureSource.getFeatures().length) {
      featureSource.clear();
      featureSource.addFeatures(newFeatures);
      this.zoomToMeasurementFeatures();

      this.updateGeostylerData(featureLayer);
    }

  }

  updateGeostylerData = featureLayer => {
    const geoJsonFormat = new OlFormatGeoJSON();
    const features = featureLayer.getSource().getFeatures();

    if (features.length > 0 && this.geoStylerGeoJsonParser) {
      features.forEach((feature, index) => {
        // Ignore invalid geometries since the rtree index in openlayers seems to run in
        // n² complexity (or worse). In tests the app would freeze for several minutes
        // with ~800 invalid point geometries.
        const coords = feature.getGeometry().getCoordinates();
        const invalid = coords.reduce((acc, val) => acc || isNaN(val));
        if (invalid) {
          return;
        }
        if (!feature.getId()) {
          feature.setId('feature_' + index);
        }
      });
      const geoJson = geoJsonFormat.writeFeaturesObject(features);

      this.geoStylerGeoJsonParser.readData(geoJson)
        .then(data => {
          this.setState({
            geoStylerData: data
          });
        })
        .catch(error => {
          EventLogger.log(`GeoStyler Error: ${error}`, 'error', 'FeatureGrid');
        });
    }
  }

  zoomToMeasurementFeatures() {
    const {
      featureLayer,
      map
    } = this.props;
    const featureExtent = featureLayer.getSource().getExtent();
    if (isFinite(featureExtent[0]) && isFinite(featureExtent[1]) &&
      isFinite(featureExtent[2]) && isFinite(featureExtent[3])) {
      map.getView().fit(featureExtent);
    }
  }

  processRowPostCreate = (event) => {
    event.node.addEventListener('mouseEnter', this.onRowMouseEnter);
  }

  addHoverLayer() {
    const {
      map,
      hoverLayer
    } = this.props;
    map.addLayer(hoverLayer);

    const hoverInteraction = new OlInteractionSelect({
      layer: hoverLayer,
      style: hoverLayer.getStyle(),
      filter: (feature, layer) => (layer && layer.get('name') === 'Messungs Geometrien'),
      condition: pointerMoveCondition
    });
    hoverInteraction.on('select', event => {
      const {
        selected,
        deselected
      } = event;
      hoverLayer.getSource().clear();

      deselected.forEach(feature => {
        const row = this.getRowFromFeature(feature);
        if (row) {
          const element = document.querySelector(`div.ag-body-container div[row-index="${row.rowIndex}"]`);
          if (element) {
            element.classList.remove('ag-row-hover');
          }
        }
      });
      selected.forEach(feature => {
        const row = this.getRowFromFeature(feature);
        if (row) {
          const element = document.querySelector(`div.ag-body-container div[row-index="${row.rowIndex}"]`);
          if (element) {
            element.classList.add('ag-row-hover');
          }
        }
      });
    });

    map.addInteraction(hoverInteraction);
  }

  addSelectLayer() {
    const {
      map,
      selectLayer
    } = this.props;
    map.addLayer(selectLayer);

    const selectInteraction = new OlInteractionSelect({
      layer: selectLayer,
      style: selectLayer.getStyle(),
      filter: (feature, layer) => (layer && layer.get('name') === 'Messungs Geometrien'),
      multi: true
    });
    selectInteraction.on('select', event => {
      const {
        selected,
        deselected
      } = event;

      deselected.forEach(feature => {
        const row = this.getRowFromFeature(feature);
        if (row) {
          row.setSelected(false, false);
        }
      });
      selected.forEach(feature => {
        const row = this.getRowFromFeature(feature);
        if (row) {
          row.setSelected(true, false);
        }
      });
    });
    map.addInteraction(selectInteraction);
  }

  onRowMouseEnter = event => {
    const row = event.node;
    // skip statistics row
    if (!row.rowPinned) {
      let hoverSource = this.props.hoverLayer.getSource();
      hoverSource.clear();
      const feature = this.getFeatureFromRowData(row.data);
      hoverSource.addFeature(feature);
    }
  }

  onSelectionChanged() {
    const selectedRows = this.grid.api.getSelectedRows();
    const selectSource = this.props.selectLayer.getSource();
    const features = [];
    selectedRows.forEach((row) => {
      features.push(this.getFeatureFromRowData(row));
    });
    selectSource.clear();
    selectSource.addFeatures(features);
  }

  toggleColumnVisibility(evt, menuItem) {
    let colName = menuItem.props.primaryText;
    let columnDefs = this.state.columnDefs;
    let newColumnDefs = [];

    columnDefs.forEach((col) => {
      if(col.headerName === colName){
        let isHidden = col.hide;
        col.hide = !isHidden;
      }
      newColumnDefs.push(col);
    });

    this.setState({
      columnDefs: newColumnDefs
    }, this.afterVisiblityChange);

  }

  afterVisiblityChange(){
    if (this.grid) {
      this.grid.api.sizeColumnsToFit();
    }
  }

  getRowFromFeature(feature) {
    const rowNodeId = feature.get('rowNodeId');
    return this.grid.api.getRowNode(rowNodeId);
  }

  getFeatureFromRowData(data) {
    const {
      t
    } = this.props;
    const geoJsonFormat = new OlFormatGeoJSON();
    const geom = data.geom || _get(data, 'Plot.geom') || _get(data, 'WeatherStation.geom');
    if (!geom) {
      EventLogger.log(t('FeatureGrid.noGeometry'), 'warning', 'FeatureGrid');
    } else {
      const feature = new OlFeature({
        geometry: geoJsonFormat.readGeometry(geom, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        }),
        ...data
      });
      return feature;
    }
  }

  toggleFeatureGrid = () => {
    this.props.dispatch(toggleFeatureGrid());
  }

  onFilterChanged = () => {
    if (this.grid) {
      const api = this.grid.api;
      this.props.dispatch(setFilterModel(api.getFilterModel()));
    }
  }

  onSortChanged = () => {
    if (this.grid) {
      const api = this.grid.api;
      this.props.dispatch(setSortModel(api.getSortModel()));
    }
  }

  onStyleButtonClicked = () => {
    this.setState({
      geostylerModalVisible: true
    });
  }

  onModalCancel = () => {
    this.setState({
      geostylerModalVisible: false
    });
  }

  onModalOk = () => {
    const {
      featureLayer,
      measurementsStyle
    } = this.props;

    if (measurementsStyle && this.geoStylerOpenLayersParser && featureLayer) {
      this.geoStylerOpenLayersParser
        .writeStyle(measurementsStyle)
        .then(olStyle => featureLayer.setStyle(olStyle))
        .catch(error => {
          EventLogger.log(error, 'warning', 'FeatureGrid');
        });
    }

    this.setState({
      geostylerModalVisible: false
    });
  }

  onStyleChange = (measurementsStyle) => {
    this.setState({
      legendVisible: true
    });
    this.props.dispatch(setMeasurementsStyle(measurementsStyle));
  }

  render() {
    const {
      columnDefs,
      geostylerModalVisible,
      geoStylerData
    } = this.state;
    const {
      t,
      map,
      measurements: {
        compareByTimestamp,
        groupedData,
        data
      },
      measurementsStyle,
      statistics,
      style
    } = this.props;

    const statisticTraitNames = columnDefs
      .filter(colDef => colDef.category === 'trait')
      .map(colDef => colDef.field);
    const statisticRows = GridUtil.getStatisticRows(compareByTimestamp? groupedData :data,
      statistics.filter(statistic => !statistic.startsWith('row')),
      statisticTraitNames
    );

    const geostylerLocale = i18n.language === 'de' ? de_DE : en_US;

    return (
      <div
        className="ag-theme-fresh feature-grid"
        style={style}
      >
        <GridMenu
          title={t('FeatureGrid.measurements')}
          grid={this.grid}
          map={map}
          extraTools={[
            <SimpleButton
              key="geostyler-button"
              icon="paint-brush"
              tooltip={t('FeatureGrid.valueBasedStyling')}
              onClick={this.onStyleButtonClicked}
            />
          ]}
        />
        <div className="grid-wrapper">
          <AgGridReact
            enableSorting={true}
            enableFilter={true}
            enableColResize={true}
            rowData={compareByTimestamp ? groupedData : data}
            rowDeselection
            rowSelection="multiple"
            onSelectionChanged={this.onSelectionChanged.bind(this)}
            columnDefs={columnDefs}
            defaultColDef={this.state.defaultColDef}
            onGridReady={this.onGridReady.bind(this)}
            onFilterChanged={this.onFilterChanged.bind(this)}
            onSortChanged={this.onSortChanged.bind(this)}
            processRowPostCreate={this.processRowPostCreate}
            pinnedBottomRowData={statisticRows}
          />
        </div>

        <Modal
          title="GeoStyler"
          visible={geostylerModalVisible}
          onOk={this.onModalOk}
          onCancel={this.onModalCancel}
          width="70%"
          zIndex={9}
        >
          <Style
            locale={geostylerLocale.GsStyle}
            style={measurementsStyle}
            data={geoStylerData}
            onStyleChange={this.onStyleChange}
            compact={true}
          />
        </Modal>
      </div>
    );
  }
}

export default FeatureGrid;
