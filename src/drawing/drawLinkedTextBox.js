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
      const pixelTopLeft = cornerstone.canvasToPixel(element, {
        x: boundingBox.left,
        y: boundingBox.top,
      });
      const { minX, minY, maxX, maxY } = getBoxPixelLimits(
        element,
        boundingBox
      );

      const viewport = cornerstone.getViewport(element);
      const { tlhc, brhc } = viewport.displayedArea;
      const top = tlhc.y - 1;
      const left = tlhc.x - 1;
      const { x: right, y: bottom } = brhc;

      const leakTop = minY < top;
      const leakLeft = minX < left;
      const leakBottom = maxY > bottom;
      const leakRight = maxX > right;

      if (leakTop) {
        pixelTopLeft.y += top - minY;
      } else if (leakBottom) {
        pixelTopLeft.y -= maxY - bottom;
      }

      if (leakLeft) {
        pixelTopLeft.x += left - minX;
      } else if (leakRight) {
        pixelTopLeft.x -= maxX - right;
      }

      const canvasTopLeft = cornerstone.pixelToCanvas(element, pixelTopLeft);

      boundingBox.top = canvasTopLeft.y;
      boundingBox.left = canvasTopLeft.x;
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
