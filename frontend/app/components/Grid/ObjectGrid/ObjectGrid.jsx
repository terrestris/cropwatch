import React from 'react';
import PropTypes from 'prop-types';

import {AgGridReact} from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-fresh.css';

import EntityEditor from '../CellEditor/EntityEditor.jsx';
import { Api } from '../../../util/Api';

import './ObjectGrid.less';

class ObjectGrid extends React.Component {

  static propTypes = {
    dispatch: PropTypes.func,
    object: PropTypes.object,
    experimentID: PropTypes.number,
    keyModel: PropTypes.string,
    keyModelDisplayField: PropTypes.string,
    onObjectChanged: PropTypes.func
  };

  constructor(props) {
    super(props);
    const {
      object
    } = this.props;
    this.state = {
      keyEntities: [],
      rowData: object ? this.objectToRowData(object) : [{}]
    };
  }

  getPossibleKeys() {
    const {
      experimentID,
      keyModel
    } = this.props;
    const {
      gridApi
    } = this.state;

    if (experimentID) {
      Api.getEntityById('Experiment', experimentID)
        .then(data => {
          this.setState({
            keyEntities: data.ExperimentalFactors
          }, () => { gridApi.redrawRows();});
        });
    } else if(keyModel) {
      Api.getAllEntities(keyModel)
        .then(data => {
          this.setState({
            keyEntities: data
          }, () => { gridApi.redrawRows();});
        });
    }
  }

  cellRenderer = (params) => {
    const {
      keyEntities
    } = this.state;
    const {
      keyModelDisplayField
    } = this.props;

    if (keyEntities.length > 0) {
      const entity = keyEntities.find(keyEntity => {
        return params.value && keyEntity.id.toString() === params.value.toString();
      });
      if (entity) {
        return entity[keyModelDisplayField];
      }
    }

    return params.value;
  }

  objectToRowData(object) {
    return Object.keys(object).map(key => {
      return {key: key, value: object[key]};
    });
  }

  rowDataToObject(rowData) {
    let object = {};
    rowData.forEach(row => {
      object[row.key] = row.value;
    });
    return object;
  }

  onGridReady = (evt) => {
    this.setState({
      gridApi: evt.api
    }, () => {
      this.state.gridApi.sizeColumnsToFit();
      this.getPossibleKeys();
    });
  }

  onGridSizeChanged = () => {
    if (this.state.gridApi) {
      this.state.gridApi.sizeColumnsToFit();
    }
  }

  onCellValueChanged = evt => {
    const {
      keyEntities,
      rowData
    } = this.state;
    const {
      onObjectChanged
    } = this.props;

    if (evt.node.lastChild && rowData.length < keyEntities.length) {
      this.addEmptyRow();
    }
    const array = [...rowData];
    if (!array[evt.node.id]) {
      array[evt.node.id] = {};
    }
    let row = array[evt.node.id];
    row[evt.column.colId] = evt.newValue;

    this.setState({
      rowData: array
    }, () => {
      if (onObjectChanged) {
        onObjectChanged(this.rowDataToObject(rowData));
      }
    });
  }

  addEmptyRow = () => {
    this.state.gridApi.updateRowData({add: [{}]});
  }

  keyDropDownFilter = keyObject => {
    const { keyEntities } = this.state;
    return keyEntities.map(k => k.id).includes(keyObject.id);
  }

  render() {
    const {
      rowData
    } = this.state;
    const {
      keyModel,
      keyModelDisplayField,
      ...passThroughProps
    } = this.props;

    return (
      <div
        className="ag-theme-fresh"
        style={{
          height: 400
        }}
      >
        <AgGridReact
          className="object-grid"
          singleClickEdit={true}
          rowData={rowData}
          onGridReady={this.onGridReady}
          onGridSizeChanged={this.onGridSizeChanged}
          onCellValueChanged={this.onCellValueChanged}
          defaultColDef={{
            editable: true,
            cellStyle: {
              textAlign: 'center'
            }
          }}
          columnDefs={[{
            headerName: 'Versuchsfaktor',
            field: 'key',
            cellRenderer: this.cellRenderer,
            cellEditorFramework: keyModel ? EntityEditor : undefined,
            cellEditorParams: {
              type: keyModel,
              keyprop: keyModelDisplayField,
              filterFunction: this.keyDropDownFilter
            }
          }, {
            headerName: 'Wert',
            field: 'value'
          }]}
          {...passThroughProps}
        />
      </div>
    );
  }
}

export default ObjectGrid;
