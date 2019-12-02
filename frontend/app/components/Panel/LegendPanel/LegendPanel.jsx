import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';
import LegendRenderer from '@terrestris/legend-util/dist/LegendRenderer/LegendRenderer';

import {
  Panel
} from '@terrestris/react-geo';

import './LegendPanel.less';

@translate()
class LegendPanel extends React.PureComponent {
  static propTypes = {
    t: PropTypes.func,
    style: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.legendDiv = React.createRef();
  }

  componentDidMount() {
    this.drawLegend();
  }

  componentDidUpdate() {
    this.drawLegend();
  }

  drawLegend() {
    const {
      style
    } = this.props;
    const div = this.legendDiv.current;

    if (div && style) {
      const renderer = new LegendRenderer({
        maxColumnWidth: 300,
        overflow: 'auto',
        styles: [style],
        size: [300, 500],
        hideRect: true
      });
      div.querySelectorAll('svg').forEach(node => node.remove());
      renderer.render(div);
    }
  }

  render() {
    const {
      t
    } = this.props;

    const width = window.innerWidth/6 - 20;
    const x = window.innerWidth - width - 20;

    return (
      <Panel
        title={t('LegendPanel.title')}
        className="legend-panel"
        x={x}
        y={20}
        collapsible
        width={width}
        enableResizing={{
          bottom: true,
          bottomLeft: false,
          bottomRight: true,
          left: false,
          right: true,
          top: false,
          topLeft: false,
          topRight: false
        }}
      >
        <div ref={this.legendDiv} />
      </Panel>
    );
  }
}

export default LegendPanel;
