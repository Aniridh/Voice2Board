import { z } from 'zod';
import { sanitizeTranscript } from '../utils/security';

// Use same sanitization for prompt and answer (validate first, then transform)
const sanitizeStringTransform = z
  .string()
  .min(1, 'Field cannot be empty')
  .max(500, 'Field cannot exceed 500 characters')
  .transform((val) => sanitizeTranscript(val));

export const checkRequestSchema = z.object({
  prompt: sanitizeStringTransform,
  studentAnswer: sanitizeStringTransform,
  apiKey: z.string().min(20, 'API key must be at least 20 characters'),
});

export type CheckRequest = z.infer<typeof checkRequestSchema>;

