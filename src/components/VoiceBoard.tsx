import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, DrawingCommand } from './Canvas';
import { ChatPanel } from './ChatPanel';
import { MicButton, MicButtonHandle } from './MicButton';
import { ApiKeyInput } from './ApiKeyInput';
import { QuickActions } from './QuickActions';
import { StatusOverlay } from './StatusOverlay';
import { Caption } from './Caption';
import { useToastQueue } from './Toast';
import { useTutorBrain } from '../hooks/useTutorBrain';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { hasApiKey, getAnimationSpeed, setAnimationSpeed, saveChatHistory, getChatHistory } from '../utils/storage';
import { GraphData, AnnotationData, DiagramData } from '../utils/drawing';
import { loadDemoSequence, getAvailableDemoSequences, getDemoSequenceName } from '../utils/demoSequences';
import { TutorResponse } from '../types';
import { logLLMLatency } from '../utils/analytics';
import './VoiceBoard.css';

export function VoiceBoard() {
  const [showApiKeyInput, setShowApiKeyInput] = useState(!hasApiKey());
  const [showApiKeyBanner, setShowApiKeyBanner] = useState(!hasApiKey());
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [availableSequences, setAvailableSequences] = useState<string[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string>('');
  const [drawingQueue, setDrawingQueue] = useState<DrawingCommand[]>([]);
  const [actionStack, setActionStack] = useState<DrawingCommand[][]>([]); // For undo
  const MAX_STACK_SIZE = 50;
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: 'user' | 'ai' | 'error';
      content: string;
      timestamp: Date;
    }>
  >([]);
  const [animationSpeed, setAnimationSpeedState] = useState(getAnimationSpeed());
  const { interpretCommand, loading, lastError } = useTutorBrain();
  const { speak } = useTextToSpeech();
  const micButtonRef = useRef<MicButtonHandle>(null);
  const [status, setStatus] = useState<'listening' | 'drawing' | 'explaining' | null>(null);
  const [captionText, setCaptionText] = useState<string | null>(null);
  const toast = useToastQueue();

  // Load available demo sequences on mount
  useEffect(() => {
    getAvailableDemoSequences().then(setAvailableSequences);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setAnimationSpeedState(speed);
    setAnimationSpeed(speed);
  }, []);

  const addChatMessage = useCallback(
    (role: 'user' | 'ai' | 'error', content: string) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          role,
          content,
          timestamp: new Date(),
        },
      ]);
    },
    []
  );

  const processActions = useCallback(
    async (response: TutorResponse) => {
      if (!response || !response.actions || response.actions.length === 0) {
        const errorMsg =
          lastError ||
          "I didn't understand that command. Could you rephrase?";
        addChatMessage('error', errorMsg);
        setStatus(null);
        return;
      }

      // Process each action
      const newCommands: DrawingCommand[] = [];
      let aiResponseText = '';
      let hasExplain = false;

      for (const action of response.actions) {
        switch (action.action) {
          case 'draw':
            if (action.visual_type === 'graph') {
              const domain = action.meta?.domain || [-10, 10];
              const graphData: GraphData = {
                expression: action.content,
                color: '#0000ff',
                animationSpeed: 1500,
                domain,
              };
              newCommands.push({ type: 'graph', data: graphData });
              aiResponseText += `Drawing graph: ${action.content}\n`;
            } else if (action.visual_type === 'diagram') {
              // Use subject to determine diagram type
              const subject = action.subject || 'general';
              const diagramData: DiagramData = {
                type: subject === 'chemistry' ? 'molecule' : subject === 'physics' ? 'vector' : 'arrow',
                subject,
                content: action.content,
                x1: 0,
                y1: 0,
                color: '#0000ff',
                label: action.content,
              };
              newCommands.push({ type: 'diagram', data: diagramData });
              aiResponseText += `Drawing diagram: ${action.content}\n`;
            }
            break;

          case 'annotate':
            // Use meta.points or meta.labels if available
            const points = action.meta?.points || [];
            const labels = action.meta?.labels || [];
            
            if (points.length > 0 && labels.length > 0) {
              // Multiple annotations
              points.forEach((point: { x: number; y: number }, idx: number) => {
                const annotationData: AnnotationData = {
                  text: labels[idx] || action.content,
                  x: point.x,
                  y: point.y,
                  color: '#000000',
                };
                newCommands.push({ type: 'annotation', data: annotationData });
              });
            } else {
              // Single annotation
              const annotationData: AnnotationData = {
                text: action.content,
                x: points[0]?.x || 0,
                y: points[0]?.y || 0,
                color: '#000000',
              };
              newCommands.push({ type: 'annotation', data: annotationData });
            }
            aiResponseText += `Adding annotation: ${action.content}\n`;
            break;

          case 'explain':
            aiResponseText += `Explanation: ${action.content}\n`;
            hasExplain = true;
            // Show caption and trigger TTS
            setCaptionText(action.content);
            speak(action.content);
            // Clear caption after TTS completes (estimate 5 seconds)
            setTimeout(() => {
              setCaptionText(null);
            }, 5000);
            break;

          case 'quiz':
            aiResponseText += `Practice problem: ${action.content}\n`;
            break;
        }
      }

      // Add AI response to chat
      if (aiResponseText.trim()) {
        addChatMessage('ai', aiResponseText.trim());
      }

      // Add commands to drawing queue and push to action stack
      if (newCommands.length > 0) {
        setStatus('drawing');
        setDrawingQueue((prev) => {
          const updated = [...prev, ...newCommands];
          // Push to action stack for undo
          setActionStack((stack) => {
            const newStack = [...stack, [...prev]];
            // Cap stack size
            return newStack.slice(-MAX_STACK_SIZE);
          });
          return updated;
        });
      }

      // Set explaining status if there's an explain action
      if (hasExplain) {
        setStatus('explaining');
        // Clear explaining status after TTS completes (rough estimate)
        setTimeout(() => {
          setStatus(null);
        }, 5000); // 5 seconds should be enough for most explanations
      } else {
        // Clear drawing status after a short delay (animation completes)
        setTimeout(() => {
          setStatus(null);
        }, 2000);
      }
    },
    [lastError, addChatMessage, speak]
  );

  const handleDemoSequence = useCallback(
    async (sequenceFile: string) => {
      const sequence = await loadDemoSequence(sequenceFile);
      if (!sequence) {
        addChatMessage('error', `Failed to load demo sequence: ${sequenceFile}`);
        return;
      }

      // Add demo message to chat
      addChatMessage('user', `[Demo] ${sequence.name}`);

      // Process actions from demo sequence
      const response: TutorResponse = { actions: sequence.actions };
      await processActions(response);
    },
    [addChatMessage, processActions]
  );

  const handleTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      // Add user message to chat
      addChatMessage('user', transcript);

      // In demo mode, ignore transcript (use demo sequences instead)
      if (isDemoMode) {
        return;
      }

      // Interpret command with GPT - track latency
      const llmStartTime = performance.now();
      const response = await interpretCommand(transcript);
      const llmLatency = performance.now() - llmStartTime;
      logLLMLatency(llmLatency);
      
      await processActions(response);
    },
    [interpretCommand, addChatMessage, isDemoMode, processActions]
  );

  const handleDrawingComplete = useCallback(() => {
    // Drawing animation completed
    // Duration is logged in Canvas component
  }, []);

  const handleClearCanvas = useCallback(() => {
    // Clear the drawing queue when canvas is cleared
    setDrawingQueue([]);
    setActionStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (actionStack.length > 0) {
      const previousState = actionStack[actionStack.length - 1];
      setDrawingQueue(previousState);
      setActionStack((stack) => stack.slice(0, -1));
    }
  }, [actionStack]);

  // Save chat history when messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      saveChatHistory(chatMessages);
    }
  }, [chatMessages]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.target && (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      // M = toggle mic
      if (key === 'm') {
        e.preventDefault();
        micButtonRef.current?.toggle();
      }

      // C = clear board
      if (key === 'c') {
        e.preventDefault();
        handleClearCanvas();
      }

      // U = undo
      if (key === 'u') {
        e.preventDefault();
        handleUndo();
      }

      // S = start/stop recording (same as M)
      if (key === 's') {
        e.preventDefault();
        micButtonRef.current?.toggle();
      }

      // + = animation speed up
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setAnimationSpeedState((s) => {
          const newSpeed = Math.min(3, s + 0.25);
          setAnimationSpeed(newSpeed);
          return newSpeed;
        });
      }

      // - = animation speed down
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setAnimationSpeedState((s) => {
          const newSpeed = Math.max(0.5, s - 0.25);
          setAnimationSpeed(newSpeed);
          return newSpeed;
        });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClearCanvas, handleUndo]);

  const handleExplain = useCallback(async () => {
    if (isDemoMode) {
      // In demo mode, inject a simple explain action
      const response: TutorResponse = {
        actions: [
          {
            action: 'explain',
            content: 'Let me explain this concept in more detail. This visualization demonstrates key mathematical principles that are fundamental to understanding the relationship between variables.',
            subject: 'math',
          },
        ],
      };
      await processActions(response);
    } else {
      // In normal mode, send a command to the API
      const transcript = 'Further explain this concept';
      addChatMessage('user', transcript);
      const response = await interpretCommand(transcript);
      await processActions(response);
    }
  }, [isDemoMode, processActions, interpretCommand, addChatMessage]);

  const handleSampleProblems = useCallback(async () => {
    if (isDemoMode) {
      // In demo mode, inject a quiz action
      const response: TutorResponse = {
        actions: [
          {
            action: 'quiz',
            content: 'Practice Problem 1: Solve for x when 2x + 5 = 15\n\nPractice Problem 2: Graph the function f(x) = x² - 4x + 3 and find its vertex.\n\nPractice Problem 3: What is the derivative of sin(x)cos(x)?',
            subject: 'math',
          },
        ],
      };
      await processActions(response);
    } else {
      // In normal mode, send a command to the API
      const transcript = 'Give me sample problems related to this';
      addChatMessage('user', transcript);
      const response = await interpretCommand(transcript);
      await processActions(response);
    }
  }, [isDemoMode, processActions, interpretCommand, addChatMessage]);

  const handleNewChat = useCallback(() => {
    // Clear chat messages
    setChatMessages([]);
    // Clear drawing queue
    setDrawingQueue([]);
    // Clear action stack
    setActionStack([]);
    // Clear canvas (via canvas clear handler)
    handleClearCanvas();
  }, [handleClearCanvas]);

  const handleViewHistory = useCallback(() => {
    const history = getChatHistory();
    if (history.length === 0) {
      addChatMessage('error', 'No chat history found.');
      return;
    }
    // For now, just show a message - could be enhanced with a modal
    addChatMessage('ai', `You have ${history.length} previous chat session(s). History viewing will be enhanced in a future update.`);
  }, [addChatMessage]);

  if (showApiKeyInput) {
    return (
      <ApiKeyInput
        onKeySet={() => {
          setShowApiKeyInput(false);
          setShowApiKeyBanner(false);
        }}
      />
    );
  }

  const apiKeyMissing = !hasApiKey();

  return (
    <div className="voice-board">
      {showApiKeyBanner && apiKeyMissing && (
        <div className="voice-board-api-key-banner">
          <div className="api-key-banner-content">
            <span className="api-key-banner-text">
              ⚠️ API key required to use voice commands. Please enter your API key to continue.
            </span>
            <button
              className="api-key-banner-button"
              onClick={() => setShowApiKeyInput(true)}
            >
              Enter API Key
            </button>
            <button
              className="api-key-banner-close"
              onClick={() => setShowApiKeyBanner(false)}
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="voice-board-main">
        <div className="voice-board-canvas">
          <StatusOverlay status={status} />
          <QuickActions
            onExplain={handleExplain}
            onSampleProblems={handleSampleProblems}
            onNewChat={handleNewChat}
            onViewHistory={handleViewHistory}
            disabled={loading}
          />
          <Canvas
            drawingQueue={drawingQueue}
            onDrawingComplete={handleDrawingComplete}
            onClear={handleClearCanvas}
            animationSpeed={animationSpeed}
          />
          <Caption text={captionText} isVisible={!!captionText} />
          <div className="voice-board-controls-panel">
            <div className="voice-board-speed-control">
              <label htmlFor="speed-slider" className="speed-label">
                Animation Speed: {animationSpeed.toFixed(1)}x
              </label>
              <input
                id="speed-slider"
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={animationSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="speed-slider"
              />
            </div>
            <div className="voice-board-demo-control">
              <label className="demo-toggle-label">
                <input
                  type="checkbox"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  className="demo-toggle-checkbox"
                />
                <span className="demo-toggle-text">Demo Mode</span>
              </label>
              {isDemoMode && (
                <select
                  className="demo-sequence-select"
                  value={selectedSequence}
                  onChange={(e) => setSelectedSequence(e.target.value)}
                >
                  <option value="">Select demo sequence...</option>
                  {availableSequences.map((seq) => (
                    <option key={seq} value={seq}>
                      {getDemoSequenceName(seq)}
                    </option>
                  ))}
                </select>
              )}
              {isDemoMode && selectedSequence && (
                <button
                  className="demo-play-button"
                  onClick={() => handleDemoSequence(selectedSequence)}
                  disabled={loading}
                >
                  Play Demo
                </button>
              )}
            </div>
            {actionStack.length > 0 && (
              <button
                className="voice-board-undo-button"
                onClick={handleUndo}
                title="Undo last action"
                aria-label="Undo last action"
              >
                Undo
              </button>
            )}
          </div>
        </div>
        <div className="voice-board-chat">
          <ChatPanel messages={chatMessages} isLoading={loading} error={lastError} />
        </div>
      </div>
      <MicButton
        ref={micButtonRef}
        onTranscript={handleTranscript}
        disabled={loading || isDemoMode}
        requiresApiKey={apiKeyMissing && !isDemoMode}
        onListeningChange={(isListening) => {
          setStatus(isListening ? 'listening' : null);
        }}
      />
      {loading && (
        <div className="voice-board-loading">Processing command...</div>
      )}
      {toast}
    </div>
  );
}

