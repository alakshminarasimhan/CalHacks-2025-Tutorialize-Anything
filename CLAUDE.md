# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tutorial Maker is an AI-powered application that transforms codebases and websites into engaging cartoon-style storyboard tutorials with generated images and voice narration. It uses a multi-service architecture orchestrating Claude AI, web scraping, image generation, and text-to-speech services.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run linter
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

## Required Environment Variables

Create `.env.local` file with:

- **NEXT_PUBLIC_ECHO_API_URL**: Merit Systems Echo API endpoint (default: https://echo.merit.systems/api)
- **NEXT_PUBLIC_ECHO_APP_ID**: Your Echo application ID for OAuth authentication
- **BRIGHTDATA_API_KEY**: Web scraping via BrightData Web Unlocker API
- **ANTHROPIC_API_KEY**: Claude AI for content analysis and storyboard generation (uses `claude-sonnet-4-5-20250929` model)
- **FISHAUDIO_API_KEY**: Fish.Audio TTS for narration generation
- **STABLE_DIFFUSION_API_KEY**: Stable Diffusion 1.5 API key for image generation
- **AWS_S3_BUCKET**: S3 bucket name for media storage
- **AWS_ACCESS_KEY_ID** / **AWS_SECRET_ACCESS_KEY** / **AWS_REGION**: AWS credentials

## Architecture & Data Flow

### Authentication Flow

1. **OAuth with Merit Systems Echo** ([pages/login.tsx](pages/login.tsx))
   - Users sign in via Echo OAuth2 + PKCE
   - Universal balance across all Echo-powered apps
   - Protected routes redirect to login if not authenticated
   - Session managed by Echo React SDK

2. **Protected Pages**:
   - Homepage ([pages/index.tsx](pages/index.tsx)): Requires authentication
   - Tutorial viewer ([pages/tutorial/[sessionId].tsx](pages/tutorial/[sessionId].tsx)): Requires authentication
   - Login page ([pages/login.tsx](pages/login.tsx)): Public

### Request Pipeline

1. **Content Fetching** ([pages/api/tutorial.ts](pages/api/tutorial.ts))
   - GitHub repos: Fetches README.md from main/master branch
   - Websites: Uses BrightData Web Unlocker API, then cheerio to extract text content
   - Content is truncated to avoid token limits (10,000 chars for websites, 8,000 for Claude)

2. **Tutorial Generation** ([pages/api/tutorial.ts](pages/api/tutorial.ts):71-129)
   - Sends content to Claude with style-specific system prompts
   - Five narrative styles: explain5, frat, pizza (restaurant analogy), car (factory analogy), professional
   - Claude returns JSON with step-by-step tutorial frames (typically 5-7 frames)
   - Each frame contains conversational tutorial text plus visual scene description

3. **Image Generation** ([pages/api/image-gen.ts](pages/api/image-gen.ts))
   - Extracts visual descriptions from tutorial frames
   - Calls Pollinations.ai FREE Stable Diffusion API
   - Enforces "NO text/labels" in prompts via extensive negative prompts
   - Uploads generated PNGs to S3
   - Includes retry logic (3 attempts) and rate limit handling

4. **Audio Generation** ([pages/api/audio-gen.ts](pages/api/audio-gen.ts))
   - Sends frame text to Fish.Audio TTS API
   - Generates MP3 narration files
   - Uploads audio to S3
   - Gracefully handles failures (continues to next frame)

5. **Tutorial Viewer** ([pages/tutorial/[sessionId].tsx](pages/tutorial/[sessionId].tsx))
   - Fetches session data via GET /api/tutorial
   - Displays frames with images and audio playback
   - Supports frame navigation and audio rephrasing

### Session Management

**Critical**: Session data is stored **in-memory** via [lib/session-storage.ts](lib/session-storage.ts). This means:

- Sessions are lost on server restart
- Not suitable for production without migration to Redis/DynamoDB
- Auto-cleanup removes sessions older than 24 hours
- Uses global variable to persist across Next.js Fast Refresh in development

Session schema:
```typescript
interface SessionData {
  steps: Record<string, string>;  // step1: "description", step2: ...
  frames: FrameData[];            // populated during image/audio gen
  url: string;
  style: string;
  createdAt: number;
}

interface FrameData {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
}
```

## Key Implementation Details

### Claude Prompt Engineering

The tutorial generation prompt ([pages/api/tutorial.ts](pages/api/tutorial.ts):93-128) is critical:

- System prompt emphasizes TUTORIAL style (not just description)
- Enforces conversational language: "Let's start by...", "Now...", "Here's how..."
- Requires 2-3 sentence maximum per frame to keep concise
- Explicitly forbids text/labels in visual descriptions
- Demands narrative flow between frames

### Image Generation Strategy

[pages/api/image-gen.ts](pages/api/image-gen.ts) implements several strategies:

- **Sequential context**: Adds "Continuing the story" to maintain visual continuity
- **Text elimination**: Massive negative prompt listing all text-related terms
- **Visual extraction**: Regex to separate tutorial text from visual description
- **Retry mechanism**: 3 attempts per frame with 2-second delays
- **Rate limit handling**: Stops all generation if 429 encountered

### Error Handling Philosophy

All generation endpoints ([image-gen.ts](pages/api/image-gen.ts), [audio-gen.ts](pages/api/audio-gen.ts)) follow "graceful degradation":

- Log errors but continue to next frame
- Return partial success (e.g., "Generated 4/7 images")
- Frames display without media if generation fails
- Never throw errors that abort entire batch

### AWS S3 Configuration

S3 bucket must be configured with:

1. **Public read policy** for GetObject on `bucket/*`
2. **CORS configuration** allowing GET/HEAD from all origins
3. Files stored at: `{sessionId}/frame{N}.png` and `{sessionId}/frame{N}.mp3`
4. Public URL format: `https://{bucket}.s3.amazonaws.com/{sessionId}/frame{N}.{ext}`

## Common Development Scenarios

### Adding a New Narrative Style

1. Add option to `styleOptions` in [pages/index.tsx](pages/index.tsx):13-19
2. Add case in `buildClaudePrompt` switch statement in [pages/api/tutorial.ts](pages/api/tutorial.ts):73-91
3. Consider how style affects Claude's output format

### Implementing Persistent Storage

Replace [lib/session-storage.ts](lib/session-storage.ts) with Redis/DynamoDB:

- Maintain same interface: `createSession`, `getSession`, `updateSession`, `updateFrame`
- Update session expiration strategy (24-hour TTL)
- Add connection pooling for production load

### Debugging Generation Failures

Check logs in order:

1. Content fetch logs in [tutorial.ts](pages/api/tutorial.ts) (BrightData/GitHub fetch)
2. Claude response parsing at [tutorial.ts](pages/api/tutorial.ts):208-221
3. Image generation retries in [image-gen.ts](pages/api/image-gen.ts):78-128
4. S3 upload errors in [image-gen.ts](pages/api/image-gen.ts):145-165 and [audio-gen.ts](pages/api/audio-gen.ts):86-91

### Modifying Frame Generation Logic

The core storyboard creation happens in Claude's response to the prompt. To change:

- Frame count: Modify "5-8 frames" in userPrompt at [tutorial.ts](pages/api/tutorial.ts):126
- Frame style: Edit systemPrompt at [tutorial.ts](pages/api/tutorial.ts):93-124
- Visual style: Modify Pollinations prompt prefix at [image-gen.ts](pages/api/image-gen.ts):71

## Tech Stack

- **Framework**: Next.js 14 (Pages Router, not App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **APIs**: Next.js API Routes (serverless functions)
- **External Services**:
  - Anthropic Claude Sonnet 4.5 (AI reasoning)
  - BrightData Web Unlocker (web scraping)
  - Pollinations.ai (free image generation)
  - Fish.Audio (TTS)
  - AWS S3 (storage)

## Project Structure

```
pages/
├── api/
│   ├── tutorial.ts           # Content fetch + Claude storyboard generation
│   ├── image-gen.ts          # Pollinations.ai image generation + S3 upload
│   ├── audio-gen.ts          # Fish.Audio TTS + S3 upload
│   ├── rephrase-audio.ts     # Alternative narration generation
│   └── test-s3-access.ts     # S3 connectivity test endpoint
├── tutorial/
│   └── [sessionId].tsx       # Tutorial viewer with frame navigation
├── index.tsx                 # Landing page with URL input form
└── _app.tsx                  # Next.js app wrapper

lib/
└── session-storage.ts        # In-memory session management (REPLACE FOR PROD)
```

## Known Limitations

1. **In-memory sessions**: Data lost on restart; not horizontally scalable
2. **Image generation latency**: 2-3 seconds per frame with Pollinations.ai
3. **Serverless timeouts**: Long content may timeout on Vercel/Lambda (default 10s)
4. **No authentication**: Anyone can generate tutorials; implement rate limiting for production
5. **No caching**: Same URL generates new tutorial each time; add content hash-based caching

## Testing & Validation

Recommended test URLs:

- GitHub repo: `https://github.com/facebook/react`
- Website: Any public website accessible by BrightData

Test sequence:

1. Submit URL via homepage
2. Verify Claude storyboard generation (check response JSON)
3. Verify image generation (check S3 uploads and URLs)
4. Verify audio generation (check TTS response and S3)
5. Navigate frames in viewer and test audio playback
