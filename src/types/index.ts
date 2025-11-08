export type TutorAction = {
  action: 'draw' | 'annotate' | 'explain' | 'quiz';
  content: string;
  subject?: 'math' | 'physics' | 'chemistry' | 'general';
  visual_type?: 'graph' | 'diagram' | 'label';
  meta?: {
    domain?: [number, number] | null;
    labels?: string[] | null;
    points?: { x: number; y: number }[] | null;
  };
};

export type TutorResponse = { actions: TutorAction[] };

// Legacy types for backward compatibility
export type Subject = 'math' | 'physics' | 'chemistry' | 'general';
export type VisualType = 'graph' | 'diagram' | 'label';

export interface DrawingCommand {
  type: 'graph' | 'annotation' | 'diagram';
  content: string;
  position?: { x: number; y: number };
  expression?: string;
}

export interface AnimationConfig {
  speed: number; // milliseconds per stroke (default ~1500ms)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
}

