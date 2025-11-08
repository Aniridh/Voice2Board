import p5 from 'p5';
import { parseMathExpression } from './mathParser';
import {
  drawAtom,
  drawBond,
  drawVector as drawVectorPrimitive,
  drawBox,
  drawArrow as drawArrowPrimitive,
} from '../drawing/diagramPrimitives';

export const COORDINATE_RANGE = 10; // -10 to 10

export interface GraphData {
  expression: string;
  color: string;
  animationSpeed?: number;
  domain?: [number, number]; // [min, max] for x-axis
}

export interface AnnotationData {
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface DiagramData {
  type: 'circle' | 'rectangle' | 'line' | 'arrow' | 'molecule' | 'vector';
  subject?: 'math' | 'physics' | 'chemistry' | 'general';
  content?: string;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  radius?: number;
  color: string;
  label?: string;
}

// Convert world coordinates to screen coordinates
export function worldToScreen(
  p: p5,
  worldX: number,
  worldY: number
): { x: number; y: number } {
  const screenX = p.map(worldX, -COORDINATE_RANGE, COORDINATE_RANGE, 0, p.width);
  const screenY = p.map(
    worldY,
    COORDINATE_RANGE,
    -COORDINATE_RANGE,
    0,
    p.height
  );
  return { x: screenX, y: screenY };
}

// Convert screen coordinates to world coordinates
export function screenToWorld(
  p: p5,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  const worldX = p.map(screenX, 0, p.width, -COORDINATE_RANGE, COORDINATE_RANGE);
  const worldY = p.map(
    screenY,
    0,
    p.height,
    COORDINATE_RANGE,
    -COORDINATE_RANGE
  );
  return { x: worldX, y: worldY };
}

// Draw coordinate axes with improved contrast for projectors
export function drawAxes(p: p5) {
  // Use darker, thicker lines for better visibility on projectors
  p.stroke(100);
  p.strokeWeight(2); // Increased from 1 to 2 for better visibility
  p.fill(100);

  // Draw grid lines first (lighter, thinner)
  p.stroke(200);
  p.strokeWeight(1);
  const gridSpacing = 2; // Grid every 2 units
  
  // Vertical grid lines
  for (let i = -COORDINATE_RANGE; i <= COORDINATE_RANGE; i += gridSpacing) {
    if (i === 0) continue; // Skip center line (will be drawn as axis)
    const x = worldToScreen(p, i, 0).x;
    p.line(x, 0, x, p.height);
  }
  
  // Horizontal grid lines
  for (let i = -COORDINATE_RANGE; i <= COORDINATE_RANGE; i += gridSpacing) {
    if (i === 0) continue; // Skip center line (will be drawn as axis)
    const y = worldToScreen(p, 0, i).y;
    p.line(0, y, p.width, y);
  }

  // Draw main axes (thicker, darker)
  p.stroke(80); // Darker for better contrast
  p.strokeWeight(2.5); // Thicker for projector visibility
  p.fill(80);

  // X-axis
  const xAxisY = worldToScreen(p, 0, 0).y;
  p.line(0, xAxisY, p.width, xAxisY);

  // Y-axis
  const yAxisX = worldToScreen(p, 0, 0).x;
  p.line(yAxisX, 0, yAxisX, p.height);

  // Draw axis labels with better contrast
  p.textSize(13); // Slightly larger for readability
  p.textAlign(p.CENTER, p.CENTER);
  p.fill(60); // Darker text for better contrast

  // X-axis labels
  for (let i = -COORDINATE_RANGE; i <= COORDINATE_RANGE; i += 2) {
    if (i === 0) continue;
    const pos = worldToScreen(p, i, 0);
    p.text(i.toString(), pos.x, pos.y + 18);
  }

  // Y-axis labels
  for (let i = -COORDINATE_RANGE; i <= COORDINATE_RANGE; i += 2) {
    if (i === 0) continue;
    const pos = worldToScreen(p, 0, i);
    p.text(i.toString(), pos.x - 15, pos.y);
  }

  // Origin label
  const origin = worldToScreen(p, 0, 0);
  p.text('0', origin.x - 10, origin.y + 15);
}

// Animation state interface for progressive graph drawing
export interface GraphAnimationState {
  points: { x: number; y: number }[];
  color: string;
  progress: number;
  duration: number; // in frames (~90 frames = ~1.5s at 60fps)
  onComplete?: () => void;
}

// Draw a graph with progressive stroke-by-stroke animation
export function animateGraph(
  p: p5,
  graphData: GraphData,
  onComplete?: () => void,
  animationSpeed?: number // Speed multiplier for adaptive sampling
): GraphAnimationState | null {
  const func = parseMathExpression(graphData.expression);
  const colorStr = graphData.color || 'rgb(0, 0, 255)';

  // Use domain from graphData or default to -10..10
  const domain = graphData.domain || [-COORDINATE_RANGE, COORDINATE_RANGE];
  const [minX, maxX] = domain;
  const domainSpan = maxX - minX;

  // Adaptive sampling: reduce points for large domains or high speeds
  // Default: 200 points, reduced to 120 if domain > 40 or speed > 2.5x
  let targetPoints = 200;
  if (domainSpan > 40 || (animationSpeed && animationSpeed > 2.5)) {
    targetPoints = 120;
  }

  // Calculate points for the graph
  const points: { x: number; y: number }[] = [];
  const step = (maxX - minX) / targetPoints;
  for (let x = minX; x <= maxX; x += step) {
    const y = func(x);
    if (!isNaN(y) && isFinite(y) && Math.abs(y) <= COORDINATE_RANGE * 2) {
      points.push({ x, y });
    }
  }

  if (points.length === 0) {
    console.error('No valid points to plot');
    onComplete?.();
    return null;
  }

  // Animation duration: use parameter, graphData, or default to 1500ms
  const animationDurationMs = animationSpeed || graphData.animationSpeed || 1500; // milliseconds
  const durationInFrames = Math.floor((animationDurationMs / 1000) * 60); // Convert ms to frames

  // Return animation state for progressive drawing
  return {
    points,
    color: colorStr,
    progress: 0,
    duration: durationInFrames,
    onComplete,
  };
}

// Draw a graph progressively based on animation state
export function drawAnimatedGraph(
  p: p5,
  animationState: GraphAnimationState
): boolean {
  // Calculate how many points to draw based on progress
  const numPoints = Math.floor(
    (animationState.progress / animationState.duration) *
      animationState.points.length
  );

  if (numPoints <= 0) {
    return false; // Animation not started
  }

  // Draw the graph up to current progress
  p.stroke(animationState.color);
  p.strokeWeight(2);
  p.noFill();

  if (numPoints >= animationState.points.length) {
    // Draw complete graph
    p.beginShape();
    for (let i = 0; i < animationState.points.length; i++) {
      const screenPos = worldToScreen(
        p,
        animationState.points[i].x,
        animationState.points[i].y
      );
      p.vertex(screenPos.x, screenPos.y);
    }
    p.endShape();
    return true; // Animation complete
  } else {
    // Draw partial graph
    p.beginShape();
    for (let i = 0; i < numPoints; i++) {
      const screenPos = worldToScreen(
        p,
        animationState.points[i].x,
        animationState.points[i].y
      );
      p.vertex(screenPos.x, screenPos.y);
    }
    p.endShape();
    return false; // Animation in progress
  }
}

// Draw annotation (text label)
export function drawAnnotation(p: p5, annotation: AnnotationData) {
  const screenPos = worldToScreen(p, annotation.x, annotation.y);
  const colorStr = annotation.color || 'rgb(0, 0, 0)';

  p.fill(colorStr);
  p.stroke(255);
  p.strokeWeight(1);
  p.textSize(14);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(annotation.text, screenPos.x, screenPos.y);
}

// Draw simple diagram
export function drawDiagram(p: p5, diagram: DiagramData) {
  const colorStr = diagram.color || 'rgb(100, 100, 100)';
  const screenPos1 = worldToScreen(p, diagram.x1, diagram.y1);

  p.stroke(colorStr);
  p.strokeWeight(2);
  p.fill(colorStr);

  switch (diagram.type) {
    case 'circle':
      if (diagram.radius) {
        const radiusScreen = p.map(
          diagram.radius,
          0,
          COORDINATE_RANGE * 2,
          0,
          p.width
        );
        p.circle(screenPos1.x, screenPos1.y, radiusScreen);
      }
      break;

    case 'rectangle':
      if (diagram.x2 !== undefined && diagram.y2 !== undefined) {
        const screenPos2 = worldToScreen(p, diagram.x2, diagram.y2);
        p.rect(
          screenPos1.x,
          screenPos1.y,
          screenPos2.x - screenPos1.x,
          screenPos2.y - screenPos1.y
        );
      }
      break;

    case 'line':
      if (diagram.x2 !== undefined && diagram.y2 !== undefined) {
        const screenPos2 = worldToScreen(p, diagram.x2, diagram.y2);
        p.line(screenPos1.x, screenPos1.y, screenPos2.x, screenPos2.y);
      }
      break;

    case 'arrow':
      if (diagram.x2 !== undefined && diagram.y2 !== undefined) {
        drawArrowPrimitive(p, diagram.x1, diagram.y1, diagram.x2, diagram.y2, diagram.label, colorStr);
      }
      break;

    case 'molecule':
      // Simple molecule drawing (e.g., H2O, H2)
      // Parse content to extract atoms and bonds
      const content = diagram.content || '';
      if (content.toLowerCase().includes('h2o') || content.toLowerCase().includes('water')) {
        // H-O-H structure
        drawAtom(p, -2, 0, 'H', colorStr);
        drawAtom(p, 0, 0, 'O', colorStr);
        drawAtom(p, 2, 0, 'H', colorStr);
        drawBond(p, -2, 0, 0, 0, 'single', colorStr);
        drawBond(p, 0, 0, 2, 0, 'single', colorStr);
      } else if (content.toLowerCase().includes('h2') || content.toLowerCase().includes('hydrogen')) {
        // H-H bond
        drawAtom(p, -1, 0, 'H', colorStr);
        drawAtom(p, 1, 0, 'H', colorStr);
        drawBond(p, -1, 0, 1, 0, 'single', colorStr);
      } else {
        // Generic: draw atoms in a line
        drawAtom(p, diagram.x1, diagram.y1, diagram.label || 'A', colorStr);
        if (diagram.x2 !== undefined && diagram.y2 !== undefined) {
          drawAtom(p, diagram.x2, diagram.y2, 'B', colorStr);
          drawBond(p, diagram.x1, diagram.y1, diagram.x2, diagram.y2, 'single', colorStr);
        }
      }
      break;

    case 'vector':
      // Draw vector with angle and magnitude
      if (diagram.x2 !== undefined && diagram.y2 !== undefined) {
        const dx = diagram.x2 - diagram.x1;
        const dy = diagram.y2 - diagram.y1;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        drawVectorPrimitive(p, diagram.x1, diagram.y1, angle, magnitude, diagram.label, colorStr);
      } else {
        // Default vector: 45 degrees, magnitude 3
        drawVectorPrimitive(p, diagram.x1, diagram.y1, Math.PI / 4, 3, diagram.label, colorStr);
      }
      break;
  }

  // Draw label for non-molecule/vector types
  if (diagram.label && diagram.type !== 'molecule' && diagram.type !== 'vector') {
    p.fill(colorStr);
    p.textSize(12);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(diagram.label, screenPos1.x, screenPos1.y - 20);
  }
}

