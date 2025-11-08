import express, { Request, Response } from 'express';
import { interpretRequestSchema } from '../schema/interpretSchema';
import { interpretPrompt, validateTutorResponse } from '../lib/openaiClient';
import { logger } from '../utils/logger';
import { getSession, addMessage, getHistory } from '../utils/sessionStore';

const router = express.Router();

/**
 * Helper function to send SSE events
 */
function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /api/interpret - Returns endpoint information
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    endpoint: '/api/interpret',
    methods: ['POST', 'GET /stream'],
    description: 'Voice command interpretation endpoint',
    usage: {
      POST: {
        url: '/api/interpret',
        body: {
          transcript: 'string (required, max 500 chars)',
          apiKey: 'string (required, min 20 chars)',
          sessionId: 'string (optional)',
        },
        response: {
          actions: 'array of tutor actions',
          requestId: 'string',
          sessionId: 'string',
        },
      },
      'GET /stream': {
        url: '/api/interpret/stream?transcript=...&apiKey=...&sessionId=...',
        response: 'Server-Sent Events (SSE) stream',
      },
    },
    requestId: req.id,
  });
});

/**
 * Streaming endpoint for Server-Sent Events
 * GET /api/interpret/stream?transcript=...&apiKey=...
 */
router.get('/stream', async (req: Request, res: Response) => {
  const requestId = req.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Validate query parameters
  const { transcript, apiKey } = req.query;

  if (!transcript || !apiKey) {
    sendSSE(res, 'error', {
      error: 'Missing required parameters: transcript and apiKey',
      requestId,
    });
    sendSSE(res, 'end', {});
    res.end();
    return;
  }

  const parsed = interpretRequestSchema.safeParse({
    transcript: String(transcript),
    apiKey: String(apiKey),
  });

  if (!parsed.success) {
    logger.warn(
      { requestId, validationErrors: parsed.error.issues },
      'Invalid input validation (stream)'
    );
    sendSSE(res, 'error', {
      error: 'Invalid input',
      details: parsed.error.issues,
      requestId,
    });
    sendSSE(res, 'end', {});
    res.end();
    return;
  }

  const { transcript: validatedTranscript, apiKey: validatedApiKey } = parsed.data;
  const sessionId = (req.query.sessionId as string) || requestId; // Use provided sessionId or fallback to requestId

  // Get session history for context
  const sessionHistory = getHistory(sessionId);
  
  // Add user message to session
  addMessage(sessionId, 'user', validatedTranscript);

  logger.info(
    {
      requestId,
      sessionId,
      transcriptLength: validatedTranscript.length,
      transcriptPreview: validatedTranscript.substring(0, 100) + (validatedTranscript.length > 100 ? '...' : ''),
    },
    'Received streaming interpret request'
  );

  try {
    // Send initial status
    sendSSE(res, 'status', {
      message: 'parsing',
      requestId,
      sessionId,
    });
    // Flush if available (for immediate delivery)
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }

    // Call OpenAI with retry and timeout, including conversation history
    const gptResponse = await interpretPrompt(validatedTranscript, validatedApiKey, requestId, sessionHistory);
    const functionCall = gptResponse.choices[0]?.message?.function_call;

    if (!functionCall || functionCall.name !== 'tutor_action') {
      logger.error(
        {
          requestId,
          hasFunctionCall: !!functionCall,
          functionCallName: functionCall?.name,
          message: gptResponse.choices[0]?.message?.content,
        },
        'No structured response from GPT (stream)'
      );
      sendSSE(res, 'actions', { actions: [], requestId });
      sendSSE(res, 'end', {});
      res.end();
      return;
    }

    // Parse the function call arguments
    let data;
    try {
      const rawArguments = functionCall.arguments || '{}';
      data = JSON.parse(rawArguments);
    } catch (parseError: any) {
      logger.error(
        {
          requestId,
          error: parseError.message,
          rawArgumentsPreview: functionCall.arguments?.substring(0, 200),
        },
        'Failed to parse GPT function call arguments (stream)'
      );
      sendSSE(res, 'error', {
        error: 'OpenAI response parsing failed',
        detail: parseError.message,
        requestId,
      });
      sendSSE(res, 'end', {});
      res.end();
      return;
    }

    // Validate response with Zod schema
    const validated = validateTutorResponse(data);

    logger.info(
      {
        requestId,
        actionCount: validated.actions.length,
      },
      'Validated GPT response (stream)'
    );

    // Add assistant response to session
    const responseText = validated.actions
      .map((a) => `${a.action}: ${a.content}`)
      .join('; ');
    addMessage(sessionId, 'assistant', responseText);

    // Send actions
    sendSSE(res, 'actions', { ...validated, requestId, sessionId });
    // Flush if available (for immediate delivery)
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  } catch (err: any) {
    logger.error(
      {
        requestId,
        error: err.message,
        errorType: err.constructor?.name,
        stack: err.stack,
      },
      'Error interpreting prompt (stream)'
    );

    // Provide meaningful error messages
    let errorMessage = 'Could not interpret request';

    if (err.message?.includes('API key') || err.message?.includes('authentication')) {
      errorMessage = 'Invalid API key';
    } else if (err.message?.includes('rate limit') || err.status === 429) {
      errorMessage = 'OpenAI rate limit exceeded. Please try again later.';
    } else if (err.message?.includes('parse') || err.message?.includes('JSON')) {
      errorMessage = 'OpenAI response parsing failed';
    } else if (err.message?.includes('timeout') || err.message?.includes('Request timeout')) {
      errorMessage = 'Request timeout. Please try again.';
    }

    sendSSE(res, 'error', {
      error: errorMessage,
      detail: err.message || 'Unknown error occurred',
      requestId,
    });
  } finally {
    // Always send end event
    sendSSE(res, 'end', {});
    res.end();
  }
});

/**
 * Standard POST endpoint (fallback)
 */
router.post('/', async (req: Request, res: Response) => {
  const requestId = req.id;

  // Validate input
  const parsed = interpretRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn(
      { requestId, validationErrors: parsed.error.issues },
      'Invalid input validation'
    );
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.issues,
      requestId,
    });
  }

  const { transcript, apiKey } = parsed.data;
  const sessionId = (req.body.sessionId as string) || requestId; // Use provided sessionId or fallback to requestId

  // Get session history for context
  const sessionHistory = getHistory(sessionId);
  
  // Add user message to session
  addMessage(sessionId, 'user', transcript);

  // Log incoming request (without API key for security)
  logger.info(
    {
      requestId,
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
    },
    'Received interpret request'
  );

  try {
    // Call OpenAI with retry and timeout, including conversation history
    const gptResponse = await interpretPrompt(transcript, apiKey, requestId, sessionHistory);
    const functionCall = gptResponse.choices[0]?.message?.function_call;

    if (!functionCall || functionCall.name !== 'tutor_action') {
      logger.error(
        {
          requestId,
          hasFunctionCall: !!functionCall,
          functionCallName: functionCall?.name,
          message: gptResponse.choices[0]?.message?.content,
        },
        'No structured response from GPT'
      );
      // Return empty actions instead of error for better UX
      return res.status(200).json({ actions: [], requestId });
    }

    // Parse the function call arguments with comprehensive error handling
    let data;
    try {
      const rawArguments = functionCall.arguments || '{}';

      // Log raw function call arguments for debugging
      logger.debug(
        {
          requestId,
          argumentsLength: rawArguments.length,
          rawArgumentsPreview: rawArguments.substring(0, 500),
        },
        'GPT function call arguments'
      );

      data = JSON.parse(rawArguments);
    } catch (parseError: any) {
      logger.error(
        {
          requestId,
          error: parseError.message,
          rawArgumentsPreview: functionCall.arguments?.substring(0, 200),
          stack: parseError.stack,
        },
        'Failed to parse GPT function call arguments'
      );
      // Return empty actions instead of error for better UX (as per requirement)
      return res.status(200).json({
        actions: [],
        requestId,
        sessionId,
      });
    }

    // Validate response with Zod schema (bulletproof validation)
    const validated = validateTutorResponse(data);

    // Log validated response for debugging
    logger.info(
      {
        requestId,
        actionCount: validated.actions.length,
        actions: validated.actions.map((a: any) => ({
          action: a.action,
          subject: a.subject,
          visual_type: a.visual_type,
          contentPreview: a.content?.substring(0, 50) + (a.content?.length > 50 ? '...' : ''),
        })),
      },
      'Validated GPT response'
    );

    // Add assistant response to session
    const responseText = validated.actions
      .map((a) => `${a.action}: ${a.content}`)
      .join('; ');
    addMessage(sessionId, 'assistant', responseText);

    // Return the validated actions (empty array if validation failed)
    res.json({ ...validated, requestId, sessionId });
  } catch (err: any) {
    // Comprehensive error logging
    logger.error(
      {
        requestId,
        error: err.message,
        errorType: err.constructor?.name,
        stack: err.stack,
        transcriptPreview: transcript.substring(0, 50),
      },
      'Error interpreting prompt'
    );

    // Provide meaningful error messages based on error type
    let errorMessage = 'Could not interpret request';
    let statusCode = 500;

    if (err.message?.includes('API key') || err.message?.includes('authentication')) {
      errorMessage = 'Invalid API key';
      statusCode = 401;
    } else if (err.message?.includes('rate limit') || err.status === 429) {
      errorMessage = 'OpenAI rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (err.message?.includes('parse') || err.message?.includes('JSON')) {
      errorMessage = 'OpenAI response parsing failed';
      statusCode = 502;
    } else if (err.message?.includes('timeout') || err.message?.includes('Request timeout')) {
      errorMessage = 'Request timeout. Please try again.';
      statusCode = 504;
    } else if (err.status === 400) {
      errorMessage = 'Invalid request to OpenAI API';
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: errorMessage,
      detail: err.message || 'Unknown error occurred',
      requestId,
    });
  }
});

export default router;
