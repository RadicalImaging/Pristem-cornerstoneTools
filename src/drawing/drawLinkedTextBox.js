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

  const options = {
    centering: {
      x: false,
      y: yCenter,
    },
    translator(boundingBox) {
      const { pixelToCanvas } = cornerstone;
      const { width, height, left, top } = boundingBox;
      const viewport = cornerstone.getViewport(element);
      const { tlhc, brhc } = viewport.displayedArea;
      const daTopLeft = { x: tlhc.x - 1, y: tlhc.y - 1 };
      const { x: daLeft, y: daTop } = pixelToCanvas(element, daTopLeft);
      const { x: daRight, y: daBottom } = pixelToCanvas(element, brhc);
      const maxX = Math.max(daLeft, daRight);
      const maxY = Math.max(daTop, daBottom);
      const minX = Math.min(daLeft, daRight);
      const minY = Math.min(daTop, daBottom);
      const leakTop = top < minY;
      const leakLeft = left < minX;
      const leakBottom = top + height > maxY;
      const leakRight = left + width > maxX;

      if (leakBottom) {
        if (maxY - minY < height) {
          boundingBox.top = minY + (maxY - minY) / 2 - height / 2;
        } else {
          boundingBox.top = maxY - height;
        }
      } else if (leakTop) {
        boundingBox.top = minY;
      }

      if (leakRight) {
        if (maxX - minX < width) {
          boundingBox.left = minX + (maxX - minX) / 2 - width / 2;
        } else {
          boundingBox.left = maxX - width;
        }
      } else if (leakLeft) {
        boundingBox.left = minX;
      }
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
