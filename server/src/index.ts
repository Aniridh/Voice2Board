import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { logger } from './utils/logger.js';
import { validateASCIIPayload } from './utils/security.js';
import { testOpenAIKey } from './lib/openaiClient.js';
import interpretRoute from './routes/interpret.js';
import explainRoute from './routes/explain.js';
import practiceRoute from './routes/practice.js';
import checkRoute from './routes/check.js';

// Extend Express Request type to include request ID
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// Request ID middleware - must be after helmet
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = randomUUID();
  res.set('x-request-id', req.id);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(
    {
      requestId: req.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 60, // 60 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// CORS configuration - only allow specific origins
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests) in development
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // Check if origin is in allowed list
      if (!origin || ALLOW_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS blocked request');
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parser with size limit: 1MB
app.use(express.json({ limit: '1mb' }));

// ASCII payload validation middleware (14-line allowlist) - must be after body parser
app.use((req: Request, res: Response, next: NextFunction) => {
  // Only validate JSON bodies (skip GET requests, health checks, etc.)
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    const validation = validateASCIIPayload(req.body);
    if (!validation.valid) {
      logger.warn(
        {
          requestId: req.id,
          path: req.path,
          error: validation.error,
        },
        'Rejected non-ASCII payload'
      );
      return res.status(400).json({
        error: 'Invalid payload',
        detail: validation.error,
        requestId: req.id,
      });
    }
  }
  next();
});

// Routes
app.use('/api/interpret', interpretRoute);
app.use('/api/explain', explainRoute);
app.use('/api/practice', practiceRoute);
app.use('/api/check', checkRoute);

// Health check endpoint (excluded from rate limiting)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'VoiceBoard API Server is running',
    timestamp: new Date().toISOString(),
    allowedOrigins: ALLOW_ORIGINS,
    requestId: req.id,
  });
});

// Readiness check endpoint - verifies OpenAI key reachability
app.get('/ready', async (req: Request, res: Response) => {
  const testApiKey = process.env.OPENAI_API_KEY;
  
  if (!testApiKey) {
    return res.status(503).json({
      status: 'not ready',
      message: 'OpenAI API key not configured',
      requestId: req.id,
    });
  }

  try {
    const isReachable = await testOpenAIKey(testApiKey);
    if (isReachable) {
      res.json({
        status: 'ready',
        message: 'OpenAI API is reachable',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        message: 'OpenAI API is not reachable',
        requestId: req.id,
      });
    }
  } catch (error: any) {
    logger.error({ requestId: req.id, error: error.message }, 'Readiness check failed');
    res.status(503).json({
      status: 'not ready',
      message: 'OpenAI API check failed',
      error: error.message,
      requestId: req.id,
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'VoiceBoard AI API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      interpret: '/api/interpret',
      interpretStream: '/api/interpret/stream',
      explain: '/api/explain',
      practice: '/api/practice',
      check: '/api/check',
    },
    requestId: req.id,
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(
    {
      requestId: req.id,
      error: err.message,
      stack: err.stack,
    },
    'Request error'
  );

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id,
  });
});

// Export app for testing
export { app };

// Start server (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        allowedOrigins: ALLOW_ORIGINS,
      },
      'Server started'
    );
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/interpret`);
    console.log(`🔒 Rate limit: 60 requests/minute per IP`);
    console.log(`🌐 Allowed origins: ${ALLOW_ORIGINS.join(', ')}`);
  });
}
