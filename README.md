# VoiceBoard AI - Real-Time Voice-to-Whiteboard Tutor

A real-time, voice-controlled tutoring whiteboard that lets students talk to the board and see it visually draw and explain their questions in real time.

## Features

- 🎙️ **Voice Input**: Use Web Speech API for real-time voice transcription
- 🧠 **AI Interpretation**: GPT-4o interprets voice commands and determines drawing actions
- 📊 **Dynamic Drawing**: p5.js canvas draws mathematical graphs, annotations, and diagrams
- 💬 **Chat Log**: See transcription history and AI responses
- 🔊 **Text-to-Speech**: Optional TTS for explanations
- 📈 **Math Support**: Uses math.js for parsing and evaluating mathematical expressions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. Clone the repository
2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
cd server && npm install && cd ..
```

### Running the Application

**Option 1: Run both frontend and backend together (recommended)**

```bash
npm run dev:all
```

This starts:
- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:3000`

**Option 2: Run separately**

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run dev:server
```

4. Open your browser to `http://localhost:5173`

5. Enter your OpenAI API key when prompted (stored locally in your browser)

## Usage

1. Click the microphone button to start recording
2. Speak a command like:
   - "Graph 3cos(x)"
   - "Draw x squared plus 2x plus 1"
   - "Label the vertex"
3. The AI will interpret your command and draw on the whiteboard
4. All drawings accumulate on the canvas

## Tech Stack

- **React + TypeScript**: Frontend framework
- **Vite**: Build tool and dev server
- **p5.js**: Canvas drawing library
- **OpenAI GPT-4o**: AI interpretation via function calling
- **Web Speech API**: Voice transcription
- **math.js**: Mathematical expression parsing

## Project Structure

```
Voice2Board/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions (drawing, math parsing, storage)
│   └── types/              # TypeScript type definitions
├── server/                 # Backend Express API
│   └── src/
│       ├── routes/         # API routes
│       ├── lib/            # OpenAI helper functions
│       ├── schema/         # Zod validation schemas
│       └── types/          # Backend type definitions
└── package.json
```

## Development

- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend API server
- `npm run dev:all` - Start both frontend and backend together
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

## Backend API

The backend API server runs on `http://localhost:3000` and provides:

- `POST /api/interpret` - Interprets voice commands using GPT-4o
- `GET /health` - Health check endpoint

See `server/README.md` for detailed API documentation.

## License

See LICENSE file for details.