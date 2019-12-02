import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import {connect} from 'react-redux';

import {
  Icon,
  Menu,
  Dropdown
} from 'antd';

const SubMenu = Menu.SubMenu;

import {
  get as _get
} from 'lodash';

import {
  SimpleButton,
  Titlebar
} from '@terrestris/react-geo';

import {
  setStatistics
} from '../../../actions/GridAction';

import './GridMenu.less';

@connect((store) => {
  return {
    statistics: store.grid.statistics
  };
})
@translate()
class GridMenu extends React.Component {
  static propTypes = {
    columnDefs: PropTypes.array,
    dispatch: PropTypes.func,
    t: PropTypes.func,
    extraTools: PropTypes.arrayOf(PropTypes.node),
    toggleColumnVisibility: PropTypes.func,
    title: PropTypes.string,
    grid: PropTypes.object,
    statistics: PropTypes.arrayOf(PropTypes.string)
  };

  static defaultProps = {
    extraTools: []
  };

  constructor(params) {
    super(params);
    this.state = {
      selectedColumns: []
    };
  }

  getMenu() {
    const{
      grid,
      t
    } = this.props;
    let columnVisibilityItems = [];
    let selectedColumns = [];
    let columns = [];
    if (grid) {
      columns = grid.columnApi.getAllColumns();

      let subMenus = {};
      columns.forEach(column => {
        if (column.isVisible()) {
          selectedColumns.push(column.colId);
        }
        const category = _get(column, 'colDef.category') || _get(column, 'userProvidedColDef.category');
        if (category) {
          if (!subMenus[category]) {
            subMenus[category] = [];
          }
          subMenus[category].push(
            <Menu.Item
              key={column.colId}
            >
              {column.colDef.headerName} {column.isVisible() ? <Icon type="check" /> : null}
            </Menu.Item>
          );
        } else {
          if (!subMenus.general) {
            subMenus.general = [];
          }
          subMenus.general.push(
            <Menu.Item
              key={column.colId}
            >
              {column.colDef.headerName} {column.isVisible() ? <Icon type="check" /> : null}
            </Menu.Item>
          );
        }
      });

      columnVisibilityItems = Object.keys(subMenus)
        .filter(category => category !== 'statistics')
        .map(category => {
          const columns = subMenus[category];
          return (
            <SubMenu
              title={t(`GridMenu.categories.${category}`)}
              key={category}
            >
              {columns}
            </SubMenu>
          );
        });
    }

    const onSelectionChange = (evt) => {
      const {
        key,
        selectedKeys
      } = evt;
      if (key === 'fit-columns') {
        grid.api.sizeColumnsToFit();
      } else {
        columns.forEach(column => {
          const visible = selectedKeys.includes(column.colId);
          grid.columnApi.setColumnVisible(column.colId, visible);
        });
        grid.api.sizeColumnsToFit();
        this.setState({selectedKeys});
      }
    };

    return (
      <Menu
        selectedKeys={selectedColumns}
        selectable
        multiple
        forceSubMenuRender
        onSelect={onSelectionChange}
        onDeselect={onSelectionChange}
      >
        <SubMenu
          title={t('GridMenu.columnVisibility')}
          key="sub1"
        >
          {columnVisibilityItems}
        </SubMenu>
        <Menu.Item key="fit-columns">
          {t('GridMenu.adaptColumns')}
        </Menu.Item>
      </Menu>
    );
  }

  statisticsMenuClicked = event => {
    const key = event.key;
    const {
      grid,
      dispatch,
      statistics
    } = this.props;

    let newStatistics = [...statistics];
    const index = statistics.findIndex(statistic => statistic === key);
    const wasUnselected = index === -1;

    if (wasUnselected) {
      newStatistics.push(key);
    } else {
      newStatistics.splice(index, 1);
    }
    if (key.startsWith('row')) {
      grid.columnApi.setColumnVisible(key, wasUnselected);
      grid.api.sizeColumnsToFit();
    }

    dispatch(setStatistics(newStatistics));

  };

  render() {
    const {
      extraTools,
      grid,
      statistics,
      title,
      t
    } = this.props;

    let tools = [...extraTools];

    if (grid) {
      const menu = this.getMenu();
      tools.push(
        <Dropdown
          key="statistics-menu"
          overlay={
            <Menu
              onClick={this.statisticsMenuClicked}
              selectable
              multiple
              selectedKeys={statistics}
            >
              <Menu.ItemGroup title={t('GridMenu.columnBased')}>
                <Menu.Item key="sum">
                  {t('GridMenu.sum')} {statistics.includes('sum') ? <Icon type="check" /> : null}
                </Menu.Item>
                <Menu.Item key="min">
                  {t('GridMenu.min')} {statistics.includes('min') ? <Icon type="check" /> : null}
                </Menu.Item>
                <Menu.Item key="max">
                  {t('GridMenu.max')} {statistics.includes('max') ? <Icon type="check" /> : null}
                </Menu.Item>
                <Menu.Item key="avg">
                  {t('GridMenu.avg')} {statistics.includes('avg') ? <Icon type="check" /> : null}
                </Menu.Item>
              </Menu.ItemGroup>
              <Menu.ItemGroup title={t('GridMenu.rowBased')}>
                <Menu.Item key="row-sum">
                  {t('GridMenu.sum')} {statistics.includes('row-sum') ? <Icon type="check" /> : null}
                </Menu.Item>
                <Menu.Item key="row-min">
                  {t('GridMenu.min')} {statistics.includes('row-min') ? <Icon type="check" /> : null}
                </Menu.Item>
                <Menu.Item key="row-max">
                  {t('GridMenu.max')} {statistics.includes('row-max') ? <Icon type="check" /> : null}
                </Menu.Item>
                <Menu.Item key="row-avg">
                  {t('GridMenu.avg')} {statistics.includes('row-avg') ? <Icon type="check" /> : null}
                </Menu.Item>
              </Menu.ItemGroup>
            </Menu>
          }
          trigger={['click']}
        >
          <SimpleButton
            icon="calculator"
            tooltip={t('GridMenu.statistics')}
          />
        </Dropdown>,
        <Dropdown
          key="menu"
          overlay={menu}
          trigger={['click']}
        >
          <SimpleButton
            key="menu"
            icon="bars"
            tooltip={'Menu'}
            onClick={() => {}}
          />
        </Dropdown>);
    }

    return (
      <Titlebar
        className="grid-menu"
        tools={tools}>
        {title}
      </Titlebar>
    );
  }
}

export default GridMenu;
