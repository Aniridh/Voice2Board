# VoiceBoard AI Backend Server

Express.js API server for VoiceBoard AI that handles OpenAI GPT-4o function calling.

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create `.env` file:
```
PORT=3000
OPENAI_API_KEY=sk-...  # Optional, can also be passed in request body
```

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### POST /api/interpret

Interprets a voice command and returns structured actions.

**Request:**
```json
{
  "transcript": "Graph 3cos(x) and label the peaks",
  "apiKey": "sk-..."
}
```

**Response:**
```json
{
  "actions": [
    {
      "action": "draw",
      "subject": "math",
      "content": "3*cos(x)",
      "visual_type": "graph"
    },
    {
      "action": "annotate",
      "subject": "math",
      "content": "label peaks",
      "visual_type": "label"
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Could not interpret request",
  "message": "Error details..."
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "VoiceBoard API Server is running"
}
```

## Project Structure

```
server/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── routes/
│   │   └── interpret.ts     # /api/interpret route
│   ├── lib/
│   │   └── openaiClient.ts  # OpenAI helper functions
│   ├── schema/
│   │   └── interpretSchema.ts # Zod validation schemas
│   └── types/
│       └── tutorActions.ts   # TypeScript type definitions
└── package.json
```

## Building

Build TypeScript to JavaScript:
```bash
npm run build
```

Output will be in the `dist/` directory.

## Production

Run the compiled server:
```bash
npm start
```

