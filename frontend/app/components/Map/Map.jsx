import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import OlMap from 'ol/Map';
import OlCanvasMapRenderer from 'ol/renderer/canvas/Map';
import {
  isEqual,
  debounce
} from 'lodash';

import ProjectionUtil from '../../util/ProjectionUtil';
import { setMapView } from '../../actions/MapViewChangeAction';

/**
 * mapStateToProps - mapping state to props of Map Component.
 *
 * @param {Object} state current state
 * @return {Object} mapped props
 */
export const mapStateToProps = (state) => {
  return {
    center: state.mapView.center,
    zoom: state.mapView.zoom,
    mapLayers: state.mapLayers
  };
};

/**
 * Class representating a map.
 *
 * @class The Map.
 * @extends React.Component
 */
export class Map extends React.Component {

  /**
   * The properties.
   * @type {Object}
   */
  static propTypes = {

    /**
     * The openlayers map.
     *
     * @type {OlMap}
     */
    map: PropTypes.instanceOf(OlMap).isRequired,

    /**
     * The children to render inside the map-div.
     * @type {Node[]}
     */
    children: PropTypes.element,

    /**
     * The dispatch function.
      @type {Function}
     */
    dispatch: PropTypes.func,

    /**
     * The center coordinates.
     * @type {ol.Coordinate}
     */
    center: PropTypes.arrayOf(PropTypes.number),

    /**
     * The zoom level.
     * @type {Number}
     */
    zoom: PropTypes.number,

    /**
     * The layers.
     * @type {Array}
     */
    mapLayers: PropTypes.array,

    /**
     * Whether to fire the `pointerrest` event or not.
     * @type {Boolean}
     */
    firePointerRest: PropTypes.bool,

    /**
     * The interval for the `pointerrest` event. This is the time the pointer
     * has to rest on a certain position on the map before the event gets fired.
     * @type {Number}
     */
    pointerRestInterval: PropTypes.number,

    /**
     * The tolerance for the `pointerrest` event. This is the tolerance in x and
     * y direction the pointer has to be moved on a certain position on the map
     * before the event gets fired after a pointerrest event has been fired
     * before.
     * @type {Number}
     */
    pointerRestTolerance: PropTypes.number
  }

  /**
   * The default properties.
   * @type {Object}
   */
  static defaultProps = {
    firePointerRest: true,
    pointerRestInterval: 250,
    pointerRestTolerance: 3
  }

  /**
   * Create a map.
   * @constructs Map
   */
  constructor(props) {
    super(props);

    this.state = {
      lastPointerPixel: null,
      isMouseOverMapEl: null
    };

    ProjectionUtil.initProj4Definitions();
    ProjectionUtil.initProj4DefinitionMappings();

    this.debouncedCheckPointerRest = null;
  }

  /**
   * The componentDidMount function
   *
   * After the component did mount, the map is set up
   *  * Add layers
   *  * Define and set view
   *  * ...
   *
   * @method componentDidMount
   */
  componentDidMount() {
    // register ol-listener to handle user-initiated prop updates

    // TODO: Why does the react-geo MapComponent don't work here
    this.props.map.setTarget(this._mapdiv);

    const map = this.props.map;
    map.on('moveend', this.onMapMoveEnd, this);

    this.initDebouncedCheckPointerRest(this.props.pointerRestInterval);
    this.setFirePointerRest(this.props.firePointerRest);
  }

  /**
   * The UNSAFE_componentWillReceiveProps function
   * Trigger mapView functions, e.g. setZoom
   *
   * @param {Object} newProps object containing the new props that are received
   */
  componentDidUpdate(prevProps) {
    if (!isEqual(prevProps.firePointerRest, this.props.firePointerRest)) {
      this.setFirePointerRest(this.props.firePointerRest);
    }
  }

  onMapMoveEnd = () => {
    const map = this.props.map;
    const mapView = map.getView();
    const propCenter = this.props.center;
    const propZoom = this.props.zoom;
    const mapCenter = mapView.getCenter();
    const mapZoom = mapView.getZoom();

    if ((propZoom && propZoom !== mapZoom) ||
        (propCenter && !isEqual(propCenter, mapCenter))) {
      this.props.dispatch(setMapView({
        center: mapView.getCenter(),
        zoom: mapView.getZoom()
      }));
    }
  }

  /**
   * (Un-)Registers the debouncedCheckPointerRest method on `pointermove`.
   *
   * @param {Boolean} active Whether to enable or disable the listener.
   */
  setFirePointerRest = active => {
    if (active) {
      this.props.map.on('pointermove', this.debouncedCheckPointerRest);
    } else {
      this.props.map.un('pointermove', this.debouncedCheckPointerRest);
    }
  }

  /**
   * Initializes the debounced checkPointerRest method.
   *
   * @param {interval} interval The debounce interval to use.
   */
  initDebouncedCheckPointerRest = (interval) => {
    if (!this.debouncedCheckPointerRest) {
      this.debouncedCheckPointerRest = debounce(
        this.checkPointerRest,
        interval
      );
    }
  }

  /**
   * Will be called if the mouse/pointer is over the map div.
   */
  onMouseOver = () => {
    this.setState({
      isMouseOverMapEl: true
    });
  }

  /**
   * Will be called if the mouse/pointer is moved outside the map div.
   */
  onMouseOut = () => {
    this.setState({
      isMouseOverMapEl: false
    });
  }

  /**
   * Fires the `pointerrest` event if the mouse lasts on the current coordinate.
   * Typically used in a debounced context (see debouncedCheckPointerRest) to
   * check in a given interval.
   *
   * @param {ol.event} olEvt The ol event.
   */
  checkPointerRest = olEvt => {
    if (olEvt.dragging || !this.state.isMouseOverMapEl ||
        !(olEvt.target.getRenderer() instanceof OlCanvasMapRenderer)) {
      return;
    }

    let pixel = olEvt.pixel;
    let tolerance = this.props.pointerRestTolerance;

    let lastPointerPixel = this.state.lastPointerPixel;

    if (lastPointerPixel) {
      let deltaX = Math.abs(lastPointerPixel[0] - pixel[0]);
      let deltaY = Math.abs(lastPointerPixel[1] - pixel[1]);

      if (deltaX > tolerance || deltaY > tolerance) {
        this.setState({
          lastPointerPixel: pixel
        });
      } else {
        return;
      }
    } else {
      this.setState({
        lastPointerPixel: pixel
      });
    }

    this.props.map.dispatchEvent({
      ...olEvt,
      type: 'pointerrest'
    });
  }

  /**
   * The render function.
   */
  render() {
    // TODO: Make use of react-geo MapComponent
    const {
      firePointerRest
    } = this.props;

    return (
      <div
        ref={mapdiv => this._mapdiv = mapdiv}
        id="map"
        className="map"
        onMouseOver={firePointerRest ? this.onMouseOver : undefined}
        onMouseOut={firePointerRest ? this.onMouseOut : undefined}
      />
    );
  }
}

export default connect(mapStateToProps)(Map);
