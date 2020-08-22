import external from '../externalModules.js';
import drawTextBox from './drawTextBox.js';
import drawLink from './drawLink.js';

/**
 * Draw a link between an annotation to a textBox.
 * @public
 * @method drawLinkedTextBox
 * @memberof Drawing
 *
 * @param {Object} context - The canvas context.
 * @param {HTMLElement} element - The element on which to draw the link.
 * @param {Object} textBox - The textBox to link.
 * @param {Object} text - The text to display in the textbox.
 * @param {Object[]} handles - The handles of the annotation.
 * @param {Object[]} textBoxAnchorPoints - An array of possible anchor points on the textBox.
 * @param {string} color - The link color.
 * @param {number} lineWidth - The line width of the link.
 * @param {number} xOffset - The x offset of the textbox.
 * @param {boolean} yCenter - Vertically centers the text if true.
 * @returns {undefined}
 */
export default function(
  context,
  element,
  textBox,
  text,
  handles,
  textBoxAnchorPoints,
  color,
  lineWidth,
  xOffset,
  yCenter
) {
  const cornerstone = external.cornerstone;

  // Convert the textbox Image coordinates into Canvas coordinates
  const textCoords = cornerstone.pixelToCanvas(element, textBox);

  if (xOffset) {
    textCoords.x += xOffset;
  }

  const getBoxPixelLimits = (element, box) => {
    const toPixel = point => cornerstone.canvasToPixel(element, point);
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

  const options = {
    centering: {
      x: false,
      y: yCenter,
    },
    translator(boundingBox) {
      const { pixelToCanvas, canvasToPixel, getViewport } = cornerstone;
      const pixelPosition = canvasToPixel(element, {
        x: boundingBox.left,
        y: boundingBox.top,
      });
      const { minX, minY, maxX, maxY } = getBoxPixelLimits(
        element,
        boundingBox
      );

      // Get the displayed area's top, left, bottom and right boundaries
      const { tlhc, brhc } = getViewport(element).displayedArea;
      const top = tlhc.y - 1;
      const left = tlhc.x - 1;
      const bottom = brhc.y;
      const right = brhc.x;

      // Clip the bounding box on vertical axis
      clipBoxOnAxis(pixelPosition, 'y', minY, maxY, top, bottom);

      // Clip the bounding box on horizontal axis
      clipBoxOnAxis(pixelPosition, 'x', minX, maxX, left, right);

      // Transform the bounding box coordinate system back to canvas
      const newCanvasPosition = pixelToCanvas(element, pixelPosition);

      // Update the bounding box with the new coordinates
      boundingBox.top = newCanvasPosition.y;
      boundingBox.left = newCanvasPosition.x;
    },
  };

  // Draw the text box
  textBox.boundingBox = drawTextBox(
    context,
    text,
    textCoords.x,
    textCoords.y,
    color,
    options
  );
  if (textBox.hasMoved) {
    // Identify the possible anchor points for the tool -> text line
    const linkAnchorPoints = textBoxAnchorPoints(handles).map(h =>
      cornerstone.pixelToCanvas(element, h)
    );

    // Draw dashed link line between tool and text
    drawLink(
      linkAnchorPoints,
      textCoords,
      textBox.boundingBox,
      context,
      color,
      lineWidth
    );
  }
}
