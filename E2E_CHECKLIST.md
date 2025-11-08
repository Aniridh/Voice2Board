# E2E Smoke Test Checklist

## Prerequisites
- [ ] App runs on HTTPS (or localhost) for microphone access
- [ ] Browser supports Web Speech API (Chrome/Edge recommended)
- [ ] API key is set in localStorage

## Test Cases

### 1. Mic Permission & Speech Recognition
- [ ] Click mic button → Browser prompts for microphone permission
- [ ] Grant permission → Mic button turns red with pulsing ring
- [ ] Deny permission → Error message displays clearly
- [ ] Speak into mic → Interim text appears above mic button (grey chip)
- [ ] Stop recording → Final text goes to chat, interim clears

### 2. Graph Drawing
- [ ] Say "Graph 3cos(x)" → Animated graph appears smoothly over ~1.5s
- [ ] Graph is drawn in domain -10 to 10 by default
- [ ] Graph accumulates (doesn't clear previous graphs)
- [ ] Say "Graph x squared" → Second graph appears in different color
- [ ] Say "Graph sin(x) from -5 to 5" → Graph uses custom domain

### 3. Annotations
- [ ] Say "Label the peaks" → Markers appear at peak points
- [ ] Say "Label the vertex" → Text annotation appears at vertex
- [ ] Multiple labels work correctly
- [ ] Labels use correct positions from meta.points

### 4. Text-to-Speech
- [ ] Say "Explain amplitude" → TTS speaks explanation
- [ ] Explanation text appears in chat
- [ ] TTS can be interrupted by new command
- [ ] TTS rate/pitch persist in localStorage

### 5. Diagram Drawing
- [ ] Say "Draw a simple covalent bond for H2" → H-H molecule appears
- [ ] Say "Draw water molecule" → H-O-H structure appears
- [ ] Say "Draw a vector pointing right" → Vector arrow appears
- [ ] Say "Draw a box labeled Process" → Box with label appears
- [ ] Diagrams animate with stroke reveal

### 6. Clear Board
- [ ] Click "Clear Board" → All drawings disappear
- [ ] Axes remain visible
- [ ] Chat messages remain (not cleared)
- [ ] Can draw new graphs after clearing

### 7. Undo Functionality
- [ ] Draw multiple graphs
- [ ] Click "Undo" → Last graph disappears
- [ ] Click "Undo" multiple times → Reverts in order
- [ ] Undo button only appears when stack has items
- [ ] Stack caps at 50 actions

### 8. Animation Speed
- [ ] Move slider to 0.5x → Graphs draw slower
- [ ] Move slider to 3x → Graphs draw faster
- [ ] Speed preference persists in localStorage
- [ ] Speed applies to new graphs immediately

### 9. Video Export
- [ ] Click "Export Video" → Recording starts
- [ ] Draw some graphs while recording
- [ ] Stop recording → Video downloads as .webm
- [ ] Video plays correctly
- [ ] Graceful fallback if captureStream not supported

### 10. Error Handling
- [ ] Disconnect network → System error appears in chat
- [ ] Invalid command → Error message in chat
- [ ] API returns empty actions → Friendly error message
- [ ] App remains stable (no crashes)
- [ ] Can retry after error

### 11. UI Polish
- [ ] Interim text truncates with fade effect
- [ ] Loading spinner shows during API calls
- [ ] Error messages styled distinctly (red)
- [ ] Chat messages animate in smoothly
- [ ] Mic button pulsing ring visible when listening
- [ ] All buttons have hover states

### 12. Edge Cases
- [ ] Rapid speech → Debouncing prevents duplicate calls
- [ ] Long transcriptions → UI handles gracefully
- [ ] Multiple simultaneous commands → Queue processes correctly
- [ ] Window resize → Canvas resizes properly
- [ ] Browser back/forward → State preserved

## Notes
- All tests should pass on Chrome/Edge
- Some features may not work on Safari/Firefox (Web Speech API limitations)
- Video export requires Chrome/Edge with captureStream support

