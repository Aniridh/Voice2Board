# Ship Readiness Checklist

## ✅ HTTPS Setup

### Local Development

**Option 1: Vite HTTPS (Recommended for quick testing)**
```bash
# Set environment variable
export VITE_USE_HTTPS=true

# If using mkcert certificates:
export VITE_HTTPS_KEY=/path/to/localhost-key.pem
export VITE_HTTPS_CERT=/path/to/localhost.pem

# Run dev server
npm run dev
```

**Option 2: mkcert (Recommended for production-like local testing)**
```bash
# Install mkcert
# macOS:
brew install mkcert
# Windows (with Chocolatey):
choco install mkcert
# Linux:
# See https://github.com/FiloSottile/mkcert#linux

# Install local CA
mkcert -install

# Generate certificates for localhost
mkcert localhost 127.0.0.1 ::1

# Update vite.config.ts with paths to generated files
# Or set environment variables:
export VITE_HTTPS_KEY=./localhost-key.pem
export VITE_HTTPS_CERT=./localhost.pem
export VITE_USE_HTTPS=true
```

**Option 3: ngrok (For external HTTPS access)**
```bash
# Install ngrok: https://ngrok.com/download
# Run local dev server on HTTP
npm run dev

# In another terminal, create HTTPS tunnel
ngrok http 5173

# Use the ngrok HTTPS URL for testing
```

**Option 4: Hosted Preview (Netlify/Vercel)**
- Deploy to Netlify/Vercel for automatic HTTPS
- Use preview deployments for testing

### Production
- Ensure your hosting provider serves the app over HTTPS
- Most modern hosting (Netlify, Vercel, Cloudflare Pages) provides HTTPS by default

## ✅ API URL Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# For production (different origin)
VITE_API_URL=https://your-backend-domain.com

# For same origin (empty or relative)
VITE_API_URL=

# Or leave unset to use relative path (/api/interpret)
```

### Build-time Configuration

The API URL is set at build time, not runtime. To change it:

```bash
# Development
VITE_API_URL=https://api.example.com npm run dev

# Production build
VITE_API_URL=https://api.example.com npm run build
```

### Same-Origin Setup

If frontend and backend are on the same domain:
- Leave `VITE_API_URL` empty or unset
- The app will use relative paths (`/api/interpret`)
- No CORS issues

## ✅ CORS Configuration

### Backend CORS Setup

Your backend must allow requests from your frontend origin. Example configurations:

**Express.js:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Next.js API Routes:**
```javascript
// pages/api/interpret.ts or app/api/interpret/route.ts
export async function POST(req) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  // Your API logic...
}
```

**FastAPI:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "https://your-frontend-domain.com")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Testing CORS

1. Open browser DevTools → Network tab
2. Make a voice command
3. Check the `/api/interpret` request:
   - Should return 200 (not CORS error)
   - Response headers should include `Access-Control-Allow-Origin`

### Common CORS Issues

- **"No 'Access-Control-Allow-Origin' header"**: Backend not configured for your origin
- **Preflight OPTIONS fails**: Backend not handling OPTIONS requests
- **Credentials not sent**: Need `credentials: true` in fetch and `allow_credentials: true` in backend

## ✅ API Key Validation

### Current Implementation

- ✅ Mic button is disabled when no API key is set
- ✅ Warning banner appears at top of screen
- ✅ Banner can be dismissed but mic remains blocked
- ✅ "Enter API Key" button opens API key input modal
- ✅ API key is validated (must start with "sk-")
- ✅ API key is stored in localStorage

### Testing

1. Clear localStorage: `localStorage.removeItem('voiceboard_openai_api_key')`
2. Refresh page
3. Verify:
   - Banner appears at top
   - Mic button is grayed out and disabled
   - Clicking mic button does nothing
   - "Enter API Key" button works
   - After entering key, banner disappears and mic works

## ✅ Pre-Deployment Checklist

- [ ] HTTPS configured for local dev (if testing locally)
- [ ] `VITE_API_URL` set for production build
- [ ] Backend CORS configured for frontend origin
- [ ] API key validation working (mic blocked without key)
- [ ] Banner displays when no API key
- [ ] Test on actual HTTPS domain (not just localhost)
- [ ] Test microphone permissions on HTTPS
- [ ] Test TTS on HTTPS
- [ ] Verify all API calls work with CORS
- [ ] Check browser console for errors
- [ ] Test error handling (network failures, invalid responses)

## Production Deployment

### Build Command
```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

### Environment Variables in Hosting

**Netlify:**
- Go to Site settings → Environment variables
- Add `VITE_API_URL` with your backend URL

**Vercel:**
- Go to Project settings → Environment Variables
- Add `VITE_API_URL` for Production, Preview, and Development

**Cloudflare Pages:**
- Go to Pages → Settings → Environment variables
- Add `VITE_API_URL`

### Verify After Deployment

1. Open deployed site on HTTPS
2. Check browser console for errors
3. Test microphone permission prompt
4. Test voice command → verify API call succeeds
5. Verify CORS headers in Network tab
6. Test API key banner appears when key is missing

