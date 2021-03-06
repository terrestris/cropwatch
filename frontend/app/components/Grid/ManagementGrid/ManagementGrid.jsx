import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';

import {AgGridReact} from 'ag-grid-react';

import moment from 'moment';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import OlFormatWKT from 'ol/format/WKT';
import OlFeature from 'ol/Feature';

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
  Switch,
  Popconfirm,
  Modal
} from 'antd';
const { Option } = Select;

import { Api } from '../../../util/Api';
import FloatingSelectCellEditor from '../FloatingSelectCellEditor/FloatingSelectCellEditor.jsx';
import ObjectGrid from '../ObjectGrid/ObjectGrid.jsx';
import FeatureEditor from '../../FeatureEditor/FeatureEditor.jsx';

proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');

import { StringUtils } from '../../../util/StringUtils';
import { FileHandling } from '../../../util/FileHandling';
import { EventLogger } from '../../../util/EventLogger';

import './ManagementGrid.less';

@translate()
class ManagementGrid extends React.Component {

    static propTypes = {
      t: PropTypes.func,
      dispatch: PropTypes.func,
      modelName: PropTypes.string,
      modelDescription: PropTypes.object,
      style: PropTypes.object,
      columnBlackList: PropTypes.arrayOf(PropTypes.string),
      columnWhiteList: PropTypes.arrayOf(PropTypes.string), // WhiteList wins!
      pinnedFields: PropTypes.arrayOf(PropTypes.string),
      autoLoad: PropTypes.bool,
      importMode: PropTypes.bool
    };

    static defaultProps = {
      importMode: false,
      pinnedFields: [],
      columnBlackList: ['id', 'createdAt', 'updatedAt']
    }

    constructor(props) {
      super(props);
      this.state = {
        clickedRowId: -1,
        clickedAttribute: null,
        columnDefs: [],
        csvData: [{}],
        csvHeaders: [],
        defaultColDef: {
          editable: true,
          minWidth: 150,
          suppressKeyboardEvent: params => params.editing
        },
        deleteButtonActive: false,
        dirtyRowIds: [],
        editFeature: null,
        editJsonB: {},
        enableSorting: true,
        existingData: [],
        featureEditorOpen: false,
        fieldDelimiter: ';',
        floatingTopRowData: [],
        grid: null,
        gridStatus: 'ok',
        idMaps: {},
        importMode: props.importMode || false,
        jsonBEditorOpen: false,
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
        return {'font-weight': 'bold', 'background': 'linear-gradient(#fff, #ccc)', 'text-align': 'center'};
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
    }

    /**
     * Updates the columns and loads new Data.
     *
     * @return {Promise} The getModelDescription Promise.
     */
    updateGrid() {
      this.setState({
        gridStatus: 'loading'
      });
      return Api.getModelDescription(this.props.modelName)
        .then(description => {
          this.setColumns(description);
          if (this.state.grid) {
            this.state.grid.api.sizeColumnsToFit();
          }
          this.setState({
            gridStatus: 'ok',
            modelDescription: description
          });
        })
        .catch(error => {
          const statusMessage = error.message;
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
        });
    }

    /**
     * React Lifecycle method.
     */
    componentDidMount() {
      if (this.props.modelName) {
        this.updateGrid()
          .then(() => {
            if (this.props.autoLoad) {
              this.getAllEntities();
            }
          });
      }
    }

    /**
     * React Lifecycle method.
     *
     * @param {Object} prevProps The props before the Update.
     */
    componentDidUpdate(prevProps) {
      if (this.props.modelName !== prevProps.modelName) {
        this.updateGrid()
          .then(() => {
            if (this.props.autoLoad) {
              this.getAllEntities();
            }
          });
      }
    }

    /**
     * Transform factors of this pattern:
     *    '[FACTOR1]: [VALUE1], [FACTOR2]: [VALUE2], …
     * to JSON String
     * @param {*} object
     */
    transformToJsonString = (factors, idMap) => {
      const keys = [];
      const values = [];
      const invalidFactors = [];
      const factorsObject = {};
      const { t } = this.props;
      factors.split(',').forEach(f => {
        keys.push(f.split(':')[0].trim());
        values.push(f.split(':')[1].trim());
      });

      keys.forEach((k, i) => {
        const id = Object.keys(idMap).find(id => {
          return k === idMap[id];
        });
        if (!id && !invalidFactors.includes(k)) {
          invalidFactors.push(k);
        } else {
          factorsObject[id] = values[i];
        }
      });

      if (invalidFactors.length > 0) {
        const statusMessage = t('ManagementGrid.csv.unknownExperimentalFactors', {
          invalidFactors: invalidFactors.join(' & ')
        });
        this.setState({
          gridStatus: 'error',
          statusMessage
        });
        EventLogger.log(statusMessage, 'error', 'Management');
      } else {
        return JSON.stringify(factorsObject);
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
     * Get all Entities of the current selected model and set it as rowData and
     * existingData in the state.
     *
     * @return {Promise} The getAllEntitiesPromise
     */
    getAllEntities = () => {
      const {
        modelName,
        t
      } = this.props;
      const {
        associations
      } = this.state.modelDescription;

      this.setState({
        gridStatus: 'loading'
      });
      return Api.getAllEntities(modelName)
        .then(data => {
          data.forEach(entity => {
            if (entity.geom) {
              entity.geom = GeometryUtil.transformGeoJSONtoWKT(entity.geom);
            }
            Object.keys(associations).forEach(associationKey => {
              if (Array.isArray(entity[associationKey])) {
                entity[associationKey] = entity[associationKey].map(val => val.id);
              }
            });
          });
          const statusMessage = t('ManagementGrid.loadingSuccess', {
            count: data.length,
            modelName: t(`Entities.${modelName.toLowerCase()}`)
          });
          this.setState({
            rowData: data,
            existingData: data,
            gridStatus: 'ok',
            statusMessage
          });
          EventLogger.log(statusMessage, 'success', 'Management');
        })
        .catch(error => {
          const statusMessage = error.message;
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
        });
    }

    /**
     * Implementation of the Ag-Grid rowGetter method.
     */
    rowGetter = i => {
      return this.state.rows[i];
    }

    /**
     * Adds rows tot the grid.
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
     * Implementation of the cellRenderer method of Ag-grid.
     *
     * @param {Object} params The params given to this method as specified by Ag-grid.
     * @return {Element} The html Element to render in the cell.
     */
    cellRenderer = params => {
      const {
        colDef,
        attribute,
        data,
        value
      } = params;

      if (colDef.field === 'geom') {
        const openMapIcon = document.createElement('i');
        openMapIcon.className = value
          ? 'fa fa-map bmel-green-text'
          : 'fa fa-map-o bmel-brown-text';
        openMapIcon.style.fontSize = '16px';
        openMapIcon.style.float = 'right';
        openMapIcon.style.cursor = 'pointer';
        openMapIcon.addEventListener('click', this.openFeatureEditor);
        return openMapIcon;
      }

      if (attribute.dataType === 'JSONB' && colDef.field === 'factors') {
        if (data && value) {
          const idMap = this.state.idMaps['ExperimentalFactor'];
          const object = JSON.parse(value);
          let output = '';
          Object.keys(object).forEach((key, i) => {
            if (i > 0) {
              output += ', ';
            }
            output += `${idMap[key]}: ${object[key]}`;
          });
          return output;
        }
      }

      // AssociationColumn
      if (attribute && !attribute._modelAttribute) {
        const modelName = attribute.options.name.singular;
        if (data && value) {
          const idMap = this.state.idMaps[modelName];
          let displayValue;
          if (Array.isArray(value)) {
            if (value.length > 0 && idMap) {
              displayValue = value.map(id => idMap[id]).join(', ');
            } else {
              displayValue = '';
            }
          } else if (idMap) {
            displayValue = idMap[value];
          }
          return `${displayValue} `;
        } else if (value) {
          return value;
        }
      }

      const [
        isValid,
        validationError
      ] = this.validateValue(colDef.field, value);

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

      // fall back to the json string. In case an object is returned, all hell breaks loose
      if (attribute.dataType === 'JSONB') {
        return JSON.stringify(params.value);
      }

      return params.value !== undefined && params.value !== null
        ? params.value
        : '';
    }

    /**
     * Custom validation function to validate a given field and a corresponding
     * value.
     * @param {String} field The name of the field to validate.
     * @param {*} vale The value of the cell.
     * @return {Array} Returns an array with the validatiuinstatus as first item
     * and an error message as second item.
     */
    validateValue = (field, value) => {
      const { t } = this.props;
      const {
        modelDescription
      } = this.state;
      const fieldDesc = _get(modelDescription, `attributes.${field}`);
      let valid = true;
      let error = '';

      if (!fieldDesc) {
        return [true];
      }

      const isString = (typeof value === 'string' || value instanceof String);

      if (!value) {
        if (fieldDesc.allowNull === false) {
          valid = false;
          error = t('ManagementGrid.validation.isRequired', {field: field});
        } else {
          return [true];
        }
      }

      switch (fieldDesc.type) {
        case 'DOUBLE PRECISION':
          if (typeof value === 'number' || (isString && value.length === 0)) {
            break;
          }
          if (Number.isNaN(parseFloat(value))) {
            valid = false;
            error = t('ManagementGrid.validation.isNotANumber', {field: field});
          }
          if (value && value.includes(',')) {
            valid = false;
            error = t('ManagementGrid.validation.decimalSeperator', {field: field});
          }
          break;
        case 'INTEGER':
          if (Number.isInteger(value) || (isString && value.length === 0)) {
            break;
          }
          if (Number.isNaN(parseFloat(value))) {
            valid = false;
            error = t('ManagementGrid.validation.isNotANumber', {field: field});
          }
          if (value && (value.includes(',') || !Number.isInteger(parseFloat(value)))) {
            valid = false;
            error = t('ManagementGrid.validation.isNotAnInteger', {field: field});
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
          geometry
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
     * Determines if a column should be hidden in the grid by its name.
     *
     * @param {String} columName The column to check.
     */
    shouldColumnBeHidden = columnName => {
      const inBlackList = this.props.columnBlackList.includes(columnName);
      let hideColumn = inBlackList;

      if(this.props.columnWhiteList && this.props.columnWhiteList.length > 0) {
        const inWhiteList = this.props.columnWhiteList.includes(columnName);
        hideColumn = !inWhiteList;
      }
      return hideColumn;
    }

    /**
     * Create the column definitions from the model description.
     *
     * @param {Object} description The model description as returned by our backend
     * describeModel interface.
     */
    setColumns = description => {
      let columnDefs = [];
      const {
        attributes,
        associations
      } = description;

      columnDefs = [
        {
          minWidth: 40,
          maxWidth: 40,
          width: 40,
          pinned: 'left',
          headerCheckboxSelection: true,
          checkboxSelection: true
        },
        ...this.createAssociationColumns(associations),
        ...this.createAttributeColumns(attributes)
      ];

      this.setState({
        columnDefs: columnDefs
      });
    }

    /**
     * Creates the ColumnDefinitions for attributes.
     *
     * @param {Object[]} attributes Array of attributes as returned by our backend
     * describeModel interface.
     * @return {columnDef} Column Definiton object.
     */
    createAttributeColumns = attributes => {
      return Object.keys(attributes)
        // Attributes without references are associations we handle them later
        .filter(attribute => !attributes[attribute].references)
        .map(name => {
          const attribute = attributes[name];
          let colDef = this.createColDef(attribute);

          // Special JSONB handling
          if (attribute.dataType === 'JSONB') {
            colDef.onCellClicked = params => {
              if(!params.node.isRowPinned()) {
                this.setState({
                  clickedRowId: params.node.id,
                  clickedAttribute: attribute,
                  jsonBEditorOpen: true
                });
              }
            };
            if (attribute.fieldName === 'factors') {
              this.getIdMapForModel('ExperimentalFactor');
            }
          }
          return colDef;
        });
    }

    /**
     * Creates the ColumnDefinitions for associations.
     *
     * @param {Object[]} associations Array of associations as returned by our backend
     * describeModel interface.
     * @return {columnDef} Column Definiton object.
     */
    createAssociationColumns = associations => {
      return Object.keys(associations)
        .filter(name => {
          const type = associations[name].associationType;
          // We don't want to edit "Has*" associations as the key lies
          // in the table of the associated model. You can edit the association
          // there.
          return !(type === 'HasMany' || type === 'HasOne');
        })
        .map(name => {
          const attribute = associations[name];
          const modelName = attribute.options.name.singular;

          this.getIdMapForModel(modelName);

          const colDef = this.createColDef(attribute);

          return colDef;
        });
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

      // As Precrop is an alias for Crop we have to replace it here.
      // TODO: Would be nice if we could find an better alternative for this manual approach.
      const alias = modelName === 'Precrop' ? 'Crop' : undefined;

      Api.getIdMap(alias || modelName)
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
          const statusMessage = error.message;
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
        });
    }

    /**
     * Create the column definition for an attribute of the model.
     * @param {Object} attribute The attribute description as returned by our
     * backend interface describeModel.
     * @return {columnDef} Column Definiton object.
     */
    createColDef = attribute => {
      let name;
      let headerName;

      if(attribute._modelAttribute) {
        name = attribute.field;
        headerName = attribute.allowNull === false ? `${name}*` : name;
      } else {
        const allowNull = !(attribute.foreignKeyAttribute.allowNull === false);
        const {
          foreignKey,
          associationType,
          as
        } = attribute;
        name = associationType === 'BelongsToMany' ? as : foreignKey;
        headerName =  allowNull ? as : `${as}*`;
      }

      return {
        headerName: headerName,
        headerTooltip: headerName,
        hide: this.shouldColumnBeHidden(name),
        field: name,
        pinned: this.props.pinnedFields.includes(name) ? 'left' : undefined,
        pinnedRowCellRenderer: this.pinnedRowCellRenderer,
        cellEditorFramework: FloatingSelectCellEditor,
        cellEditorParams: {
          attribute: attribute,
          values: this.state.csvHeaders,
          grid: this
        },
        cellRenderer: this.cellRenderer,
        cellRendererParams: {
          attribute: attribute
        },
        comparator: GridComparator
      };
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
     * Sets rowData and dirtyRowIds.
     *
     * @param {Object} evtObj The object of the change event.
     */
    onCellValueChanged = evtObj => {
      let gridApi = this.state.grid.api;
      let rowNodes = gridApi.getRenderedNodes();
      let lastRenderedRowNode = rowNodes[(rowNodes.length - 1)];
      let value = evtObj.newValue;

      // We are in the csvHeader row
      if(evtObj.node.rowPinned){
        const selectedColumn = evtObj.colDef.field;
        const attribute = evtObj.colDef.cellRendererParams.attribute;
        const isAssociationCol = !attribute._modelAttribute;
        let currentData = this.state.rowData;
        let workData = currentData.map(row => ({...row}));
        let modelName;
        let idMap;

        if (isAssociationCol) {
          modelName = attribute.options.name.singular;
          idMap = this.state.idMaps[modelName];
        } else if (attribute.dataType === 'JSONB') {
          // TODO This is just a guess:
          idMap = this.state.idMaps['ExperimentalFactor'];
        }

        workData.forEach((row, index) => {
          const csvValue = _get(this.state.csvData, `[${index}][${value}]`);
          if (csvValue) {
            let transformedValue = csvValue;
            if (isAssociationCol){
              if (attribute.isMultiAssociation) {
                const csvValues = csvValue
                  .split(',')
                  .map(v => v.trim());
                transformedValue = Object.keys(idMap)
                  .filter(id => {
                    const value = idMap[id];
                    return csvValues.includes(value);
                  })
                  .map(v => parseInt(v, 10));
              } else {
                transformedValue = Object.keys(idMap)
                  .find(id => idMap[id] === csvValue.trim());
                transformedValue = parseInt(transformedValue, 10);
              }
            }
            else if (selectedColumn === 'timestamp') {
              const m = moment.utc(csvValue);
              transformedValue = m.toISOString();
            }
            if (attribute.dataType === 'JSONB') {
              if(attribute.fieldName === 'characteristics') {
                transformedValue = value;
              } else {
                transformedValue = this.transformToJsonString(csvValue, idMap);
              }
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
        if (!this.isEmptyRow(lastRenderedRowNode) && this.state.importMode) {
          this.addEmptyRow();
        }

        const rowId = evtObj.node.id;

        const dirtyRowIds = [...this.state.dirtyRowIds];
        if(!dirtyRowIds.includes(rowId)){
          dirtyRowIds.push(rowId);
        }

        this.setState({
          rowData: this.getGridData(),
          dirtyRowIds: dirtyRowIds
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
              const statusMessage = t('ManagementGrid.csv.parsed', {
                fileName: file.name,
                count: results.data.length
              });
              this.setState({
                gridStatus: 'ok',
                statusMessage
              });
              EventLogger.log(statusMessage, 'success', 'Management');
            })
            .catch(error => {
              const statusMessage = t('ManagementGrid.csv.parsingError', {error});
              this.setState({
                gridStatus: 'error',
                statusMessage
              });
              EventLogger.log(statusMessage, 'error', 'Management');
            });
        } else {
          const statusMessage = t('ManagementGrid.csv.noCsvFile');
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
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
      const {t} = this.props;
      const {
        columnDefs
      } = this.state;
      const csvHeaders = this.getCsvHeaders(data);
      const floatingTopRowData = {};

      // The csv file contains at least one empty header column. We
      // define this as an invalid input. And inform the user.
      if (csvHeaders.includes('')) {
        const statusMessage = t('ManagementGrid.csv.emptyHeader');
        this.setState({
          gridStatus: 'error',
          statusMessage
        });
        EventLogger.log(statusMessage, 'error', 'Management');
        return;
      }

      const idMap = this.state.idMaps['ExperimentalFactor'];
      const csvData = data.map(o => {
        if (o.factors && o.factors.includes(':')) {
          o.factors = this.transformToJsonString(o.factors, idMap);
        }
        return ({...o});
      });

      // Delete all not associated columns from the data before setting it as
      // rowData
      const fields = columnDefs.map(colDef => colDef.field);
      data.forEach(tuple => {
        const props = Object.keys(tuple);
        props.forEach(prop => {
          if (!fields.includes(prop)) {
            delete tuple[prop];
          }
        });
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
        csvHeaders.forEach(header => {
          if (columnDef.field === header) {
            floatingTopRowData[columnDef.field] = header;
          }
        });
      });

      this.state.grid.api.setPinnedTopRowData(this.state.floatingTopRowData);
    }

    /**
     * Sends a request to the backend to create new data and reloads all Entities
     * on success.
     *
     */
    onImportClicked = () => {
      const {
        modelName,
        t
      } = this.props;

      const pureData = this.getGridData();
      const columnDefs = this.state.columnDefs;
      const columnNames = [];
      const filteredData = [];

      columnDefs.forEach((columnDef) => {
        columnNames.push(columnDef.field);
      });

      pureData.forEach((rowData) => {
        const pureRowData = {};

        Object.keys(rowData).forEach((key) => {
          if (columnNames.includes(key)) {
            const isString = (typeof rowData[key] === 'string' || rowData[key] instanceof String);

            if (key === 'geom' && isString && rowData[key].length > 0) {
              const geoJson = GeometryUtil.transformWKTtoGeoJSON(rowData[key]);
              pureRowData[key] = geoJson;
            } else if (rowData[key] && !(isString && rowData[key].length === 0)) {
              pureRowData[key] = rowData[key];
            }
          }
        });

        if (Object.keys(pureRowData).length > 0) {
          filteredData.push(pureRowData);
        }
      });

      const statusMessage = t('ManagementGrid.importing');
      this.setState({
        gridStatus: 'loading',
        statusMessage
      });
      Api.createEntities(modelName, filteredData)
        .then(() => {
          this.clearCsvData();
          this.setState({
            dirtyRowIds: [],
            importMode: false
          });
          this.getAllEntities()
            .then(() => {
              const statusMessage = t('ManagementGrid.importSuccess', {
                count: filteredData.length,
                modelName: t(`Entities.${modelName.toLowerCase()}`)
              });
              this.setState({
                gridStatus: 'ok',
                statusMessage
              });
              EventLogger.log(statusMessage, 'success', 'Management');
            });
        })
        .catch(error => {
          const statusMessage = error.message;
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
        });
    }

    /**
     * Sends a request to the backend to update data and reloads all Entities
     * on success.
     */
    onSaveChanges = () => {
      const {
        modelName,
        t
      } = this.props;
      const {
        dirtyRowIds
      } = this.state;

      const dirtyRows = dirtyRowIds.map(this.getRowData);

      dirtyRows.forEach(rowData => {
        Object.keys(rowData).forEach((key) => {
          if (key === 'geom' && rowData[key]) {
            if(typeof rowData[key] === 'string' || rowData[key] instanceof String) {
              const geoJson = GeometryUtil.transformWKTtoGeoJSON(rowData[key]);
              rowData[key] = geoJson;
            }
          }
        });
      });

      const statusMessage = t('ManagementGrid.saving');
      this.setState({
        gridStatus: 'loading',
        statusMessage
      });

      Api.updateEntities(modelName, dirtyRows)
        .then(() => {
          this.setState({
            dirtyRowIds: [],
            importMode: false
          });
          this.getAllEntities()
            .then(() => {
              const statusMessage = t('ManagementGrid.saveSuccess', {
                count: dirtyRowIds.length,
                modelName: t(`Entities.${modelName.toLowerCase()}`)
              });
              this.setState({
                gridStatus: 'ok',
                statusMessage
              });
              EventLogger.log(statusMessage, 'sucess', 'Management');
            });
        })
        .catch(error => {
          const statusMessage = error.message;
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
        });
    }

    /**
     * Sends a request to the backend to delete the selected data and reloads
     * all Entities on success.
     */
    onDeleteClicked = () => {
      const {
        modelName,
        t
      } = this.props;
      let selectedRows = this.state.grid.api.getSelectedNodes();
      let ids = selectedRows.map((rowNode)=>{
        return rowNode.data.id;
      });

      Api.deleteEntities(modelName, ids)
        .then(() => {
          this.setState({importMode: false});
          this.getAllEntities()
            .then(() => {
              const statusMessage = t('ManagementGrid.deleteSuccess', {
                count: ids.length,
                modelName: t(`Entities.${modelName.toLowerCase()}`)
              });
              this.setState({
                gridStatus: 'ok',
                statusMessage,
                deleteButtonActive: this.state.grid.api.getSelectedNodes().length > 0
              });
              EventLogger.log(statusMessage, 'sucess', 'Management');
            });
        })
        .catch(error => {
          const statusMessage = error.message;
          this.setState({
            gridStatus: 'error',
            statusMessage
          });
          EventLogger.log(statusMessage, 'error', 'Management');
        });
    }

    /**
     * Implementation of the onSelectionChange method of ag-grid.
     *
     * It sets the visibility of the deleteButton depending on the amount of
     * selectRows and the status of importMode.
     */
    onSelectionChange = () => {
      const selectedRows = this.state.grid.api.getSelectedNodes();
      this.setState({
        deleteButtonActive: selectedRows.length > 0 && !this.state.importMode
      });
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
     * Sets the rowData and importMode depending on the switchedOn value.
     *
     * @param {boolean} switchedOn The status of the importMode Toggle button.
     */
    onImportModeToggle = switchedOn => {
      if(switchedOn && this.state.csvData.length < 1){
        this.addEmptyRow();
      }

      this.setState({
        importMode: switchedOn,
        rowData: switchedOn ? this.state.csvData : this.state.existingData
      });

      let topRowData = [];
      if (this.state.csvHeaders.length > 0) {
        topRowData = this.state.floatingTopRowData;
      }
      this.state.grid.api.setPinnedTopRowData(switchedOn ? topRowData : []);
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
      const focusedCell = api.getFocusedCell();
      const rowIndex = focusedCell.rowIndex;
      const id = api.getDisplayedRowAtIndex(rowIndex).id;
      const wkt = formatWKT.writeGeometry(editFeature.getGeometry(), {
        dataProjection: 'EPSG:25832',
        featureProjection: 'EPSG:4326'
      });

      if (id) {
        this.updateValue(id, focusedCell.column.colId, wkt);
      } else {
        rowData[rowIndex][focusedCell.column.colId] = wkt;
        api.redrawRows();
      }

      this.setState({
        editFeature: null,
        featureEditorOpen: false
      });

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
     *
     *
     * @param {Number} id The Data id of the entity to change.
     *                    THIS IS NOT EQUIVALENT TO THE ID FROM AG-GRID!
     * @param {String} attribute The attribute
     * @param {*} value
     */
    updateValue = (id, attribute, value) => {
      const {
        rowData,
        dirtyRowIds,
        grid: {
          api
        }
      } = this.state;
      const index = this.getRowIndex(id);
      let newData = [...rowData];
      newData[index][attribute] = value;

      let newDirtyIds = [...dirtyRowIds];
      if (!newDirtyIds.includes(id)) {
        newDirtyIds.push(id);
      }

      this.setState({
        rowData: newData,
        dirtyRowIds: newDirtyIds
      }, () => {
        // TODO: Add edited id to only rerender changed row
        api.redrawRows();
      });
    }

    /**
     *
     * @param {Number} id The AG-GRID id of the rowNode to change.
     *                    THIS IS NOT data.id! --> as it does not exists on new records
     * @return {Object} The matched rowData.
     */
    getRowData = id => {
      return this.state.grid.api.getRowNode(id).data;
    }

    /**
     *
     * @param {Number} id The AG-GRID id of the rowNode to change.
     *                    THIS IS NOT data.id! --> as it does not exists on new records
     * @return {Object} The matched row index.
     */
    getRowIndex = id => {
      const {
        rowData
      } = this.state;
      const dataId = this.state.grid.api.getRowNode(id).data.id;
      return rowData.findIndex(row => row.id === dataId);
    }

    /**
     * Callback for the jsonB editors ok button.
     *
     * Sets the current editJsonB as string to the edited cell.
     */
    onJsonBEditorOk = () => {
      const {
        clickedAttribute,
        clickedRowId,
        editJsonB
      } = this.state;

      const stringified = JSON.stringify(editJsonB);
      const coerced = StringUtils.coerce(stringified);
      const jsonB = JSON.stringify(coerced);
      this.updateValue(clickedRowId, clickedAttribute.fieldName, jsonB);

      this.setState({
        jsonBEditorOpen: false
      });
    }

    /**
     * Callback for the jsonB editors close button.
     *
     * Closes the jsonBEditor and sets the editJsonB to null.
     */
    onJsonBEditorCancel = () => {
      this.setState({
        editJsonB: null,
        jsonBEditorOpen: false
      });
    }

    /**
     * Callback for the jsonB editors onChange method.
     *
     * Sets the jsonBEditor.
     *
     * @param {Object} jsonB The jsonB object.
     */
    onJsonBChanged = jsonB => {
      this.setState({
        editJsonB: jsonB
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
        clickedRowId,
        clickedAttribute,
        columnDefs,
        defaultColDef,
        deleteButtonActive,
        dirtyRowIds,
        enableSorting,
        featureEditorOpen,
        editFeature,
        fieldDelimiter,
        importMode,
        modelDescription,
        gridStatus,
        jsonBEditorOpen,
        rowData,
        textDelimiter,
        textEncoding
      } = this.state;

      const saveChangesVisible = dirtyRowIds.length > 0 && !importMode;
      const geometryType = _get(modelDescription, 'attributes.geom.type.type');

      let clickedRow = {};
      let jsonBValue;
      let jsonB;
      let jsonBKeyModel;
      let jsonBKeyModelDisplayField;
      if (clickedRowId !== -1) {
        clickedRow = this.getRowData(clickedRowId);
        if (jsonBEditorOpen) {
          jsonBValue = clickedRow[clickedAttribute.fieldName];
          jsonBKeyModel = clickedAttribute.fieldName === 'factors' ? 'ExperimentalFactor' : 'factors';
          jsonBKeyModelDisplayField = 'german';
          jsonB = jsonBValue ? JSON.parse(jsonBValue) : null;
        }
      }

      return (
        <div
          className="management-grid ag-theme-fresh"
        >
          <div className="management-grid-header">
            <Toolbar className="management-grid-import-toolbar">
              <span>
                {t('General.edit')}
                <Switch
                  disabled={this.props.importMode}
                  onChange={this.onImportModeToggle}
                  checked={importMode}
                />
                {t('General.import')}
              </span>
              {
                importMode ?
                  <span>
                    {t('ManagementGrid.encoding')}:
                    <Select
                      value={textEncoding}
                      onChange={this.onTextEncodingSelected}
                    >
                      <Option value="latin1">ISO-8859-1 (Latin-1)</Option>
                      <Option value="utf8">Unicode (UTF-8)</Option>
                    </Select>
                  </span> : null
              }
              {
                importMode ?
                  <span>
                    {t('ManagementGrid.fieldSeperator')}:
                    <Select
                      value={fieldDelimiter}
                      onChange={this.onFieldDelimiterSelected}
                    >
                      <Option value="\t">{t('ManagementGrid.tabulator')}</Option>
                      <Option value=",">{t('ManagementGrid.comma')}</Option>
                      <Option value=";">{t('ManagementGrid.semicolon')}</Option>
                      <Option value=" ">{t('ManagementGrid.space')}</Option>
                    </Select>
                  </span> : null
              }
              {
                importMode ?
                  <span>
                    {t('ManagementGrid.textSeperator')}:
                    <Select
                      value={textDelimiter}
                      onChange={this.onTextDelimiterSelected}
                    >
                      <Option value={'"'}>{t('ManagementGrid.doubleQuote')}</Option>
                      <Option value="'">{t('ManagementGrid.singleQuote')}</Option>
                    </Select>
                  </span> : null
              }
              {
                importMode ?
                  <UploadButton
                    onChange={this.onInputChange}
                    icon="upload"
                  >
                    <SimpleButton>{t('ManagementGrid.csvFile')}</SimpleButton>
                  </UploadButton> : null
              }
            </Toolbar>
          </div>
          <div className="management-grid-grid">
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
              rowHeight={32}
              rowSelection="multiple"
              suppressMovableColumns={true}
              suppressRowClickSelection={true}
              singleClickEdit={true}
            />
          </div>
          <div className="management-grid-footer">
            <Toolbar className="management-grid-edit-toolbar">
              <span className="status">
                <Icon
                  type={this.getStatusIcon()}
                  className={`status-${gridStatus}`}
                />
                {this.getStatusMessage()}
              </span>
              {
                importMode
                  ? <SimpleButton
                    onClick={this.onImportClicked}
                  >
                    {t('ManagementGrid.importData')}
                  </SimpleButton>
                  : <span>
                    <Popconfirm
                      title={t('ManagementGrid.deleteConfirm')}
                      onConfirm={this.onDeleteClicked}
                      okText={t('General.yes')}
                      cancelText={t('General.no')}
                    >
                      <SimpleButton
                        icon="trash-o"
                        disabled={!deleteButtonActive}
                      >
                        {t('General.delete')}
                      </SimpleButton>
                    </Popconfirm>
                    <Popconfirm
                      title={t('ManagementGrid.saveConfirm')}
                      onConfirm={this.onSaveChanges}
                      okText={t('General.yes')}
                      cancelText={t('General.no')}
                    >
                      <SimpleButton
                        icon="floppy-o"
                        disabled={!saveChangesVisible}
                      >
                        {t('General.save')}
                      </SimpleButton>
                    </Popconfirm>
                  </span>
              }
            </Toolbar>
          </div>
          <Modal
            className="feature-editor-modal"
            width="50%"
            title={t('ManagementGrid.featureEditorTitle')}
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
          <Modal
            className="json-b-editor-modal"
            width="50%"
            title={t('ManagementGrid.jsonBEditorTitle')}
            visible={jsonBEditorOpen}
            onOk={this.onJsonBEditorOk}
            onCancel={this.onJsonBEditorCancel}
            okText={t('General.ok')}
            cancelText={t('General.cancel')}
            destroyOnClose
          >
            <ObjectGrid
              experimentID={
                Array.isArray(clickedRow.ExperimentID)
                  ? clickedRow.ExperimentID[0]
                  : clickedRow.ExperimentID
              }
              keyModel={jsonBKeyModel}
              keyModelDisplayField={jsonBKeyModelDisplayField}
              object={jsonB}
              onObjectChanged={this.onJsonBChanged}
            />
          </Modal>
        </div>
      );
    }
}

export default ManagementGrid;
