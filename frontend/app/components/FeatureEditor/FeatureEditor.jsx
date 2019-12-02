import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';

import OlFeature from 'ol/Feature';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerBase from 'ol/layer/Base';
import OlLayerTile from 'ol/layer/Tile';
import OlLayerVector from 'ol/layer/Vector';
import OlSourceTileWMS from 'ol/source/TileWMS';
import OlSourceVector from 'ol/source/Vector';
import OlInteractionDraw from 'ol/interaction/Draw';

import {
  DigitizeButton,
  MapComponent,
  ToggleGroup,
  Toolbar
} from '@terrestris/react-geo';

import './FeatureEditor.less';

@translate()
class FeatureEditor extends React.Component {

  /**
   * The OlMap to be used within the editor.
   *
   * @type OlMap
   */
  _map = new OlMap({
    view: new OlView({
      center: [
        6.993420421495815,
        50.61823948389869
      ],
      projection: 'EPSG:4326',
      zoom: 16
    }),
    layers: [new OlLayerTile({
      name: 'OSM-WMS Graustufen',
      source: new OlSourceTileWMS({
        url: 'http://ows.terrestris.de/osm-gray/service',
        params: {
          'LAYERS': 'OSM-WMS'
        },
        serverType: 'geoserver'
      })
    })]
  });

  /**
   * The OlLayerVector to be used within the editor.
   *
   * @type OlLayerVector
   */
  _vectorLayer = new OlLayerVector({
    name: 'feature-editor-layer',
    source: new OlSourceVector()
  });

  static propTypes = {
    feature: PropTypes.instanceOf(OlFeature),
    layer: PropTypes.instanceOf(OlLayerBase),
    onChange: PropTypes.func,
    geometryTypes: PropTypes.arrayOf(
      PropTypes.oneOf(['Polygon', 'LineString', 'Point'])
    ),
    t: PropTypes.func
  };

  static defaultProps = {
    geometryTypes: ['Polygon', 'LineString', 'Point']
  }

  constructor(props) {
    super(props);

    this._map.addLayer(this._vectorLayer);

    const {
      feature,
      layer
    } = this.props;

    if (layer) {
      this._map.addLayer(layer);
    }

    if (feature) {
      this._map.getView().fit(feature.getGeometry(), {
        maxZoom: 16
      });
      this._vectorLayer.getSource().addFeature(feature);
    }

    this.state = {
      feature: feature
    };
  }

  /**
   * onDrawEnd Callback function of the Digitizebutton.
   * Calls the onChange method with the modified feature if defined in props.
   *
   * @param {Event} event The openlayers onDrawEnd event.
   */
  onDrawEnd = event => {
    const {
      onChange
    } = this.props;

    const drawInteraction = this._map.getInteractions()
      .getArray()
      .find(i => i instanceof OlInteractionDraw);

    const feature = event.feature;
    this.setState({
      feature
    }, () => {
      drawInteraction.setActive(false);
    });
    if (onChange) {
      onChange(feature);
    }
  }

  /**
   * onModifyEnd Callback function of the Digitizebutton.
   * Calls the onChange method with the modified feature if defined in props.
   *
   * @param {Event} event The openlayers onModifyEnd or onTranslateEnd event.
   */
  onModifyEnd = event => {
    const {
      onChange
    } = this.props;

    const feature = event.features.getArray()[0];
    if (onChange) {
      onChange(feature);
    }
  }

  render() {
    const {
      geometryTypes,
      t
    } = this.props;
    const {
      feature
    } = this.state;

    return (
      <div className="feature-editor">
        <Toolbar>
          <ToggleGroup orientation="horizontal">
            <DigitizeButton
              name="drawPoint"
              digitizeLayerName="feature-editor-layer"
              map={this._map}
              drawType="Point"
              onDrawEnd={this.onDrawEnd}
              style={{
                display: feature || !geometryTypes.includes('Point') ? 'none' : 'inherit'
              }}
            >
              {t('FeatureEditor.drawPoint')}
            </DigitizeButton>
            <DigitizeButton
              name="drawLine"
              digitizeLayerName="feature-editor-layer"
              map={this._map}
              drawType="LineString"
              onDrawEnd={this.onDrawEnd}
              style={{
                display: feature || !geometryTypes.includes('LineString') ? 'none' : 'inherit'
              }}
            >
              {t('FeatureEditor.drawLineString')}
            </DigitizeButton>
            <DigitizeButton
              name="drawPolygon"
              digitizeLayerName="feature-editor-layer"
              map={this._map}
              drawType="Polygon"
              onDrawEnd={this.onDrawEnd}
              style={{
                display: feature || !geometryTypes.includes('Polygon') ? 'none' : 'inherit'
              }}
            >
              {t('FeatureEditor.drawPolygon')}
            </DigitizeButton>
            <DigitizeButton
              name="selectAndModify"
              digitizeLayerName="feature-editor-layer"
              map={this._map}
              editType="Edit"
              onModifyEnd={this.onModifyEnd}
              onTranslateEnd={this.onModifyEnd}
              style={{
                display: !feature ? 'none' : 'inherit'
              }}
            >
              {t('FeatureEditor.selectAndModify')}
            </DigitizeButton>
          </ToggleGroup>
        </Toolbar>
        <MapComponent
          className="feature-editor-map"
          map={this._map}
        />
      </div>
    );
  }
}

export default FeatureEditor;
