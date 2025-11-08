import { z } from 'zod';
import { sanitizeTranscript } from '../utils/security';

// Custom transformer to sanitize transcript (validate first, then transform)
const sanitizeTranscriptTransform = z
  .string()
  .min(1, 'Transcript cannot be empty')
  .max(500, 'Transcript cannot exceed 500 characters')
  .transform((val) => sanitizeTranscript(val));

export const interpretRequestSchema = z.object({
  transcript: sanitizeTranscriptTransform,
  apiKey: z.string().min(20, 'API key must be at least 20 characters'),
});

export const tutorActionSchema = z.object({
  action: z.enum(['draw', 'annotate', 'explain', 'quiz']),
  subject: z.string().optional(),
  content: z.string(),
  visual_type: z.enum(['graph', 'diagram', 'label']).optional(),
});

export const interpretResponseSchema = z.object({
  actions: z.array(tutorActionSchema),
});

export type InterpretRequest = z.infer<typeof interpretRequestSchema>;
export type InterpretResponse = z.infer<typeof interpretResponseSchema>;

