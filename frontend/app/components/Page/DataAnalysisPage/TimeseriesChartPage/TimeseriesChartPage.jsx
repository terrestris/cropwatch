import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {translate} from 'react-i18next';
import ChartRenderer from '@terrestris/d3-util/src/ChartRenderer/ChartRenderer';
import TimeseriesComponent from '@terrestris/d3-util/src/TimeseriesComponent/TimeseriesComponent';
import LegendComponent from '@terrestris/d3-util/src/LegendComponent/LegendComponent';
import './TimeseriesChartPage.less';
import chroma from 'chroma-js';
import {SketchPicker} from 'react-color';

import {
  Button,
  Modal,
  Popconfirm,
  Select,
  Form
} from 'antd';
import {
  SimpleButton,
  Titlebar
} from '@terrestris/react-geo';
import moment from 'moment';
import { setChartData } from '../../../../actions/ChartDataAction';

@connect((store) => {
  return {
    chartData: store.chartData,
    measurements: store.measurements
  };
})
@translate()
class TimeseriesChartPage extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    measurements: PropTypes.object,
    t: PropTypes.func,
    chartData: PropTypes.array
  };

  /**
   * Constructs a chart component.
   * @param {object} props initial props
   */
  constructor(props) {
    super(props);

    this.state = {
      addToChartWindowVisible: false,
      chartData: null,
      chartConfig: null,
      colors: null,
      legendConfig: null,
      colorPickerShown: false,
      colorPickerShownForIndex: -1,
      xAxesTraitIds: [],
      timestampField: 'timestamp',
      data: []
    };
  }

  /**
     * React Lifecycle method.
     *
     * @param {Object} prevProps The props before the Update.
     */
  componentDidUpdate(prevProps) {
    const {
      measurements: {
        data,
        traits
      }
    } = this.props;
    if (traits !== prevProps.measurements.traits) {
      this.setChartData();
    }
    if (data !== prevProps.measurements.data) {
      this.setChartData();
    }
  }

  /**
   * Derives the chart configuration from the chart data.
   * @param {Object} props the props
   * @param {Object} state the state
   */
  static getDerivedStateFromProps(props, state) {
    if (props.chartData !== state.chartData) {
      const colors = state.colors || chroma.brewer.Dark2;
      const chartConfig = {
        scaleX: 'time',
        position: [0, 0],
        axes: {
          x: {
            scale: 'time',
            orientation: 'x'
          }
        },
        series: []
      };
      const legendConfig = {
        items: []
      };
      props.chartData.forEach((series, idx) => {
        const color = colors[idx] || colors[idx % colors.length];
        const axis = `y${++idx}`;
        chartConfig.axes[axis] = {
          scale: 'linear',
          orientation: 'y',
          display: true,
          labelPadding: 15,
          labelColor: color,
          label: series.yAxisLabel
        };
        chartConfig.series.push({
          axes: ['x', axis],
          color,
          data: series.data,
          style: {
            'stroke-width': 4
          }
        });
        legendConfig.items.push({
          type: 'line',
          style: {
            stroke: color,
            'stroke-width': 4
          },
          title: series.yAxisLabel
        });
      });

      return {
        chartData: props.chartData,
        chartConfig,
        legendConfig,
        data: props.measurements.data
      };
    }
    return null;
  }

  /**
   * Make sure we render once more after the div is actually created.
   */
  componentDidMount() {
    this.forceUpdate();
  }

  /**
   * The chart renderer object is reconstructed whenever its element size is
   * changed.
   * @param {Boolean} force if true, the update is forced
   */
  updateChartIfNeeded(force) {
    let width = 500;
    let height = 500;
    if (this.chartRef) {
      width = this.chartRef.clientWidth;
      height = this.chartRef.clientHeight;
    }
    if (force || !this.chartRenderer || this.chartRenderer.width !== width || this.chartRenderer.height !== height) {
      const {
        chartConfig,
        legendConfig
      } = this.state;
      if (!chartConfig) {
        return;
      }
      chartConfig.size = [width - 290, height];
      legendConfig.position = [width - 250, 0];
      legendConfig.items.forEach((item, idx) => {
        item.onClick = () => {
          this.setState({
            colorPickerShown: true,
            colorPickerShownForIndex: idx
          });
        };
      });
      this.chartRenderer = new ChartRenderer({
        zoomType: 'rerender',
        components: [
          new TimeseriesComponent(chartConfig),
          new LegendComponent(legendConfig)
        ],
        // subtract padding from .page class
        size: [width - 40, height - 16]
      });
    }
  }

  changeColor = (color) => {
    const {
      chartConfig: {
        series,
        axes
      },
      legendConfig: {
        items
      },
      colorPickerShownForIndex
    } = this.state;
    series[colorPickerShownForIndex].color = color.hex;
    items[colorPickerShownForIndex].style.stroke = color.hex;
    axes[`y${colorPickerShownForIndex + 1}`].labelColor = color.hex;
    this.updateChartIfNeeded(true);
  }

  /**
   * Makes the attribute selection panel / window visible.
   */
  onAddClicked = () => {
    this.setState({addToChartWindowVisible: true});
  }

  /**
   * Handler of the Reset Button.
   * Resets chartData and xAxesTraitIds. Should reset timestamp attribute in future.
   */
  onResetClicked = () => {
    const { dispatch } = this.props;
    this.setState({
      xAxesTraitIds: []
    });
    dispatch(setChartData([]));
  }

  /**
   * Creates Select.Options from the passed props.
   */
  getXAxesOptions = () => {
    const {
      measurements: {
        traits
      }
    } = this.props;

    return traits.map(trait => {
      return (
        <Select.Option
          key={trait.name}
          value={trait.id}
        >
          {trait.german}
        </Select.Option>
      );
    });
  }

  /**
   * Sets the chart Data from the selected traits, data and timestamp field.
   */
  setChartData = () => {
    const {
      dispatch,
      measurements: {
        data,
        traits
      }
    } = this.props;

    const {
      xAxesTraitIds,
      timestampField
    } = this.state;

    let newData = [];
    const xAxesTraits = traits.filter(trait => xAxesTraitIds.includes(trait.id));
    xAxesTraits.forEach(trait => {
      const seriesData = data.map(item => {
        return item[trait.name] ? [
          moment.utc(item[timestampField]).unix() * 1000,
          item[trait.name]
        ] : undefined;
      });
      seriesData.sort((a, b) => a[0] - b[0]);
      const series = {
        data: seriesData,
        drawAxis: true,
        yAxisLabel: trait.german,
        axes: ['x', 'y']
      };
      newData.push(series);
    });

    dispatch(setChartData(newData));
  }

  /**
   * Changehandler of the xAxesSelect Field.
   */
  onXAxesChange = xAxesTraitIds => {
    this.setState({
      xAxesTraitIds
    }, this.setChartData);
  }

  /**
   * Changehanlder of the timestamp Field,
   */
  onTimeAttributeChange = timestampField => {
    this.setState({
      timestampField
    }, this.setChartData);
  }

  render() {
    const {
      t,
      measurements: {
        data
      }
    } = this.props;
    const {
      chartConfig: {
        series
      },
      colorPickerShownForIndex,
      colorPickerShown,
      xAxesTraitIds,
      timestampField
    } = this.state;

    if (this.chartRef) {
      this.updateChartIfNeeded();
      if (this.chartRenderer) {
        this.chartRenderer.render(this.chartRef);
      }
    }

    return (
      <div className="page chart-data-page">
        <Titlebar
          className="chart-menu"
          tools={[
            <Form.Item
              key="y-axis-select"
              label={t('TimeseriesChartPanel.yAxisField')}
            >
              <Select
                showSearch
                style={{width: '200px'}}
                optionFilterProp="children"
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                value={timestampField}
              >
                <Select.Option value={'timestamp'}>timestamp</Select.Option>
              </Select>
            </Form.Item>,
            <Form.Item
              key="x-axis-select"
              label={t('TimeseriesChartPanel.xAxesFields')}
            >
              <Select
                showSearch
                mode="multiple"
                maxTagCount={1}
                style={{width: '400px'}}
                optionFilterProp="children"
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={this.onXAxesChange}
                value={xAxesTraitIds}
              >
                {this.getXAxesOptions()}
              </Select>
            </Form.Item>,
            <Popconfirm
              key="reset"
              title={t('TimeseriesChartPanel.reset')}
              onConfirm={this.onResetClicked}
              okText={t('General.yes')}
              cancelText={t('General.no')}
            >
              <SimpleButton
                icon="ban"
                disabled={data.length === 0 && !xAxesTraitIds}
                tooltip={t('TimeseriesChartPanel.reset')}
              />
            </Popconfirm>
          ]}>
          {t('TimeseriesChartPanel.title')}
        </Titlebar>
        <div className="chart-container" ref={el => this.chartRef = el} />
        <Modal
          visible={colorPickerShown}
          bodyStyle={{
            height: '350px'
          }}
          width={300}
          onCancel={() => this.setState({colorPickerShown: false})}
          footer={[<Button key="ok" onClick={() => this.setState({colorPickerShown: false})}>Ok</Button>]}>
          {colorPickerShown ?
            <SketchPicker
              onChange={this.changeColor}
              color={series[colorPickerShownForIndex].color}
            />
            : null}
        </Modal>
      </div>
    );
  }
}

export default TimeseriesChartPage;
