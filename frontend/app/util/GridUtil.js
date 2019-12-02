import {
  isFinite as _isFinite,
  get as _get
} from 'lodash';

import { TraitUtils } from './TraitUtils';
import TraitRenderer from '../components/Grid/CellRenderer/TraitRenderer.jsx';
import moment from 'moment';

/**
 * Helper Class for the Grid
 */
export class GridUtil {

  /**
   * Get the Statistic Rows
   *
   * @param {Object} data The rowData.
   * @param {string[]} statistics An array of enabled statistics (sum, min, max, avg).
   * @param {string[]} traitNames An array of trait names to create the statistics for.
   */
  static getStatisticRows = (data, statistics, traitNames) => {
    if (statistics.length <= 0 || data.length <= 0) {
      return [];
    }
    let rows = [];

    traitNames.forEach(trait => {
      const values = {
        sum: 0,
        min: Number.MAX_VALUE,
        max: Number.MIN_VALUE,
        avg: undefined
      };
      let count = 0;
      data.forEach(tuple => {
        let val = tuple[trait];
        if (val === undefined || val === null) {
          return;
        }
        val = parseFloat(val);
        if (_isFinite(val)) {
          ++count;
          values.sum += val;
          values.min = Math.min(values.min, val);
          values.max = Math.max(values.max, val);
        }
      });
      values.avg = (values.sum / count).toFixed(2);
      values.sum = values.sum.toFixed(2);
      statistics.forEach((statistic, index) => {
        const labelPrefix = statistic === 'sum' ? 'Σ' : statistic;
        if(!rows[index]) {
          rows[index] = {};
        }
        rows[index][trait] = `${labelPrefix}: ${values[statistic]}`;
      });
    });
    return rows;
  }

  /**
   * Get ColumnDefinitions for the Statistic Columns.
   *
   * @static
   * @memberof GridUtil
   */
  static getStatisticColumns = (traitNames, t) => {
    const defaults = {
      category: 'statistics',
      pinned: 'right',
      hide: true,
      headerClass: 'statistics-column header',
      headerTooltip: 'statistics-column header',
      cellClass: 'statistics-column'
    };
    if (traitNames.length < 1 ) {
      return [];
    }

    return [{
      ...defaults,
      headerName: t('GridMenu.sum'),
      headerTooltip: t('GridMenu.sum'),
      colId: 'row-sum',
      valueGetter: row => {
        if (!row.node.rowPinned) {
          const sum = traitNames.reduce((sum, traitName) => sum + row.data[traitName], 0);
          return sum.toFixed(2);
        }
      }
    }, {
      ...defaults,
      headerName: t('GridMenu.min'),
      headerTooltip: t('GridMenu.min'),
      colId: 'row-min',
      valueGetter: row => {
        if (!row.node.rowPinned) {
          const values = traitNames.map(traitName => row.data[traitName]);
          return Math.min(...values);
        }
      }
    }, {
      ...defaults,
      headerName: t('GridMenu.max'),
      headerTooltip: t('GridMenu.max'),
      colId: 'row-max',
      valueGetter: row => {
        if (!row.node.rowPinned) {
          const values = traitNames.map(traitName => row.data[traitName]);
          return Math.max(...values);
        }
      }
    }, {
      ...defaults,
      headerName: t('GridMenu.avg'),
      headerTooltip: t('GridMenu.avg'),
      colId: 'row-avg',
      valueGetter: row => {
        if (!row.node.rowPinned) {
          const sum = traitNames.reduce((sum, traitName) => sum + row.data[traitName], 0);
          return (sum/(traitNames.length)).toFixed(2);
        }
      }
    }];
  };

  /**
   * Get ColumnDefinitions for the Traits.
   *
   * @static
   * @memberof GridUtil
   * @param {Object[]} traits An array of traits.
   * @param {boolean} compareByTimestamp
   * @param {Array} days
   */
  static getTraitColumns = (traits, compareByTimestamp, days = []) => {
    if (compareByTimestamp) {
      const columns = [];
      traits.forEach(trait => {
        days.forEach(day => {
          const unit = trait.unit ? `(${trait.unit})` : '';
          columns.push({
            headerName: `${trait.german} ${unit} ${day}`,
            headerTooltip: `${trait.german} ${unit} ${day}`,
            category: 'trait',
            field: `${trait.name}${day.replace(/[.]/g, '')}`,
            editable: false,
            filter: TraitUtils.gridFilterByTraitType(trait.type),
            cellRendererFramework: TraitRenderer,
            cellRendererParams: {trait}
          });
        });
      });
      return columns;
    } else {
      return traits.map(trait => {
        return {
          headerName: `${trait.german} (${trait.unit})`,
          headerTooltip: `${trait.german} (${trait.unit})`,
          category: 'trait',
          field: trait.name,
          editable: false,
          filter: TraitUtils.gridFilterByTraitType(trait.type),
          cellRendererFramework: TraitRenderer,
          cellRendererParams: {trait}
        };
      });
    }
  }

  /**
   *Get unique days from the data.
   *
   * @param {Object[]} data The row data.
   * @return {String[]} The unique days as strings.
   */
  static getUniqueDays = data => {
    const days = [];
    data.forEach(row => {
      const day = moment.utc(row.timestamp).format('DD.MM.YYYY');
      if (days.indexOf(day) === -1) {
        days.push(day);
      }
    });
    return days;
  }

  /**
   *Groups data by their timestamp
   *
   * @param {Object[]} data The row data.
   * @param {Object[]} traits The selected traits.
   * @return {Object[]} The grouped row data.
   */
  static groupDataByTimestamp = (data, traits) => {
    const grouped = {};
    // TODO: determine references from data
    const spatialReferenceAttributes = ['PlotID'];
    data.forEach(row => {
      const day = moment.utc(row.timestamp).format('DDMMYYYY');
      const spatialReference = spatialReferenceAttributes[0];
      const key = row[spatialReference];
      let groupedRow = grouped[key];
      if (!groupedRow) {
        groupedRow = grouped[key] = {...row};
      }
      traits.forEach(trait => {
        groupedRow[`${trait.name}${day}`] = row[trait.name];
        delete groupedRow[trait.name];
      });
    });
    return Object.keys(grouped).map((spatialReference) => grouped[spatialReference]);
  }

  /**
   * Get ColumnDefinitions for the ExperimentalFactors.
   *
   * @static
   * @memberof GridUtil
   * @param {Object[]} Experiments An array of experiments.
   * @param {Function} t The translate function.
   */
  static getExperimentalFactorColumns = (experiments, t) => {

    let factorColumns = [];
    const experimentalFactorTranslation = t('Entities.experimentalfactor');
    const defs = [];

    experiments.forEach(experiment => {
      experiment.ExperimentalFactors.forEach(experimentalFactor => {
        if (!factorColumns.includes(experimentalFactor.id)) {
          defs.push({
            headerName: `${experimentalFactor.german} (${experimentalFactorTranslation})`,
            headerTooltip: `${experimentalFactor.german} (${experimentalFactorTranslation})`,
            hide: true,
            category: 'experimentalFactor',
            valueGetter: (row) => {
              try {
                const factors = JSON.parse(row.data.Plot.factors);
                return factors[experimentalFactor.id];
              } catch (error) {
                return undefined;
              }
            }
          });
          factorColumns.push(experimentalFactor.id);
        }
      });
    });
    return defs;
  }

  /**
   * Get ColumnDefinitions for the Attributes of a sort.
   *
   * @static
   * @memberof GridUtil
   * @param {Object[]} data The rowData of the grid.
   */
  static getSortAttributeColumns = data => {
    const defs = [];
    // Add columns for sort attributes
    let cropListAttributes = {};
    data.forEach(tuple => {
      const cropId = _get(tuple, 'Plot.CropID');
      if (cropId) {
        const covered = Object.keys(cropListAttributes).includes(cropId.toString());
        if (!covered) {
          const characteristics = _get(tuple , 'Plot.Sort.characteristics');
          if (characteristics) {
            const characteristicsObject = JSON.parse(characteristics);
            cropListAttributes[cropId.toString()] = Object.keys(characteristicsObject);
          }
        }
      }
    });

    if (Object.keys(cropListAttributes).length > 0) {
      Object.keys(cropListAttributes).forEach(cropId => {
        const attributes = cropListAttributes[cropId];
        attributes.forEach(attribute => {
          defs.push({
            headerName: attribute,
            headerTooltip: attribute,
            hide: true,
            category: 'characteristics',
            valueGetter: (row) => {
              try {
                const characteristics = JSON.parse(row.data.Plot.Sort.characteristics);
                return characteristics[attribute];
              } catch (error) {
                return undefined;
              }
            }
          });
        });
      });
    }
    return defs;
  }

  /**
   * Get ColumnDefinitions for the associations of a plot.
   *
   * @static
   * @memberof GridUtil
   * @param {function} t The translate function;
   */
  static getPlotAssociationColumns = (t) => {
    return [{
      headerName: t('Entities.experiment'),
      headerTooltip: t('Entities.experiment'),
      category: 'association',
      field: 'Plot.Experiment.expcode'
    }, {
      headerName: t('Entities.sort'),
      headerTooltip: t('Entities.sort'),
      category: 'association',
      hide: true,
      field: 'Plot.Sort.name'
    }, {
      headerName: t('Entities.field'),
      headerTooltip: t('Entities.field'),
      category: 'association',
      hide: true,
      field: 'Plot.Field.name'
    }, {
      headerName: t('Entities.farm'),
      headerTooltip: t('Entities.farm'),
      category: 'association',
      hide: true,
      field: 'Plot.Field.Farm.name'
    }];
  }

  /**
   * Get ColumnDefinitions for the properites of a plot.
   *
   * @static
   * @memberof GridUtil
   * @param {function} t The translate function;
   */
  static getPlotPropertyColumns = (t) => {
    return [{
      headerName: t('Models.Plot.croprotation'),
      headerTooltip: t('Models.Plot.croprotation'),
      category: 'property',
      field: 'Plot.croprotation',
      hide: true
    },{
      headerName: t('Models.Plot.harvestyear'),
      headerTooltip: t('Models.Plot.harvestyear'),
      category: 'property',
      field: 'Plot.harvestyear',
      hide: true
    },{
      headerName: t('Models.Plot.remarks'),
      headerTooltip: t('Models.Plot.remarks'),
      category: 'property',
      field: 'Plot.remarks',
      hide: true
    },{
      headerName: t('Models.Plot.replicationLevel'),
      headerTooltip: t('Models.Plot.replicationLevel'),
      category: 'property',
      field: 'Plot.replicationLevel',
      hide: true
    }];
  }

}
