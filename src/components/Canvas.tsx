import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import p5 from 'p5';
import {
  drawAxes,
  animateGraph,
  drawAnimatedGraph,
  drawAnnotation,
  drawDiagram,
  GraphData,
  AnnotationData,
  DiagramData,
  GraphAnimationState,
  worldToScreen,
} from '../utils/drawing';
import { COORDINATE_RANGE } from '../utils/drawing';
import { parseMathExpression } from '../utils/mathParser';
import { logDrawDuration } from '../utils/analytics';
import './Canvas.css';

interface CanvasProps {
  drawingQueue: DrawingCommand[];
  onDrawingComplete?: () => void;
  onClear?: () => void;
  animationSpeed?: number; // Multiplier: 0.5x to 3x (300ms to 4500ms)
}

export interface DrawingCommand {
  type: 'graph' | 'annotation' | 'diagram';
  data: GraphData | AnnotationData | DiagramData;
}

export interface CanvasHandle {
  clear: () => void;
  exportVideo: () => Promise<void>;
}

const COLORS = [
  [0, 0, 255], // Blue
  [255, 0, 0], // Red
  [0, 128, 0], // Green
  [255, 165, 0], // Orange
  [128, 0, 128], // Purple
  [255, 20, 147], // Pink
];

let colorIndex = 0;

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  ({ drawingQueue, onDrawingComplete, onClear, animationSpeed = 1.0 }, ref) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);
    const processedCommandsRef = useRef<Set<number>>(new Set());
    const commandHistoryRef = useRef<DrawingCommand[]>([]);
    const activeAnimationsRef = useRef<Map<number, GraphAnimationState>>(new Map());
    const completedDrawingsRef = useRef<DrawingCommand[]>([]);
    const isPausedRef = useRef(false);
    const animationStartTimesRef = useRef<Map<number, number>>(new Map());

    const clearCanvas = () => {
      if (!p5InstanceRef.current) return;

      // Clear all drawings
      completedDrawingsRef.current = [];
      commandHistoryRef.current = [];
      activeAnimationsRef.current.clear();
      processedCommandsRef.current.clear();
      colorIndex = 0;

      // Clear canvas and redraw axes
      const p = p5InstanceRef.current;
      p.background(255);
      drawAxes(p);
      p.noLoop();

      // Notify parent
      onClear?.();
    };

    const exportVideo = async () => {
      if (!p5InstanceRef.current || !canvasRef.current) return;

      // Get the canvas element from the DOM
      const canvasElement = canvasRef.current.querySelector('canvas') as HTMLCanvasElement;
      if (!canvasElement) {
        console.error('Canvas element not found');
        return;
      }

      try {
        // Check if captureStream is supported
        if (!canvasElement.captureStream) {
          alert('Video export is not supported in this browser. Please use Chrome or Edge.');
          return;
        }

        const stream = canvasElement.captureStream(60); // 60 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `voiceboard-session-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        // Start recording
        mediaRecorder.start();
        alert('Recording started. Click "Stop Recording" when done.');

        // Store recorder for stopping
        (p5InstanceRef.current as any).mediaRecorder = mediaRecorder;
      } catch (error) {
        console.error('Error starting video export:', error);
        alert('Failed to start video export. Please try again.');
      }
    };

    useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      exportVideo,
    }));

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p: p5) => {
      const completedDrawings = completedDrawingsRef.current;
      
      // Performance: Frame throttling to maintain 60fps
      let lastFrameTime = 0;
      const MIN_FRAME_DELTA = 14; // Skip if delta < 14ms (throttle for 60fps)

      p.setup = () => {
        p.createCanvas(
          canvasRef.current!.clientWidth,
          canvasRef.current!.clientHeight
        );
        p.background(255);
        drawAxes(p);
        p.noLoop(); // Start with no loop - we'll enable it during animations
      };

      p.draw = () => {
        // Skip drawing if paused (tab hidden)
        if (isPausedRef.current) {
          return;
        }

        // Frame throttling: skip frame if delta < 14ms (maintain 60fps)
        const now = performance.now();
        const delta = now - lastFrameTime;
        if (delta < MIN_FRAME_DELTA) {
          return; // Skip this frame
        }
        lastFrameTime = now;

        p.background(255);
        drawAxes(p);

        // Draw all completed drawings
        // GC safety: Reuse stroke/fill settings, avoid creating new objects per frame
        completedDrawings.forEach((cmd) => {
          const colorArray = COLORS[completedDrawings.indexOf(cmd) % COLORS.length];
          const colorString = `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`;
          switch (cmd.type) {
            case 'graph': {
              // For completed graphs, draw them fully
              const graphData = cmd.data as GraphData;
              const func = parseMathExpression(graphData.expression);
              const domain = graphData.domain || [-10, 10];
              const [minX, maxX] = domain;
              const domainSpan = maxX - minX;
              
              // Adaptive sampling for completed graphs too
              const targetPoints = domainSpan > 40 ? 120 : 200;
              const step = (maxX - minX) / targetPoints;
              
              p.stroke(colorString);
              p.strokeWeight(2);
              p.noFill();
              p.beginShape();
              for (let x = minX; x <= maxX; x += step) {
                const y = func(x);
                if (!isNaN(y) && isFinite(y) && Math.abs(y) <= COORDINATE_RANGE * 2) {
                  const screenPos = worldToScreen(p, x, y);
                  p.vertex(screenPos.x, screenPos.y);
                }
              }
              p.endShape();
              break;
            }
            case 'annotation':
              drawAnnotation(p, {
                ...(cmd.data as AnnotationData),
                color: colorString,
              });
              break;
            case 'diagram':
              drawDiagram(p, {
                ...(cmd.data as DiagramData),
                color: colorString,
              });
              break;
          }
        });

        // Draw and update active animations
        let hasActiveAnimations = false;
        activeAnimationsRef.current.forEach((animationState, index) => {
          // Update progress
          animationState.progress++;
          
          // Draw animated graph
          const isComplete = drawAnimatedGraph(p, animationState);
          
          if (isComplete) {
            // Animation finished - mark command as completed
            const command = commandHistoryRef.current[index];
            if (command) {
              completedDrawings.push(command);
              activeAnimationsRef.current.delete(index);
              
              // Log draw duration
              const startTime = animationStartTimesRef.current.get(index);
              if (startTime) {
                const duration = performance.now() - startTime;
                logDrawDuration(duration);
                animationStartTimesRef.current.delete(index);
              }
              
              animationState.onComplete?.();
            }
          } else {
            hasActiveAnimations = true;
          }
        });

        // Stop loop if no active animations
        if (!hasActiveAnimations && activeAnimationsRef.current.size === 0) {
          p.noLoop();
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(
          canvasRef.current!.clientWidth,
          canvasRef.current!.clientHeight
        );
        p.redraw();
      };

      // No need to store - using ref directly
    };

    p5InstanceRef.current = new p5(sketch, canvasRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []);

  // Auto-pause animation when tab is hidden
  useEffect(() => {
    const onVis = () => {
      isPausedRef.current = document.hidden;
      // If tab becomes visible and we have active animations, resume
      if (!document.hidden && p5InstanceRef.current) {
        const hasActiveAnimations = activeAnimationsRef.current.size > 0;
        if (hasActiveAnimations) {
          p5InstanceRef.current.loop();
        }
      }
    };

    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!p5InstanceRef.current || drawingQueue.length === 0) return;

    const processQueue = () => {
      for (let i = 0; i < drawingQueue.length; i++) {
        if (processedCommandsRef.current.has(i)) continue;

        const command = drawingQueue[i];
        const p = p5InstanceRef.current!;
        const colorArray = COLORS[colorIndex % COLORS.length];
        const colorString = `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`;
        colorIndex++;

        processedCommandsRef.current.add(i);
        const commandIndex = commandHistoryRef.current.length;
        commandHistoryRef.current.push(command);

        switch (command.type) {
          case 'graph':
            const graphData = command.data as GraphData;
            // Apply animation speed multiplier (default 1500ms, range 300ms-4500ms)
            const baseSpeed = graphData.animationSpeed || 1500;
            const adjustedSpeed = baseSpeed / animationSpeed; // Higher multiplier = faster
            const animationState = animateGraph(
              p,
              { ...graphData, color: graphData.color || colorString, animationSpeed: adjustedSpeed },
              () => {
                // Animation complete callback
                onDrawingComplete?.();
              },
              animationSpeed // Pass speed multiplier for adaptive sampling
            );
            if (animationState) {
              // Track animation start time for duration logging
              animationStartTimesRef.current.set(commandIndex, performance.now());
              
              // Start animation by enabling loop
              activeAnimationsRef.current.set(commandIndex, animationState);
              p.loop();
            }
            break;

          case 'annotation':
            const annotationData = command.data as AnnotationData;
            drawAnnotation(p, {
              ...annotationData,
              color: annotationData.color || colorString,
            });
            completedDrawingsRef.current.push(command);
            p.redraw();
            break;

          case 'diagram':
            const diagramData = command.data as DiagramData;
            drawDiagram(p, {
              ...diagramData,
              color: diagramData.color || colorString,
            });
            completedDrawingsRef.current.push(command);
            p.redraw();
            break;
        }
      }
    };

    processQueue();
  }, [drawingQueue, onDrawingComplete, onClear]);

  return (
    <div className="canvas-container">
      <div ref={canvasRef} className="canvas-wrapper" />
      <div className="canvas-controls">
        <button
          className="canvas-clear-button"
          onClick={clearCanvas}
          aria-label="Clear board"
          title="Clear board"
        >
          Clear Board
        </button>
        <button
          className="canvas-export-button"
          onClick={exportVideo}
          aria-label="Export session as video"
          title="Export session as video"
        >
          Export Video
        </button>
      </div>
    </div>
  );
});

