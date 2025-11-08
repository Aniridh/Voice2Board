import OpenAI from 'openai';
import { interpretResponseSchema } from '../schema/interpretSchema';
import { callWithRetry } from '../utils/timeout';
import { logger } from '../utils/logger';

// JSON Schema for function calling (matches Zod schema)
const tutorActionFunctionSchema = {
  name: 'tutor_action',
  description:
    'Determine the action(s) to take based on the user voice command. Extract and prioritize the main command, but can return multiple actions if the user requests multiple things.',
  parameters: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        description:
          'Array of actions to execute. Can contain multiple actions if user requests multiple things (e.g., "draw x² and label the vertex").',
        items: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['draw', 'annotate', 'explain', 'quiz'],
              description:
                'The type of action: draw (plot graph/diagram), annotate (add labels), explain (provide explanation), quiz (generate practice problem)',
            },
            subject: {
              type: 'string',
              enum: ['math', 'physics', 'chemistry', 'general'],
              description: 'The subject area of the command',
            },
            content: {
              type: 'string',
              description:
                'The content to draw/annotate/explain. For graphs, this should be the mathematical expression (e.g., "x^2 + 2x + 1", "3*cos(x)"). For annotations, this is the label text. For explanations, this is the explanation text.',
            },
            visual_type: {
              type: 'string',
              enum: ['graph', 'diagram', 'label'],
              description:
                'The type of visual: graph (mathematical function), diagram (general diagram), label (text annotation)',
            },
          },
          required: ['action', 'content'],
          additionalProperties: false,
        },
      },
    },
    required: ['actions'],
    additionalProperties: false,
  },
} as const;

export async function interpretPrompt(
  prompt: string,
  apiKey: string,
  requestId?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const openai = new OpenAI({ apiKey });

  const makeRequest = async () => {
    try {
      // Build messages array with system prompt, conversation history, and current prompt
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content:
            'You are the reasoning engine for a voice-driven whiteboard tutor. When users speak commands like "Graph 3cos(x)" or "Label the vertex of x² + 2x + 1", extract the mathematical expressions and determine the appropriate actions. You can return multiple actions if the user requests multiple things in one command. Always return valid JSON matching the function schema exactly. You can use conversation history to understand follow-up questions and context.',
        },
      ];

      // Add conversation history (last 10 messages to keep context manageable)
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      }

      // Add current prompt
      messages.push({ role: 'user', content: prompt });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        messages,
        functions: [tutorActionFunctionSchema],
        function_call: { name: 'tutor_action' },
      });

      return response;
    } catch (error: any) {
      // Re-throw with more context
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.message) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  };

  // Call with retry and timeout
  try {
    const response = await callWithRetry(makeRequest, 3, 20_000);
    logger.info(
      { requestId, promptLength: prompt.length },
      'OpenAI request successful'
    );
    return response;
  } catch (error: any) {
    logger.error(
      { requestId, error: error.message, promptLength: prompt.length },
      'OpenAI request failed after retries'
    );
    throw error;
  }
}

/**
 * Test OpenAI API key reachability
 */
export async function testOpenAIKey(apiKey: string): Promise<boolean> {
  const openai = new OpenAI({ apiKey });

  try {
    // Make a minimal test request
    await callWithRetry(
      async () => {
        await openai.models.list();
      },
      2,
      5_000 // Shorter timeout for health check
    );
    return true;
  } catch (error: any) {
    logger.warn({ error: error.message }, 'OpenAI key test failed');
    return false;
  }
}

/**
 * Validates the parsed response using Zod schema
 * Returns empty actions array if validation fails
 */
export function validateTutorResponse(data: unknown): { actions: any[] } {
  try {
    const validated = interpretResponseSchema.parse(data);
    return validated;
  } catch (error) {
    logger.warn({ error }, 'Zod validation failed, returning empty actions');
    return { actions: [] };
  }
}
