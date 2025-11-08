import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { explainRequestSchema } from '../schema/explainSchema';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  // Validate input
  const parsed = explainRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn('[API] Invalid explain request:', parsed.error.issues);
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.issues,
    });
  }

  const { concept, apiKey } = parsed.data;

  // Log incoming request
  console.log('[API] Received explain request:', {
    concept: concept.substring(0, 100) + (concept.length > 100 ? '...' : ''),
    timestamp: new Date().toISOString(),
  });

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 150, // Limit to ~80 words
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful tutoring assistant. Provide clear, concise explanations in 80 words or less. Use simple language that students can understand.',
        },
        {
          role: 'user',
          content: `Explain: ${concept}`,
        },
      ],
    });

    const explanation = response.choices[0]?.message?.content || '';

    if (!explanation) {
      throw new Error('No explanation generated');
    }

    console.log('[API] Generated explanation:', {
      length: explanation.length,
      preview: explanation.substring(0, 50) + '...',
    });

    res.json({
      explanation: explanation.trim(),
    });
  } catch (err: any) {
    console.error('[API] Error generating explanation:', {
      error: err.message,
      concept: concept.substring(0, 50),
    });

    let errorMessage = 'Could not generate explanation';
    let statusCode = 500;

    if (err.message?.includes('API key') || err.status === 401) {
      errorMessage = 'Invalid API key';
      statusCode = 401;
    } else if (err.status === 429) {
      errorMessage = 'OpenAI rate limit exceeded. Please try again later.';
      statusCode = 429;
    }

    res.status(statusCode).json({
      error: errorMessage,
      detail: err.message || 'Unknown error occurred',
    });
  }
});

export default router;

