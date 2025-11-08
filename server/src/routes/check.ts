import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { checkRequestSchema } from '../schema/checkSchema';
import { logger } from '../utils/logger';
import { callWithRetry } from '../utils/timeout';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const requestId = req.id;

  // Validate input
  const parsed = checkRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn(
      { requestId, validationErrors: parsed.error.issues },
      'Invalid check request validation'
    );
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.issues,
      requestId,
    });
  }

  const { prompt, studentAnswer, apiKey } = parsed.data;

  logger.info(
    {
      requestId,
      promptLength: prompt.length,
      answerLength: studentAnswer.length,
    },
    'Received answer check request'
  );

  try {
    const openai = new OpenAI({ apiKey });

    const makeRequest = async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful math tutor grading student answers. Analyze the student\'s answer and provide constructive feedback. Return a JSON object with: { "correct": boolean, "feedback": string, "rubric": string[] (optional) }. Be encouraging but accurate.',
          },
          {
            role: 'user',
            content: `Problem: ${prompt}\n\nStudent Answer: ${studentAnswer}\n\nGrade this answer and provide feedback.`,
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
    let parsedResponse: {
      correct?: boolean;
      feedback?: string;
      rubric?: string[];
    };
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      throw new Error('Invalid JSON response from GPT');
    }

    const result = {
      correct: parsedResponse.correct ?? false,
      feedback: parsedResponse.feedback || 'No feedback provided',
      rubric: parsedResponse.rubric,
      requestId,
    };

    logger.info(
      {
        requestId,
        correct: result.correct,
      },
      'Checked answer'
    );

    res.json(result);
  } catch (err: any) {
    logger.error(
      {
        requestId,
        error: err.message,
        errorType: err.constructor?.name,
      },
      'Error checking answer'
    );

    let errorMessage = 'Could not check answer';
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

