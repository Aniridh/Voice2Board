import { z } from 'zod';
import { sanitizeTranscript } from '../utils/security';

// Use same sanitization for concept (validate first, then transform)
const sanitizeConceptTransform = z
  .string()
  .min(1, 'Concept cannot be empty')
  .max(500, 'Concept cannot exceed 500 characters')
  .transform((val) => sanitizeTranscript(val));

export const explainRequestSchema = z.object({
  concept: sanitizeConceptTransform,
  apiKey: z.string().min(20, 'API key must be at least 20 characters'),
});

export type ExplainRequest = z.infer<typeof explainRequestSchema>;

