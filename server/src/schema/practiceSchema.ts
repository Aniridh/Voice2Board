import { z } from 'zod';
import { sanitizeTranscript } from '../utils/security';

// Use same sanitization for topic (validate first, then transform)
const sanitizeTopicTransform = z
  .string()
  .min(1, 'Topic cannot be empty')
  .max(500, 'Topic cannot exceed 500 characters')
  .transform((val) => sanitizeTranscript(val));

export const practiceRequestSchema = z.object({
  topic: sanitizeTopicTransform,
  apiKey: z.string().min(20, 'API key must be at least 20 characters'),
});

export type PracticeRequest = z.infer<typeof practiceRequestSchema>;

