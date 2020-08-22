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

      // Reposition bounding box in the vertical axis of the displayed area
      if (bottom - top < maxY - minY) {
        // Box bigger than displayed area
        pixelPosition.y += top - minY; // Stick to the top boundary
        pixelPosition.y += (bottom - top) / 2; // Centralize in displayed area
        pixelPosition.y -= (maxY - minY) / 2; // Subtract 1/2 box's height
      } else if (minY < top) {
        // Leaked displayed area's top boundary
        pixelPosition.y += top - minY; // Stick to the top boundary
      } else if (maxY > bottom) {
        // Leaked displayed area's bottom boundary
        pixelPosition.y -= maxY - bottom; // Stick to the bottom boundary
      }

      // Reposition bounding box in the horiozontal axis of the displayed area
      if (right - left < maxX - minX) {
        // Box bigger than displayed area
        pixelPosition.x += left - minX; // Stick to the left boundary
        pixelPosition.x += (right - left) / 2; // Centralize in displayed area
        pixelPosition.x -= (maxX - minX) / 2; // Subtract 1/2 box's width
      } else if (minX < left) {
        // Leaked displayed area's left boundary
        pixelPosition.x += left - minX; // Stick to the left boundary
      } else if (maxX > right) {
        // Leaked displayed area's right boundary
        pixelPosition.x -= maxX - right; // Stick to the right boundary
      }

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
