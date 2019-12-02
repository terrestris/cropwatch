import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';

import {AgGridReact} from 'ag-grid-react';

import moment from 'moment';

import proj4 from 'proj4';
import OlFormatWKT from 'ol/format/WKT';
import OlFeature from 'ol/Feature';
import {register} from 'ol/proj/proj4';

import GeometryUtil from '../../../util/GeometryUtil';

import {
  Toolbar,
  SimpleButton,
  UploadButton
} from '@terrestris/react-geo';

import {
  get as _get
} from 'lodash';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-fresh.css';

import GridComparator from '../Comparator';
import {
  Icon,
  Select,
  Modal
} from 'antd';
const { Option } = Select;

import { Api } from '../../../util/Api';
import FloatingSelectCellEditor from '../FloatingSelectCellEditor/FloatingSelectCellEditor.jsx';
import FeatureEditor from '../../FeatureEditor/FeatureEditor.jsx';

proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');

import { FileHandling } from '../../../util/FileHandling';
import { EventLogger } from '../../../util/EventLogger';

import './ImportGrid.less';

@connect(store => {
  return {
    user: store.app.user
  };
})
@translate()
class ImportGrid extends React.Component {

    static propTypes = {
      t: PropTypes.func,
      dispatch: PropTypes.func,
      style: PropTypes.object,
      traits: PropTypes.arrayOf(PropTypes.object),
      user: PropTypes.object,
      experiment: PropTypes.object.isRequired
    };

    constructor(props) {
      super(props);
      this.state = {
        columnDefs: [],
        csvData: [{}],
        csvHeaders: [],
        defaultColDef: {
          editable: true,
          minWidth: 150,
          suppressKeyboardEvent: params => params.editing
        },
        editFeature: null,
        enableSorting: true,
        existingData: [],
        file: null,
        featureEditorOpen: false,
        fieldDelimiter: ';',
        floatingTopRowData: [],
        grid: null,
        gridStatus: 'ok',
        idMaps: {},
        importData: [],
        rowData: [{}],
        statusMessage: null,
        textDelimiter: '"',
        textEncoding: 'utf8'
      };
      register(proj4);
    }

    /**
     * Implementation of the Ag-Grid getRowStyle method.
     *
     * @param {Object} params The params passed by Ag-Grid.
     * @return {Object} Stylingobject
     */
    getRowStyle = (params) => {
      if (params.node.floating) {
        return {'font-weight': 'bold', 'background': 'linear-gradient(#fff, ccc)', 'text-align': 'center'};
      }
    }

    /**
     * Get the value from the focused cell.
     */
    getValueFromFocusedCell = () => {
      const api = this.state.grid.api;
      const focusedColumn = this.getFocusedColumn();
      const focusedRowNode = this.getFocusedRowNode();
      return api.getValue(focusedColumn, focusedRowNode);
    }

    /**
     * Get the focused cell.
     */
    getFocusedCell = () => {
      const api = this.state.grid.api;
      return api.getFocusedCell();
    }

    /**
     * Get the focused column from the focused cell;
     */
    getFocusedColumn = () => {
      return this.getFocusedCell().column;
    }

    /**
     * Get the focused RowNode from the API.
     */
    getFocusedRowNode = () => {
      const api = this.state.grid.api;
      return api.getRenderedNodes()[this.getFocusedCell().rowIndex];
    }

    /**
     * Ag-Grid lifecycle method.
     */
    onGridReady = grid => {
      this.setState({grid});
      this.getIdMapForModel('Trait');
      this.getIdMapForModel('Plot');
      this.getIdMapForModel('WeatherStation');
    }

    /**
     * React Lifecycle method.
     */
    componentDidMount() {
      this.updateColumns();
    }

    /**
     * React Lifecycle method.
     *
     * @param {Object} prevProps The props before the Update.
     */
    componentDidUpdate(prevProps) {
      const {
        traits,
        experiment
      } = this.props;
      if (traits.length !== prevProps.traits.length) {
        this.updateColumns();
      }
      if (experiment.id !== prevProps.experiment.id) {
        this.getIdMapForModel('Plot');
      }
    }

    /**
     * Clears every csv-relevant info from the state and clears the
     * pinnedTopRowData from the grid.
     */
    clearCsvData = () => {
      this.setState({
        csvHeaders: [],
        csvData: [
          {}
        ],
        floatingTopRowData: []
      });
      this.state.grid.api.setPinnedTopRowData([]);
    }

    /**
     * Implementation of the Ag-Grid rowGetter method.
     */
    rowGetter = i => {
      return this.state.rows[i];
    }

    /**
     * Adds rows to the grid.
     * @param {Object[]} rowData Array of data objects to add to the grid.
     */
    addRows = rowData => {
      this.state.grid.api.updateRowData({add: rowData});
    }

    /**
     * Adds an empty line to the end of the grid.
     */
    addEmptyRow = () => {
      this.addRows([{}]);
    }

    /**
     * Get the grids data via grid API.
     *
     * @return {Object[]} The grids data as an array of data objects.
     */
    getGridData = () => {
      const gridApi = this.state.grid.api;
      const rowData = [];
      gridApi.forEachNode(node => rowData.push(node.data));
      return rowData;
    }

    /**
     * Checks if a given rowNode is empty (has no data values).
     * @param {RowNode} rowNode An Ag-Grid rowNode.
     * @return {boolean} If the row is empty or not.
     */
    isEmptyRow = rowNode => {
      let isEmptyRow = true;

      Object.keys(rowNode.data).forEach((key) => {
        if (rowNode.data[key] && rowNode.data[key] !== '') {
          isEmptyRow = false;
          return false;
        }
      });

      return isEmptyRow;
    }

    /**
     * Implementation of the pinnedRowCellRenderer method of Ag-grid.
     *
     * @param {Object} params The params given to this method as specified by Ag-grid.
     * @return {Element} The html Element to render in the cell.
     */
    pinnedRowCellRenderer = params => {
      let container = document.createElement('div');
      let text = document.createElement('span');
      let pinnedIcon = document.createElement('i');

      text.innerHTML = params.value;

      pinnedIcon.className = 'fa fa-caret-down';
      pinnedIcon.style.fontSize = '16px';
      pinnedIcon.style.float = 'right';
      pinnedIcon.style.cursor = 'pointer';

      container.appendChild(text);
      container.appendChild(pinnedIcon);

      return container;
    }

    /**
     * Custom validation function to validate a given field and a corresponding
     * value.
     * @param {Object} trait The trait to validate.
     * @param {*} value The value of the cell.
     * @return {Array} Returns an array with the validationstatus as first item
     * and an error message as second item.
     */
    validateValue = (trait, value) => {
      const { t } = this.props;
      let valid = true;
      let error = '';

      if (!trait || !value || value.length === 0) {
        return [true];
      }

      const isString = (typeof value === 'string' || value instanceof String);

      switch (trait.type) {
        case 'DOUBLE PRECISION':
          if (typeof value === 'number' || (isString && value.length === 0)) {
            break;
          }
          if (Number.isNaN(parseFloat(value))) {
            valid = false;
            error = t('ImportGrid.validation.isNotANumber', {trait: trait.german});
          }
          if (value && value.includes(',')) {
            valid = false;
            error = t('ImportGrid.validation.decimalSeperator', {trait: trait.german});
          }
          break;
        case 'INTEGER':
          if (Number.isInteger(value) || (isString && value.length === 0)) {
            break;
          }
          if (Number.isNaN(parseFloat(value))) {
            valid = false;
            error = t('ImportGrid.validation.isNotANumber', {trait: trait.german});
          }
          if (value && (value.includes(',') || !Number.isInteger(parseFloat(value)))) {
            valid = false;
            error = t('ImportGrid.validation.isNotAnInteger', {trait: trait.german});
          }
          break;
        default:
          break;
      }

      return [valid, error];
    }

    /**
     * Open the mapWindow to edit geographical data (geom).
     */
    openFeatureEditor = () => {
      const wktGeometry = this.getValueFromFocusedCell();
      const formatWKT = new OlFormatWKT();

      if(wktGeometry){
        const geometry = formatWKT.readGeometry(wktGeometry, {
          dataProjection: 'EPSG:25832', // CSV input projection
          featureProjection: 'EPSG:4326'
        });

        const feature = new OlFeature({
          geometry: geometry
        });

        this.setState({
          featureEditorOpen: true,
          editFeature: feature
        });
      } else {
        this.setState({
          featureEditorOpen: true,
          editFeature: null
        });
      }

    }

    /**
     * Update the column definitions.
     */
    updateColumns() {
      let columnDefs = [];
      columnDefs = [
        ...this.createDefaultColumns(),
        ...this.createTraitColumns()
      ];
      this.setState({
        columnDefs: columnDefs
      });
    }

    /**
     * Creates the default column definitions.
     *
     * @return {Object[]} An array of column definitions.
     */
    createDefaultColumns() {
      const plotColumn = this.createAssociationColumn('Plot');
      const weatherStationColumn = this.createAssociationColumn('WeatherStation');
      const geomColumn = {
        headerName: 'Geometrie',
        headerTooltip: 'Geometrie',
        field: 'geom',
        pinnedRowCellRenderer: this.floatingHeaderCellRendererFunc,
        cellEditorFramework: FloatingSelectCellEditor,
        cellEditorParams: {
          values: this.state.csvHeaders,
          grid: this
        },
        cellRenderer: params => {
          const openMapIcon = document.createElement('i');
          openMapIcon.className = params.value
            ? 'fa fa-map bmel-green-text'
            : 'fa fa-map-o bmel-brown-text';
          openMapIcon.style.fontSize = '16px';
          openMapIcon.style.float = 'right';
          openMapIcon.style.cursor = 'pointer';
          openMapIcon.addEventListener('click', this.openFeatureEditor);
          return openMapIcon;
        }
      };

      const timeColumn = {
        pinnedRowCellRenderer: this.floatingHeaderCellRendererFunc,
        cellEditorFramework: FloatingSelectCellEditor,
        cellEditorParams: {
          values: this.state.csvHeaders,
          grid: this
        },
        headerName: 'Zeitpunkt',
        headerTooltip: 'Zeitpunkt',
        field: 'timestamp'
      };

      return [
        plotColumn,
        weatherStationColumn,
        geomColumn,
        timeColumn
      ];
    }

    /**
     * Creates the column definitions for the associations.
     *
     * @param {String} modelName The name of the associated model.
     * @return {Object[]} An array of column definitions.
     */
    createAssociationColumn = (modelName) => {
      const {
        t,
        experiment
      } = this.props;
      const mockAttribute = {
        options: {
          name: {
            singular: modelName
          }
        }
      };
      const filter = plot => plot.ExperimentID === experiment.id;

      return {
        pinnedRowCellRenderer: this.floatingHeaderCellRendererFunc,
        headerName: t(`Entities.${modelName.toLowerCase()}`),
        headerTooltip: t(`Entities.${modelName.toLowerCase()}`),
        editable: true,
        field: modelName + 'ID',
        cellEditorFramework: FloatingSelectCellEditor,
        cellEditorParams: {
          attribute: mockAttribute,
          values: this.state.csvHeaders,
          grid: this,
          remoteSelectFieldFilterFunction: modelName === 'Plot' ? filter : undefined
        },
        cellRenderer: this.entityCellRender,
        cellRendererParams: {
          attribute: mockAttribute
        },
        comparator: GridComparator
      };
    }

    /**
      * Implementation of the cellRenderer method of Ag-grid for the HeaderCells.
     *
     * @param {Object} params The params given to this method as specified by Ag-grid.
     * @return {Element} The html Element to render in the cell.
     */
    floatingHeaderCellRendererFunc(params) {
      let container = document.createElement('div');
      let text = document.createElement('span');
      let pinnedIcon = document.createElement('i');

      text.innerHTML = params.value;

      pinnedIcon.className = 'fa fa-caret-down';
      pinnedIcon.style.fontSize = '16px';
      pinnedIcon.style.float = 'right';
      pinnedIcon.style.cursor = 'pointer';

      container.appendChild(text);
      container.appendChild(pinnedIcon);

      return container;
    }

    /**
      * Implementation of the cellRenderer method of Ag-grid for Entity columns.
     *
     * @param {Object} params The params given to this method as specified by Ag-grid.
     * @return {Element} The html Element to render in the cell.
     */
    entityCellRender = params => {
      const {
        data,
        value,
        attribute
      } = params;
      if (data && value) {
        const modelName = attribute.options.name.singular;
        const idMap = this.state.idMaps[modelName];
        let displayValue;
        if (Array.isArray(value)) {
          if (value.length > 0 && idMap) {
            displayValue = value.map(id => idMap[id]).join(', ');
          } else {
            displayValue = '';
          }
        } else {
          displayValue = idMap[value];
        }
        return `${displayValue} `;
      } else if (value) {
        return value;
      } else {
        return '';
      }
    }

    /**
     * Implementation of the cellRenderer method of Ag-grid for the TraitColumns.
     *
     * @param {Object} params The params given to this method as specified by Ag-grid.
     * @return {Element} The html Element to render in the cell.
     */
    traitCellRenderer = params => {
      const {
        trait,
        value
      } = params;

      const [
        isValid,
        validationError
      ] = this.validateValue(trait, value);

      if (!isValid) {
        const container = document.createElement('span');
        container.className = 'invalid';
        const openMapIcon = document.createElement('i');
        openMapIcon.className = 'fa fa-exclamation-circle';
        openMapIcon.style.color = 'red';
        openMapIcon.style.fontSize = '16px';
        openMapIcon.style.float = 'right';
        openMapIcon.style.cursor = 'pointer';
        openMapIcon.title = validationError;

        container.innerHTML = params.value
          ? params.value
          : '';
        container.appendChild(openMapIcon);

        return container;
      }

      return params.value !== undefined && params.value !== null
        ? params.value
        : '';
    }

    /**
     * Get the idMap for a given model and set it to the state. Compare backend service method for
     * details.
     *
     * @param {String} modelName The model name to get the idMap for.
     */
    getIdMapForModel = modelName => {
      this.setState({
        gridStatus: 'loading'
      });
      Api.getIdMap(modelName, {experimentId: this.props.experiment.id })
        .then(data => {
          const idMaps = {};
          idMaps[modelName] = data;
          this.setState({
            idMaps: {
              ...this.state.idMaps,
              ...idMaps
            },
            gridStatus: 'ok'
          });
          // If we allready got data we have to rerender the cells
          if (this.state.rowData && this.state.grid.api) {
            this.state.grid.api.redrawRows();
          }
        })
        .catch(error => {
          this.setState({
            gridStatus: 'error',
            statusMessage: error.message
          });
          EventLogger.log(error.message, 'error', 'Import');
        });
    }

    /**
     * Creates the column definitions for the traits.
     *
     * @return {Object[]} An array of column definitions.
     */
    createTraitColumns() {
      const {
        traits
      } = this.props;

      return traits.map(trait => {
        return {
          pinnedRowCellRenderer: this.floatingHeaderCellRendererFunc,
          headerName: trait.german,
          headerTooltip: trait.german,
          field: trait.id.toString(),
          editable: true,
          comparator: GridComparator,
          cellRenderer: this.traitCellRenderer,
          cellRendererParams: {
            trait: trait
          },
          cellEditorFramework: FloatingSelectCellEditor,
          cellEditorParams: {
            values: this.state.csvHeaders,
            grid: this
          }
        };
      });
    }

    /**
     * Get the Headers from csvData
     *
     * @param {Object[]} csvData The csvData as an Array of Data objects.
     * @return {String[]} The headers.
     */
    getCsvHeaders(csvData) {
      if (Array.isArray(csvData) && csvData.length > 0) {
        return Object.keys(csvData[0]);
      }
    }

    /**
     * Implementation of the Ag-Grid onCellValueChanged method.
     * Sets rowData.
     *
     * @param {Object} evtObj The object of the change event.
     */
    onCellValueChanged = evtObj => {
      const {
        csvData,
        grid,
        idMaps,
        rowData
      } = this.state;

      let gridApi = grid.api;
      let rowNodes = gridApi.getRenderedNodes();
      let lastRenderedRowNode = rowNodes[(rowNodes.length - 1)];
      let value = evtObj.newValue;

      // We are in the csvHeader row
      if(evtObj.node.rowPinned){
        const selectedColumn = evtObj.colDef.field;
        const attribute = evtObj.colDef.cellRendererParams ?
          evtObj.colDef.cellRendererParams.attribute :
          null;
        let isAssociationCol;
        let currentData = rowData;
        let workData = currentData.map(row => ({...row}));
        let modelName;
        let idMap;

        if (attribute) {
          modelName = attribute.options.name.singular;
          idMap = idMaps[modelName];
          isAssociationCol = !attribute._modelAttribute;
        }

        workData.forEach((row, index) => {
          const csvValue = _get(csvData, `[${index}][${value}]`);
          if (csvValue) {
            let transformedValue = csvValue;
            if (isAssociationCol){
              transformedValue = Object.keys(idMap)
                .find(id => idMap[id] === csvValue.trim());
              transformedValue = parseInt(transformedValue, 10);
            }
            else if (selectedColumn === 'timestamp') {
              const m = moment.utc(csvValue);
              transformedValue = m.toISOString();
            }

            row[selectedColumn] = transformedValue;
          }
        });

        this.setState({
          rowData: workData
        }, () => {
          gridApi.refreshCells();
        });
      } else {
        if (!this.isEmptyRow(lastRenderedRowNode)) {
          this.addEmptyRow();
        }

        this.setState({
          rowData: this.getGridData()
        });
      }
    }

    /**
     * Handler for the change event of the upload button. Parses the CSV and set
     * the result as csvData.
     *
     * @param {Event} e The change event of the hidden input field.
     */
    onInputChange = e => {
      const {t} = this.props;
      const file = e.target.files[0];
      const {
        fieldDelimiter,
        textDelimiter,
        textEncoding
      } = this.state;
      const config = {
        delimiter: fieldDelimiter,
        quoteChar: textDelimiter,
        encoding: textEncoding
      };
      if (file) {
        if (file.type.includes('csv') || file.name.includes('csv')) {
          this.setState({
            gridStatus: 'loading',
            statusText: 'Parsing CSV file…'
          });
          FileHandling.parseCsv(file, config)
            .then(results => {
              this.setCsvData(results.data);
              const message = t('ImportGrid.csv.parsed', {
                fileName: file.name,
                count: results.data.length
              });
              this.setState({
                gridStatus: 'ok',
                statusMessage: message
              });
              EventLogger.log(message, 'success', 'Import');
            })
            .catch(error => {
              const statusMessage = t('ImportGrid.csv.parsingError', {error});
              this.setState({
                gridStatus: 'error',
                statusMessage
              });
              EventLogger.log(statusMessage, 'error', 'Import');
            });
        } else {
          const statusMessage = t('ImportGrid.csv.noCsvFile');
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Import');
        }
      }
    }

    /**
     * Reads the CSV data and sets a floatingTopRowData, csvHeaders, csvData and
     * rowData in the state.
     *
     * @param {Object[]} data The CSV data.
     */
    setCsvData = data => {
      const {
        t
      } = this.props;
      const csvHeaders = this.getCsvHeaders(data);
      const columnDefs = this.state.columnDefs;
      const floatingTopRowData = {};

      // The csv file contains at least one empty header column. We
      // define this as an invalid input. And inform the user.
      if (csvHeaders.includes('')) {
        const statusMessage = t('ImportGrid.csv.emptyHeader');
        this.setState({
          gridStatus: 'error',
          statusMessage: statusMessage
        });
        EventLogger.log(statusMessage, 'error', 'Import');
        return;
      }

      const csvData = data.map(o => {
        return ({...o});
      });

      this.setState({
        csvHeaders: csvHeaders,
        csvData: csvData,
        rowData: data,
        floatingTopRowData: [floatingTopRowData]
      });

      // Tell the floating DropDownMenu what values can be chosen.
      columnDefs.forEach(columnDef => {
        if (columnDef.cellEditorParams) {
          columnDef.cellEditorParams.values = csvHeaders;
        }
      });

      // If the CSV contains a column which matches an entity field we
      // selecet the matching value in the floating DropDownMenu.
      columnDefs.forEach(columnDef => {
        csvHeaders.forEach((header) => {
          if (columnDef.field === header) {
            floatingTopRowData[columnDef.field] = header;
          }
        });
      });

      this.state.grid.api.setPinnedTopRowData([floatingTopRowData]);
    }

    /**
     * Transforms the grid data from current row layout to one line per trait.
     *
     * @param {Object[]} importData
     * @return {Object[]} The transformed MeasurementData
     */
    transfomToMeasurementData(importData) {
      const {
        user
      } = this.props;
      const {
        idMaps
      } = this.state;
      const traitIdMap = idMaps.Trait;
      let measurementData = [];

      importData.forEach(row => {
        let columnNames = Object.keys(row);
        let spatialReference;

        columnNames.forEach(columnName => {
          if (columnName === 'geom' ||
          columnName === 'WeatherStationID' ||
          columnName === 'PlotID') {
            spatialReference = columnName;
          }
        });

        columnNames.forEach(columnName => {
          if (Number.isInteger(parseInt(columnName, 10)) &&
          Object.keys(traitIdMap).includes(columnName)) {
            let preparedRow = {};
            preparedRow.timestamp = row.timestamp;
            preparedRow.username = user.username;
            preparedRow.value = row[columnName];
            preparedRow.TraitID = parseInt(columnName, 10);
            preparedRow[spatialReference] = row[spatialReference];
            measurementData.push(preparedRow);
          }
        });
      });

      return measurementData;
    }

    /**
     * Remove empty values from rowData;
     * @param {*} rowData
     */
    removeEmptyValues(rowData) {
      let columnNames = Object.keys(rowData);
      columnNames.forEach(columnName => {
        if (!rowData[columnName] || rowData[columnName] === '') {
          delete rowData[columnName];
        }
      });
      return rowData;
    }

    /**
     * Check if a row just got one spatial reference (geom, plot or weatherstation)
     * @param {*} row
     */
    rowHasOneSpatialReference(row) {
      let columnNames = Object.keys(row);
      let spatialReferences = 0;

      columnNames.forEach(columnName => {
        if (columnName === 'geom' ||
            columnName === 'WeatherStationID' ||
            columnName === 'PlotID') {
          ++spatialReferences;
        }
      });
      return spatialReferences === 1;
    }

    /**
     * Sends a request to the backend to create new data and reloads all Entities
     * on success.
     *
     */
    onImportClicked = () => {
      const { t } = this.props;
      const { grid } = this.state;
      grid.api.stopEditing();
      const gridData = this.getGridData().map(row => ({...row}));
      let invalidColumns = [];
      let importData = [];
      gridData.forEach(row => {
        let columnNames = Object.keys(row);
        let preparedRow;

        preparedRow = this.removeEmptyValues(row);

        if (Object.keys(row).length === 0) {
          return;
        }
        if (!this.rowHasOneSpatialReference(preparedRow)) {
          invalidColumns.push(preparedRow);
        }

        columnNames.forEach((columnName) => {
          const value = preparedRow[columnName];
          const isString = (typeof value === 'string' || value instanceof String);
          if (columnName === 'geom' && isString && value.length > 0) {
            const geoJson = GeometryUtil.transformWKTtoGeoJSON(value);
            preparedRow[columnName] = geoJson;
          }
        });
        importData.push(preparedRow);
      });

      if (invalidColumns.length > 0) {
        const statusMessage = t('ImportGrid.invalidData');
        this.setState({
          gridStatus: 'error',
          statusMessage
        });
        EventLogger.log(statusMessage, 'error', 'Import');
      } else {
        const measurementData = this.transfomToMeasurementData(importData);
        if (measurementData) {
          const statusMessage = t('ImportGrid.importing');
          this.setState({
            gridStatus: 'loading',
            statusMessage
          });
          Api.createEntities('Measurement', measurementData)
            .then(() => {
              this.clearCsvData();
              const statusMessage = t('ImportGrid.importSuccess', {
                count: measurementData.length
              });
              this.setState({
                gridStatus: 'ok',
                statusMessage
              });
              EventLogger.log(statusMessage, 'success', 'Import');
            })
            .catch(error => {
              const statusMessage = t('ImportGrid.importError', {error});
              this.setState({
                gridStatus: 'error',
                statusMessage
              });
              EventLogger.log(statusMessage, 'error', 'Import');
            });
        }
      }
    }

    /**
     * Changelistener for the fieldDelimiter Select field. Sets the fieldDelimiter
     * in the state.
     *
     * @param {String} fieldDelimiter The selected fieldDelimiter;
     */
    onFieldDelimiterSelected = fieldDelimiter => {
      this.setState({fieldDelimiter});
    }

    /**
     * Changelistener for the textDelimiter Select field. Sets the textDelimiter
     * in the state.
     *
     * @param {String} textDelimiter The selected textDelimiter;
     */
    onTextDelimiterSelected = textDelimiter => {
      this.setState({textDelimiter});
    }

    /**
     * Changelistener for the textEncoding Select field. Sets the textEncoding
     * in the state.
     *
     * @param {String} textEncoding The selected textEncoding;
     */
    onTextEncodingSelected = textEncoding => {
      this.setState({textEncoding});
    }

    /**
     * Get the rowIndex from the rowId.
     *
     * @param {Integer} rowId The given rowId.
     * @return {Integer} The rowIndex.
     */
    rowIndexFromRowId = rowId => {
      return this.state.grid.api.getRowNode(rowId).childIndex;
    }

    /**
     * Get the rowId from the rowIndex.
     *
     * @param {Integer} rowId The given rowIndex.
     * @return {Integer} The rowId.
     */
    rowIdFromRowIndex = rowIndex => {
      let rowId;
      this.state.grid.api.forEachNode((node) => {
        if (node.childIndex === rowIndex) {
          rowId = node.id;
        }
      });
      return rowId;
    }

    /**
     * Callback for the feature editors ok button.
     *
     * Sets the geometry of the current editFeature as wkt to the edited cell.
     */
    onFeatureEditorOk = () => {
      const {
        editFeature,
        rowData,
        grid: {
          api
        }
      } = this.state;
      const formatWKT = new OlFormatWKT();
      const focussedCell = api.getFocusedCell();
      const rowIndex = focussedCell.rowIndex;
      const rowId = this.rowIdFromRowIndex(rowIndex);
      const wkt = formatWKT.writeGeometry(editFeature.getGeometry(), {
        dataProjection: 'EPSG:25832',
        featureProjection: 'EPSG:4326'
      });

      rowData[rowIndex][focussedCell.column.colId] = wkt;

      this.setState({
        rowData,
        editFeature: null,
        featureEditorOpen: false
      });

      api.redrawRows(rowId);
    }

    /**
     * Callback for the feature editors close button.
     *
     * Closes the featureEditor and sets the editFeature to null.
     */
    onFeatureEditorCancel = () => {
      this.setState({
        editFeature: null,
        featureEditorOpen: false
      });
    }

    /**
     * Callback for the feature editors onChange method.
     *
     * Sets the editFeature.
     *
     * @param {OlFeature} feature The edited feature.
     */
    onFeatureEditorChange = feature => {
      this.setState({
        editFeature: feature
      });
    }

    /**
     * Get the status text from the state or get the default text for the
     * current gridStatus.
     */
    getStatusMessage = () => {
      const {t} = this.props;
      const {
        gridStatus,
        statusMessage
      } = this.state;
      if (statusMessage) {
        return statusMessage;
      }
      switch (gridStatus) {
        case 'ok':
          return t('General.ok');
        case 'loading':
          return t('General.loading');
        case 'error':
          // 'General.error' should usualy not be shown. Provide a statusMessage.
          return t('General.error');
        case 'warning':
          // 'General.warning' should usualy not be shown. Provide a statusMessage.
          return t('General.warning');
        default:
          break;
      }
    };

    /**
     * Get the status icon by the gridStatus from the state.
     */
    getStatusIcon = () => {
      const {gridStatus} = this.state;
      switch (gridStatus) {
        case 'ok':
          return 'check-circle-o';
        case 'loading':
          return 'loading';
        case 'warning':
          return 'warning';
        case 'error':
          return 'exclamation-circle-o';
        default:
          return 'check-circle-o';
      }
    }

    render() {
      const {
        t
      } = this.props;
      const {
        columnDefs,
        defaultColDef,
        enableSorting,
        featureEditorOpen,
        editFeature,
        fieldDelimiter,
        modelDescription,
        gridStatus,
        rowData,
        textDelimiter,
        textEncoding
      } = this.state;

      const geometryType = _get(modelDescription, 'attributes.geom.type.type');

      return (
        <div className="import-grid ag-theme-fresh">
          <div className="import-grid-header">
            <Toolbar className="import-grid-import-toolbar">
              <span>
                {t('ImportGrid.encoding')}:
                <Select
                  value={textEncoding}
                  onChange={this.onTextEncodingSelected}
                >
                  <Option value="latin1">ISO-8859-1 (Latin-1)</Option>
                  <Option value="utf8">Unicode (UTF-8)</Option>
                </Select>
              </span>
              <span>
                {t('ImportGrid.fieldSeperator')}:
                <Select
                  value={fieldDelimiter}
                  onChange={this.onFieldDelimiterSelected}
                >
                  <Option value="\t">{t('ImportGrid.tabulator')}</Option>
                  <Option value=",">{t('ImportGrid.comma')}</Option>
                  <Option value=";">{t('ImportGrid.semicolon')}</Option>
                  <Option value=" ">{t('ImportGrid.space')}</Option>
                </Select>
              </span>
              <span>
                {t('ImportGrid.textSeperator')}:
                <Select
                  value={textDelimiter}
                  onChange={this.onTextDelimiterSelected}
                >
                  <Option value={'"'}>{t('ImportGrid.doubleQuote')}</Option>
                  <Option value="'">{t('ImportGrid.singleQuote')}</Option>
                </Select>
              </span>
              <UploadButton
                onChange={this.onInputChange}
                icon="upload"
              >
                <SimpleButton>{t('ImportGrid.csvFile')}</SimpleButton>
              </UploadButton>
            </Toolbar>
          </div>
          <div className="import-grid-grid">
            <AgGridReact
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              enableColResize={true}
              enableSorting={enableSorting}
              getRowStyle={this.getRowStyle}
              onCellValueChanged={this.onCellValueChanged}
              onGridReady={this.onGridReady}
              onSelectionChanged={this.onSelectionChange}
              rowData={rowData}
              rowGetter={this.rowGetter}
              rowSelection="multiple"
              suppressMovableColumns={true}
              suppressRowClickSelection={true}
              singleClickEdit={true}
            />
          </div>
          <div className="import-grid-footer">
            <Toolbar className="import-grid-edit-toolbar">
              <span className="status">
                <Icon
                  type={this.getStatusIcon()}
                  className={`status-${gridStatus}`}
                />
                {this.getStatusMessage()}
              </span>
              <SimpleButton
                onClick={this.onImportClicked}
              >
                {t('ImportGrid.importData')}
              </SimpleButton>
            </Toolbar>
          </div>
          <Modal
            className="feature-editor-modal"
            width="50%"
            title={t('ImportGrid.featureEditorTitle')}
            visible={featureEditorOpen}
            onOk={this.onFeatureEditorOk}
            onCancel={this.onFeatureEditorCancel}
            okText={t('General.ok')}
            cancelText={t('General.cancel')}
            destroyOnClose
          >
            <FeatureEditor
              feature={editFeature}
              onChange={this.onFeatureEditorChange}
              geometryTypes={geometryType ? [geometryType] : undefined}
            />
          </Modal>
        </div>
      );
    }
}

export default ImportGrid;
