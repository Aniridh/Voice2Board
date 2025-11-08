import p5 from 'p5';
import { worldToScreen } from '../utils/drawing';

// Draw an atom (circle with label)
export function drawAtom(
  p: p5,
  x: number,
  y: number,
  label: string,
  color: string = 'rgb(100, 100, 200)'
) {
  const screenPos = worldToScreen(p, x, y);
  const radius = 20;

  p.stroke(color);
  p.strokeWeight(2);
  p.fill(255);
  p.circle(screenPos.x, screenPos.y, radius * 2);

  p.fill(color);
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(label, screenPos.x, screenPos.y);
}

// Draw a bond between two points
export function drawBond(
  p: p5,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: 'single' | 'double',
  color: string = 'rgb(0, 0, 0)'
) {
  const pos1 = worldToScreen(p, x1, y1);
  const pos2 = worldToScreen(p, x2, y2);

  p.stroke(color);
  p.strokeWeight(2);

  if (type === 'single') {
    p.line(pos1.x, pos1.y, pos2.x, pos2.y);
  } else if (type === 'double') {
    // Draw two parallel lines
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const perpX = -dy;
    const perpY = dx;
    const len = Math.sqrt(perpX * perpX + perpY * perpY);
    const offset = 3;
    const offsetX = (perpX / len) * offset;
    const offsetY = (perpY / len) * offset;

    p.line(
      pos1.x + offsetX,
      pos1.y + offsetY,
      pos2.x + offsetX,
      pos2.y + offsetY
    );
    p.line(
      pos1.x - offsetX,
      pos1.y - offsetY,
      pos2.x - offsetX,
      pos2.y - offsetY
    );
  }
}

// Draw a vector (arrow with magnitude and angle)
export function drawVector(
  p: p5,
  x: number,
  y: number,
  angleRad: number,
  magnitude: number,
  label?: string,
  color: string = 'rgb(255, 0, 0)'
) {
  const startPos = worldToScreen(p, x, y);
  const endX = x + magnitude * Math.cos(angleRad);
  const endY = y + magnitude * Math.sin(angleRad);
  const endPos = worldToScreen(p, endX, endY);

  p.stroke(color);
  p.strokeWeight(2);
  p.fill(color);

  // Draw arrow line
  p.line(startPos.x, startPos.y, endPos.x, endPos.y);

  // Draw arrowhead
  const arrowLength = 10;
  const arrowAngle = Math.PI / 6;
  const lineAngle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);

  p.line(
    endPos.x,
    endPos.y,
    endPos.x - arrowLength * Math.cos(lineAngle - arrowAngle),
    endPos.y - arrowLength * Math.sin(lineAngle - arrowAngle)
  );
  p.line(
    endPos.x,
    endPos.y,
    endPos.x - arrowLength * Math.cos(lineAngle + arrowAngle),
    endPos.y - arrowLength * Math.sin(lineAngle + arrowAngle)
  );

  // Draw label if provided
  if (label) {
    p.textSize(12);
    p.textAlign(p.CENTER, p.CENTER);
    const midX = (startPos.x + endPos.x) / 2;
    const midY = (startPos.y + endPos.y) / 2;
    p.text(label, midX, midY - 15);
  }
}

// Draw a box (rectangle with label)
export function drawBox(
  p: p5,
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
  color: string = 'rgb(200, 200, 200)'
) {
  const screenPos = worldToScreen(p, x, y);
  const screenWidth = p.map(width, 0, 20, 0, p.width);
  const screenHeight = p.map(height, 0, 20, 0, p.height);

  p.stroke(color);
  p.strokeWeight(2);
  p.fill(255);
  p.rect(screenPos.x, screenPos.y, screenWidth, screenHeight);

  if (label) {
    p.fill(color);
    p.textSize(12);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(label, screenPos.x + screenWidth / 2, screenPos.y + screenHeight / 2);
  }
}

// Draw an arrow between two points with optional label
export function drawArrow(
  p: p5,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label?: string,
  color: string = 'rgb(0, 0, 0)'
) {
  const pos1 = worldToScreen(p, x1, y1);
  const pos2 = worldToScreen(p, x2, y2);

  p.stroke(color);
  p.strokeWeight(2);
  p.fill(color);

  // Draw arrow line
  p.line(pos1.x, pos1.y, pos2.x, pos2.y);

  // Draw arrowhead
  const arrowLength = 10;
  const arrowAngle = Math.PI / 6;
  const lineAngle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);

  p.line(
    pos2.x,
    pos2.y,
    pos2.x - arrowLength * Math.cos(lineAngle - arrowAngle),
    pos2.y - arrowLength * Math.sin(lineAngle - arrowAngle)
  );
  p.line(
    pos2.x,
    pos2.y,
    pos2.x - arrowLength * Math.cos(lineAngle + arrowAngle),
    pos2.y - arrowLength * Math.sin(lineAngle + arrowAngle)
  );

  // Draw label if provided
  if (label) {
    p.textSize(12);
    p.textAlign(p.CENTER, p.CENTER);
    const midX = (pos1.x + pos2.x) / 2;
    const midY = (pos1.y + pos2.y) / 2;
    p.text(label, midX, midY - 15);
  }
}

