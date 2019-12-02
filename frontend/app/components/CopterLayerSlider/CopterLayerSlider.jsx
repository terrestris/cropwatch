import React from 'react';
import PropTypes from 'prop-types';

import { Select } from 'antd';

import {
  MultiLayerSlider
} from '@terrestris/react-geo';
import moment from 'moment';
import { translate } from 'react-i18next';

import './CopterLayerSlider.less';

@translate()
class CopterLayerSlider extends React.Component {

  static propTypes = {
    t: PropTypes.func,
    layers: PropTypes.array
  };

  constructor(params) {
    super(params);
    this.state = {
      sliderExperiment: null
    };
  }

  onSliderExperimentChange = sliderExperiment => {
    const {
      layers
    } = this.props;
    this.setState({sliderExperiment});
    layers.forEach(layer => {
      const visible = layer.get('rasterFile').Experiment.expcode === sliderExperiment;
      layer.setVisible(visible);
    });
  }

  getMarks = () => {
    const marks = {};
    const layers = this.getSliderLayers();
    const length = layers.length - 1;
    layers.forEach((layer, i) => {
      const idx = Math.round(100 / length * i);
      const rasterFile = layer.get('rasterFile');
      const markerLabel = moment.utc(rasterFile.timestamp).format('DD.MM.YYYY');
      marks[idx] = markerLabel;
    });
    return marks;
  }

  getSliderLayers = () => {
    const {
      layers
    } = this.props;
    const {
      sliderExperiment
    } = this.state;
    return layers.filter(layer => layer.get('rasterFile').Experiment.expcode === sliderExperiment);
  }

  getSelectOptions = () => {
    const {
      layers
    } = this.props;

    let experimentCodes = layers.map(layer => layer.get('rasterFile').Experiment.expcode);
    experimentCodes = [...new Set(experimentCodes)];

    return experimentCodes.map(expCode => {
      return (
        <Select.Option
          value={expCode}
          key={expCode}
        >
          {expCode}
        </Select.Option>
      );
    });
  }

  render() {
    const {
      t
    } = this.props;
    const {
      sliderExperiment
    } = this.state;
    const sliderLayers = this.getSliderLayers();
    const selectOptions = this.getSelectOptions();

    return (
      <div className="copter-layer-slider">
        <div className="experiment-select-wrapper">
          <div className="label">
            {t('CopterLayerSlider.orthofotos')}
          </div>
          <Select
            className="experiment-select"
            allowClear={true}
            onChange={this.onSliderExperimentChange}
            style={{width: '200px'}}
            placeholder={`${t('Entities.experiments')}…`}
          >
            {selectOptions}
          </Select>
        </div>
        {
          !sliderExperiment ? null :
            <div className="slider-wrapper">
              <MultiLayerSlider
                style={{width: '800px'}}
                layers={sliderLayers}
                marks={this.getMarks()}
                tooltipVisible={false}
              />
            </div>
        }
      </div>
    );
  }
}

export default CopterLayerSlider;
