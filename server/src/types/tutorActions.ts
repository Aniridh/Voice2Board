export type TutorAction = 'draw' | 'annotate' | 'explain' | 'quiz';
export type Subject = 'math' | 'physics' | 'chemistry' | 'general';
export type VisualType = 'graph' | 'diagram' | 'label';

export interface TutorActionItem {
  action: TutorAction;
  subject?: Subject;
  content: string;
  visual_type?: VisualType;
}

export interface TutorResponse {
  actions: TutorActionItem[];
}

