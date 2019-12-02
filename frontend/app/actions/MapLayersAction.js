/**
 * Action types
 */
export const LAYER_ORDER_CHANGE = 'LAYER_ORDER_CHANGE';
export const LAYER_VISIBILITY_CHANGE = 'LAYER_VISIBILITY_CHANGE';

/**
 * Action creators
 */
export function layerOrderChange(action) {
  return {
    type: LAYER_ORDER_CHANGE,
    layerIdMoved: action.layerIdMoved,
    layerIdDroppedOn: action.layerIdDroppedOn
  };
}
export function layerVisibilityChange(action) {
  return {
    type: LAYER_VISIBILITY_CHANGE,
    layerId: action.layerId,
    visible: action.visible
  };
}
