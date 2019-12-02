import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';
import OlMap from 'ol/Map';
import OlInteractionSelect from 'ol/interaction/Select';
import {
  click as ClickCondition
} from 'ol/events/condition';

import OlControlScaleLine from 'ol/control/ScaleLine';
import OlLayerGroup from 'ol/layer/Group';
import OlLayerVector from 'ol/layer/Vector';
import { connect } from 'react-redux';
import { Tabs } from 'antd';
import Icon from 'react-fa/lib/Icon';
import {
  pull as _pull
} from 'lodash';

import {
  MapUtil
} from '@terrestris/ol-util/dist/MapUtil/MapUtil';

const TabPane = Tabs.TabPane;
import {
  LayerTransparencySlider,
  LayerTree,
  Legend,
  mappify,
  Panel,
  SimpleButton,
  ToggleButton,
  Titlebar,
  Window
} from '@terrestris/react-geo';

import WmsPanel from '../../Panel/WmsPanel/WmsPanel.jsx';
import Map from '../../Map/Map.jsx';
import FeatureGrid from '../../Grid/FeatureGrid/FeatureGrid.jsx';

import 'ol/ol.css';

import './MapPage.less';
import CopterLayerSlider from '../../CopterLayerSlider/CopterLayerSlider.jsx';
import LegendPanel from '../../Panel/LegendPanel/LegendPanel.jsx';
import moment from 'moment';

@connect((store) => {
  return {
    app: store.app,
    mapView: store.mapView,
    gridVisible: store.app.featureGridVisible,
    measurements: store.measurements,
    hoverFeatures: store.hoverFeatures,
    measurementsStyle: store.measurementsStyle
  };
})
@translate()
class MapPage extends React.Component {
  static propTypes = {
    map: PropTypes.instanceOf(OlMap).isRequired,
    dispatch: PropTypes.func,
    t: PropTypes.func,
    app: PropTypes.object,
    mapView: PropTypes.object,
    gridVisible: PropTypes.bool,
    measurements: PropTypes.object,
    history: PropTypes.object,
    hoverFeatures: PropTypes.array,
    measurementsStyle: PropTypes.object
  };

  constructor(params) {
    super(params);
    this.state = {
      addWMSWindowVisible: false,
      geostylerModalVisible: false,
      style: null,
      tractorInteraction: null,
      selectedTractorFeature: null,
      visibleLegends: []
    };

    this.layerTreePanel = React.createRef();
  }

  componentDidMount() {
    this.addScaleLineControl();
    this.addTractorSelectInteraction();
  }

  onGridReady = grid => this.setState({grid});

  onAddWMSButtonToggle(pressed){
    this.setState({ addWMSWindowVisible: pressed });
  }

  addScaleLineControl() {
    const {
      map
    } = this.props;
    const scaleline = new OlControlScaleLine();
    map.addControl(scaleline);
  }

  addTractorSelectInteraction() {
    const {
      map
    } = this.props;

    const selectInteraction = new OlInteractionSelect({
      condition: ClickCondition,
      multi: false,
      filter: (feature, layer) => {
        if (layer.get('isTractorLayer')) {
          feature.set('layer', layer);
        }
        return layer.get('isTractorLayer');
      }
    });

    selectInteraction.on('select', event => {
      const features = event.target.getFeatures().getArray();
      this.setState({selectedTractorFeature: features[0]});
    });

    map.addInteraction(selectInteraction);
    this.setState({
      tractorInteraction: selectInteraction
    });
  }

  /**
   * Generate the tabs for the selected tractor images.
   */
  getTractorImageTabs = () => {
    const feature = this.state.selectedTractorFeature;
    if (!feature) return;
    const layer = feature.get('layer');
    if (!layer) return;
    const rasterFileMap = layer.get('rasterFileMap');
    if (!rasterFileMap) return;
    const timeStamps = Object.keys(rasterFileMap);

    const env = process.env.NODE_ENV;
    const basePath = env === 'development' ? 'http://localhost:3000/tractorimages' : '/tractorimages';

    const tabs = [];
    timeStamps
      .sort((a, b) => {
        const dateA = moment.utc(a);
        const dateB = moment.utc(b);
        return dateA.unix() - dateB.unix();
      })
      .forEach(timestamp => {
        const rasterFile = rasterFileMap[timestamp];
        const fileName = feature.get(rasterFile.filenameField);
        const layerName = rasterFile.geoServerLayerName;
        const day = Object.keys(rasterFile.files)[0];
        const path = `${basePath}/${layerName}/${day}/${fileName}.jpg`;
        const title = feature.get(rasterFile.displayField);
        const formatedDay = moment.utc(rasterFile.timestamp).format('DD.MM.YYYY');
        tabs.push(<TabPane
          tab={formatedDay}
          key={day + title}>
          <a href={path} target="_blank" rel="noopener noreferrer">
            <img src={path} alt={title} width={800} height={500}/>
          </a>
        </TabPane>
        );
      });
    return tabs;
  }

  nodeTitleRenderer = layer => {
    const  {
      visibleLegends
    } = this.state;
    const {
      map,
      t
    } = this.props;

    const expanded = visibleLegends.includes(layer.ol_uid);
    const isFolder = layer instanceof OlLayerGroup;
    const isVector = layer instanceof OlLayerVector;

    return (
      <div className="layer-node" >
        <div className="layer-node-title">
          <span>
            {layer.get('name')}
          </span>
          <span className="layer-node-tools">
            {
              isFolder ? null :
                <Icon
                  name={expanded ? 'caret-square-o-up' : 'caret-square-o-down'}
                  onClick={() => {
                    const legends = [...visibleLegends];
                    if (expanded) {
                      _pull(legends, layer.ol_uid);
                    } else {
                      legends.push(layer.ol_uid);
                    }
                    this.setState({visibleLegends: legends}, () => {
                      this.layerTreePanel.current.rebuildTreeNodes();
                    });
                  }}
                />
            }
            {
              isVector && layer.getSource().getFeatures().length > 0 ?
                <Icon
                  name="arrow-circle-o-right"
                  onClick={() => {
                    const featureExtent = layer.getSource().getExtent();
                    map.getView().fit(featureExtent);
                  }}
                />
                : null
            }
          </span>
        </div>
        {
          expanded ?
            <div className="layer-node-body">
              <div className="transparency-slider-container">
                <span className="label">{t('MapPage.transparency')}:</span>
                <LayerTransparencySlider layer={layer} />
              </div>
              {
                isVector ? null :
                  <Legend
                    layer={layer}
                    className={`layer-${layer.ol_uid}`}
                  />
              }
            </div>
            : null
        }
      </div>
    );
  }

  render() {
    const {
      addWMSWindowVisible,
      selectedTractorFeature
    } = this.state;
    const {
      map,
      t,
      measurementsStyle
    } = this.props;

    const copterLayers = MapUtil
      .getAllLayers(map, layer => {
        return layer.get('copterLayer');
      })
      .sort((a, b) => {
        const dateA = moment.utc(a.get('rasterFile').timestamp);
        const dateB = moment.utc(b.get('rasterFile').timestamp);
        return dateA.unix() - dateB.unix();
      });

    return (
      <div className="page row page-row mappage">
        <div className="map-container">
          <CopterLayerSlider
            layers={copterLayers}
          />
          <Map map={map} />
          <FeatureGrid
            map={map}
            onStyleButtonClicked={this.onStyleButtonClicked}
          />
        </div>
        <Panel
          title={t('MapPage.themeSelection')}
          className="layer-tree-panel"
          x={20}
          y={20}
          collapsible
          width={window.innerWidth/6 - 20}
          height={400}
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
          <LayerTree
            ref={this.layerTreePanel}
            className="layer-tree"
            map={map}
            layerGroup={map.getLayerGroup()}
            filterFunction={layer => !layer.get('hideInLayertree')}
            nodeTitleRenderer={this.nodeTitleRenderer}
          />
          <Titlebar
            tools={[
              <ToggleButton
                tooltip={t('MapPage.addWms')}
                key="add-wms"
                pressed={addWMSWindowVisible}
                onToggle={this.onAddWMSButtonToggle.bind(this)}
              >
                {t('MapPage.addWms')}
              </ToggleButton>
            ]}
          >
          </Titlebar>
        </Panel>
        {measurementsStyle ? <LegendPanel style={measurementsStyle} /> : null}
        {
          addWMSWindowVisible ?
            <Window
              title={t('MapPage.addWms')}
              onClose={() => this.setState({addWMSWindowVisible: false})}
              onEscape={() => this.setState({addWMSWindowVisible: false})}
              width={800}
              height={400}
              x={(window.innerWidth / 2 - 400) / 2}
              y={(window.innerHeight / 2 - 200) / 2}
              className="add-wms-window"
              tools={[
                <SimpleButton
                  key="closeButton"
                  icon="close"
                  size="small"
                  tooltip={t('General.close')}
                  onClick={() => this.setState({addWMSWindowVisible: false})}
                />
              ]}
            >
              <WmsPanel
                map={map}
                onCancel={() => this.setState({addWMSWindowVisible: false})}
              >
                {t('MapPage.wmsContent')}
              </WmsPanel>
            </Window> :
            null
        }
        {
          selectedTractorFeature ?
            <Window
              title={t(
                'MapPage.tractorPhotos',
                {
                  plot: selectedTractorFeature.get('PlotNr'),
                  position: selectedTractorFeature.get('Bildpositi')
                }
              )}
              onClose={()=>{
                this.setState({selectedTractorFeature: null});
                this.state.tractorInteraction.getFeatures().clear();
              }}
              onEscape={()=>{
                this.setState({selectedTractorFeature: null});
                this.state.tractorInteraction.getFeatures().clear();
              }}
              width={800}
              height={600}
              x={(window.innerWidth / 2 - 400) / 2}
              y={(window.innerHeight / 2 - 300) / 2}
              tools={[
                <SimpleButton
                  key="closeButton"
                  icon="close"
                  size="small"
                  tooltip={t('General.close')}
                  onClick={() => {
                    this.setState({selectedTractorFeature: null});
                    this.state.tractorInteraction.getFeatures().clear();
                  }}
                />
              ]}
            >
              <Tabs>
                {this.getTractorImageTabs()}
              </Tabs>
            </Window> :
            null
        }
      </div>
    );
  }
}

export default (mappify)(MapPage);
