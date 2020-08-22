import external from '../externalModules.js';

/**
 * Clips a value to an upper and lower bound.
 * @export @public @method
 * @name clip
 *
 * @param  {number} val  The value to clip.
 * @param  {number} low  The lower bound.
 * @param  {number} high The upper bound.
 * @returns {number}      The clipped value.
 */
export function clip(val, low, high) {
  return Math.min(Math.max(low, val), high);
}

/**
 * Clips a value within a box.
 * @export @public @method
 * @name clipToBox
 *
 * @param  {Object} point The point to clip
 * @param  {Object} box   The bounding box to clip to.
 * @returns {Object}       The clipped point.
 */
export function clipToBox(point, box) {
  // Clip an {x, y} point to a box of size {width, height}
  point.x = clip(point.x, box.left || 0, box.width);
  point.y = clip(point.y, box.top || 0, box.height);
}

const getBoxPixelLimits = (element, box) => {
  const toPixel = point => external.cornerstone.canvasToPixel(element, point);
  const { top, left, width, height } = box;
  const topLeft = toPixel({ x: left, y: top });
  const topRight = toPixel({ x: left + width, y: top });
  const bottomLeft = toPixel({ x: left, y: top + height });
  const bottomRight = toPixel({ x: left + width, y: top + height });
  const points = [topLeft, topRight, bottomLeft, bottomRight];
  const xArray = points.map(p => p.x);
  const yArray = points.map(p => p.y);

  return {
    minX: Math.min(...xArray),
    minY: Math.min(...yArray),
    maxX: Math.max(...xArray),
    maxY: Math.max(...yArray),
  };
};

const clipBoxOnAxis = (point, axis, min, max, upper, lower) => {
  // Reposition bounding box in the given axis of the displayed area
  if (lower - upper < max - min) {
    // Box bigger than displayed area
    point[axis] += upper - min; // Stick to the upper boundary
    point[axis] += (lower - upper) / 2; // Centralize in displayed area
    point[axis] -= (max - min) / 2; // Subtract 1/2 box's height
  } else if (min < upper) {
    // Leaked displayed area's upper boundary
    point[axis] += upper - min; // Stick to the upper boundary
  } else if (max > lower) {
    // Leaked displayed area's lower boundary
    point[axis] -= max - lower; // Stick to the lower boundary
  }
};

export function clipBoxToDisplayedArea(element, box) {
  const { pixelToCanvas, canvasToPixel, getViewport } = external.cornerstone;

  // Transform the position of given box from canvas to pixel coordinates
  const pixelPosition = canvasToPixel(element, {
    x: box.left,
    y: box.top,
  });

  // Get the rotated corners' position for the box in pixel coordinate system
  const { minX, minY, maxX, maxY } = getBoxPixelLimits(element, box);

  // Get the displayed area's top, left, bottom and right boundaries
  const { tlhc, brhc } = getViewport(element).displayedArea;
  const top = tlhc.y - 1;
  const left = tlhc.x - 1;
  const bottom = brhc.y;
  const right = brhc.x;

  // Clip the box on vertical axis
  clipBoxOnAxis(pixelPosition, 'y', minY, maxY, top, bottom);

  // Clip the box on horizontal axis
  clipBoxOnAxis(pixelPosition, 'x', minX, maxX, left, right);

  // Transform the box coordinate system back to canvas
  const newCanvasPosition = pixelToCanvas(element, pixelPosition);

  // Update the box with the new coordinates
  box.top = newCanvasPosition.y;
  box.left = newCanvasPosition.x;
}

export default clip;
