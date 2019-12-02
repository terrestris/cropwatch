import { LAYER_ORDER_CHANGE, LAYER_VISIBILITY_CHANGE } from '../actions/MapLayersAction';

/**
 * finds a layer by the given id in the given array, working recursively
 */
function findLayerById(mapLayers, id) {
  var layerFound;
  mapLayers.some(function(layer) {
    if (layer.id === id) {
      layerFound = layer;
      return true;
    }
    if (layer.type === 'folder') {
      // recursion call for nested objects
      layerFound = findLayerById(layer.children, id);
    }
  });
  return layerFound;
}

/**
 * reorders a nested layer array recursively
 */
function reorderMapLayers(currentLayers, allMapLayers, layerIdMoved, layerIdDroppedOn, parent) {
  var orderedArray = [];
  var layerMovedToTop;
  var layerMovedToBottom;
  currentLayers.forEach(function(layer) {
    // clone the layer object for the new final ordered layer array
    var clone = JSON.parse(JSON.stringify(layer));

    if (layerIdDroppedOn === 0 && clone.id === layerIdMoved) {
      // if layer has been dropped at the top, the layerIdDroppedOn will be 0
      layerMovedToTop = clone;
      if (parent) {
        // layer has been moved from inside a folder, remove him there
        // as the parent got pushed with original children.
        // we will push at the very end the layer on top
        parent.children.splice(parent.children.indexOf(clone), 1);
      }
    } else if (layerIdDroppedOn === -1 && clone.id === layerIdMoved) {
      // if layer has been dropped at the bottom, the layerIdDroppedOn will be -1
      // we need to push this layer at the very end
      layerMovedToBottom = clone;
    } else if (clone.id === layerIdDroppedOn) {
      // layer or folder has been been dropped onto another layer / folder
      // first push the layer that has been dropped on
      orderedArray.push(clone);
      var movedLayer = findLayerById(allMapLayers, layerIdMoved);
      var cloneOfMovedLayer = JSON.parse(JSON.stringify(movedLayer));
      if (clone.type === 'folder') {
        // the moved layer may have been dropped into the same folder
        // as he was in before. in that case, we dont need to add, as
        // folder has already pushed
        var alreadyContained = findLayerById(clone.children, cloneOfMovedLayer.id);
        if (!alreadyContained) {
          // push into groups children, currently always at the end
          clone.children.push(cloneOfMovedLayer);
        }
      } else {
        // simple push after the found layer that was dropped on
        orderedArray.push(cloneOfMovedLayer);
      }

    } else if (clone.id === layerIdMoved) {
      // if there is no parent, layer or folder has been moved on first level
      // and got already removed in the upper if
      if (parent) {
        // layer has been moved from inside a folder, remove him there
        // as the parent got pushed with original children
        parent.children.splice(parent.children.indexOf(clone), 1);
      }
    } else if (clone.type === 'folder') {
      // recursion call for nested objects
      orderedArray.push(clone);
      var orderedSubLayers = reorderMapLayers(
        layer.children,
        allMapLayers,
        layerIdMoved,
        layerIdDroppedOn,
        clone
      );
      clone.children = orderedSubLayers.orderedArray;
      layerMovedToTop = orderedSubLayers.layerMovedToTop || layerMovedToTop;
      layerMovedToBottom = orderedSubLayers.layerMovedToBottom || layerMovedToBottom;
    } else {
      // simple push if nothing has changed
      orderedArray.push(clone);
    }
  });

  return {
    orderedArray: orderedArray,
    layerMovedToTop: layerMovedToTop,
    layerMovedToBottom: layerMovedToBottom
  };
}

function mapLayers(mapLayers = [], action) {
  switch (action.type) {
    case LAYER_ORDER_CHANGE:
      var sortedMapLayers = reorderMapLayers(
        mapLayers,
        mapLayers,
        action.layerIdMoved,
        action.layerIdDroppedOn
      );
      // TODO: these lines should have been in the reorderMapLayers function,
      // but pushing / shifting on the most upper level is not always possible
      // there due to recursion
      if (sortedMapLayers.layerMovedToTop) {
        sortedMapLayers.orderedArray.unshift(sortedMapLayers.layerMovedToTop);
      }
      if (sortedMapLayers.layerMovedToBottom) {
        sortedMapLayers.orderedArray.push(sortedMapLayers.layerMovedToBottom);
      }
      return sortedMapLayers.orderedArray;
    case LAYER_VISIBILITY_CHANGE:
      // create a clone of current maplayers, find the layer and modify it
      var clonedMapLayers = JSON.parse(JSON.stringify(mapLayers));
      var layer = findLayerById(clonedMapLayers, action.layerId);
      if (layer) {
        layer.visibility = action.visible;
      }
      return clonedMapLayers;
    default:
      return mapLayers;
  }
}

export default mapLayers;
