/* jshint -W083 */
import external from './../../../externalModules.js';
import { state } from '../../../store/index.js';
import EVENTS from './../../../events.js';
import {
  removeToolState,
  getToolState,
} from './../../../stateManagement/toolState.js';
import {
  moveAllHandles,
  anyHandlesOutsideDisplayedArea,
  anyHandlesOutsideImage,
  getHandleNearImagePoint,
} from './../../../manipulators/index.js';
import moveHandle from './moveHandle/moveHandle.js';
import invertHandles from './invertHandles.js';
import { setToolCursor, hideToolCursor } from '../../../store/setToolCursor.js';

export default function(evt) {
  const eventData = evt.detail;

  const { element } = eventData;
  let data;

  const distanceThreshold = state.clickProximity;

  const handleDoneMove = handle => {
    data.invalidated = true;
    if (
      anyHandlesOutsideImage(eventData, data.handles) ||
      anyHandlesOutsideDisplayedArea(eventData, data.handles)
    ) {
      // Delete the measurement
      removeToolState(element, this.name, data);
    }

    // Update the handles to keep selected state
    if (handle) {
      handle.moving = false;
      handle.selected = true;
    }

    setToolCursor(this.element, this.svgCursor);

    external.cornerstone.updateImage(element);
    element.addEventListener(EVENTS.MOUSE_MOVE, this._moveCallback);
    element.addEventListener(EVENTS.TOUCH_START, this._moveCallback);
  };

  const coords = eventData.startPoints.canvas;
  const toolData = getToolState(evt.currentTarget, this.name);

  if (!toolData) {
    return;
  }

  // Now check to see if there is a handle we can move
  for (let i = 0; i < toolData.data.length; i++) {
    data = toolData.data[i];
    const handleParams = [element, data.handles, coords, distanceThreshold];
    let handle = getHandleNearImagePoint(...handleParams);

    if (handle) {
      element.removeEventListener(EVENTS.MOUSE_MOVE, this._moveCallback);
      element.removeEventListener(EVENTS.TOUCH_START, this._moveCallback);

      data.active = true;

      unselectAllHandles(data.handles);
      handle.moving = true;

      // Invert handles if needed
      handle = invertHandles(eventData, data, handle);

      /* Hide the cursor to improve precision while resizing the line or set to move
         if dragging text box
      */
      if (!handle.hasBoundingBox) {
        hideToolCursor(this.element);
      }

      moveHandle(eventData, this.name, data, handle, () =>
        handleDoneMove(handle)
      );

      preventPropagation(evt);

      return true;
    }
  }

  const getDoneMovingCallback = handles => () => {
    setHandlesMovingState(handles, false);
    handleDoneMove();
  };

  for (let i = 0; i < toolData.data.length; i++) {
    data = toolData.data[i];
    if (this.pointNearTool(element, data, coords, 'mouse')) {
      element.removeEventListener(EVENTS.MOUSE_MOVE, this._moveCallback);
      element.removeEventListener(EVENTS.TOUCH_START, this._moveCallback);
      data.active = true;

      unselectAllHandles(data.handles);
      setHandlesMovingState(data.handles, true);

      const doneMovingCallback = getDoneMovingCallback(data.handles);

      moveAllHandles(
        eventData,
        this.name,
        data,
        null,
        {
          deleteIfHandleOutsideImage: true,
          preventHandleOutsideImage: false,
        },
        'mouse',
        doneMovingCallback
      );

      preventPropagation(evt);

      return true;
    }
  }
}

// Clear the selected state for the given handles object
const unselectAllHandles = handles => {
  let imageNeedsUpdate = false;

  Object.keys(handles).forEach(handleKey => {
    if (handleKey === 'textBox') {
      return;
    }
    handles[handleKey].selected = false;
    imageNeedsUpdate = handles[handleKey].active || imageNeedsUpdate;
    handles[handleKey].active = false;
  });

  return imageNeedsUpdate;
};

const setHandlesMovingState = (handles, state) => {
  Object.keys(handles).forEach(handleKey => {
    if (handleKey === 'textBox') {
      return;
    }
    handles[handleKey].moving = state;
  });
};

const preventPropagation = evt => {
  evt.stopImmediatePropagation();
  evt.stopPropagation();
  evt.preventDefault();
};
