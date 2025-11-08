import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { practiceRequestSchema } from '../schema/practiceSchema';
import { logger } from '../utils/logger';
import { callWithRetry } from '../utils/timeout';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const requestId = req.id;

  // Validate input
  const parsed = practiceRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn(
      { requestId, validationErrors: parsed.error.issues },
      'Invalid practice request validation'
    );
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.issues,
      requestId,
    });
  }

  const { topic, apiKey } = parsed.data;

  logger.info(
    {
      requestId,
      topic: topic.substring(0, 100),
    },
    'Received practice problems request'
  );

  try {
    const openai = new OpenAI({ apiKey });

    const makeRequest = async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful math tutor. Generate 2-3 practice problems on the given topic. Return them as a JSON array of strings. Each problem should be clear, concise, and appropriate for students learning the topic.',
          },
          {
            role: 'user',
            content: `Generate 2-3 practice problems about: ${topic}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      return response;
    };

    const gptResponse = await callWithRetry(makeRequest, 3, 20_000);

    const content = gptResponse.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT');
    }

    // Parse JSON response
    let parsedResponse: { problems?: string[] } | string[];
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      // Try to extract problems from text if not JSON
      const lines = content.split('\n').filter((line) => line.trim());
      parsedResponse = { problems: lines };
    }

    // Handle both { problems: [...] } and [...] formats
    const problems =
      Array.isArray(parsedResponse)
        ? parsedResponse
        : parsedResponse.problems || [];

    if (!Array.isArray(problems) || problems.length === 0) {
      throw new Error('Invalid response format from GPT');
    }

    logger.info(
      {
        requestId,
        problemCount: problems.length,
      },
      'Generated practice problems'
    );

    res.json({
      problems,
      requestId,
    });
  } catch (err: any) {
    logger.error(
      {
        requestId,
        error: err.message,
        errorType: err.constructor?.name,
      },
      'Error generating practice problems'
    );

    let errorMessage = 'Could not generate practice problems';
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
      requestId,
    });
  }
});

export default router;

