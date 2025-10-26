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

- **NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID**: Your Cognito User Pool ID (from AWS Cognito console)
- **NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID**: Your Cognito App Client ID (from AWS Cognito console)
- **AWS_DYNAMODB_STORYBOARDS_TABLE**: DynamoDB table name for storyboards (default: tutorialize-storyboards)
- **AWS_DYNAMODB_USERS_TABLE**: DynamoDB table name for users (default: tutorialize-users)
- **BRIGHTDATA_API_KEY**: Web scraping via BrightData MCP Server (Model Context Protocol) - Free tier: 5,000 requests/month
- **PYTHON_PATH**: Path to Python 3 executable for Fetch.ai agent graph (default: python3)
- **ANTHROPIC_API_KEY**: Claude AI for content analysis and storyboard generation (uses `claude-sonnet-4-5-20250929` model)
- **FISHAUDIO_API_KEY**: Fish.Audio TTS for narration generation
- **STABLE_DIFFUSION_API_KEY**: Stable Diffusion 1.5 API key for image generation
- **AWS_S3_BUCKET**: S3 bucket name for media storage
- **AWS_ACCESS_KEY_ID** / **AWS_SECRET_ACCESS_KEY** / **AWS_REGION**: AWS credentials

## Architecture & Data Flow

### Authentication Flow

1. **AWS Cognito Authentication** ([pages/login.tsx](pages/login.tsx))
   - Email/password authentication via AWS Cognito
   - Email verification on signup
   - Protected routes redirect to login if not authenticated
   - Session managed by Cognito identity pools and JWT tokens
   - User data stored in DynamoDB

2. **Protected Pages**:
   - Homepage ([pages/index.tsx](pages/index.tsx)): Requires authentication
   - Tutorial viewer ([pages/tutorial/[sessionId].tsx](pages/tutorial/[sessionId].tsx)): Requires authentication
   - Saved storyboards ([pages/saved.tsx](pages/saved.tsx)): Shows user's saved tutorials
   - Login page ([pages/login.tsx](pages/login.tsx)): Public
   - Signup page ([pages/signup.tsx](pages/signup.tsx)): Public

3. **User Features**:
   - **Storyboard Storage** ([pages/api/storyboards/save.ts](pages/api/storyboards/save.ts)): Save completed tutorials to DynamoDB
   - **Storyboard Library** ([pages/api/storyboards/list.ts](pages/api/storyboards/list.ts)): View and manage saved tutorials
   - **JWT Authentication**: All API routes protected with Cognito JWT verification

### Request Pipeline (Agent-Based Workflow)

1. **Content Fetching** ([pages/api/tutorial.ts](pages/api/tutorial.ts))
   - GitHub repos: Fetches README.md from main/master branch
   - Websites: Uses **BrightData MCP Server** (Model Context Protocol) for advanced scraping
     - Primary: `scrape_as_markdown` tool returns clean markdown content
     - Fallback: Web Unlocker API if MCP fails, then cheerio for HTML parsing
   - Content is truncated to avoid token limits (10,000 chars for websites, 8,000 for agents)

2. **Multi-Agent Analysis** ([agents/](agents/) - **NEW**)
   - **RepoFetcherAgent** ([agents/repo_fetcher_agent.py](agents/repo_fetcher_agent.py)): Chunks text into manageable pieces and generates embeddings
   - **StructureAnalyzerAgent** ([agents/structure_analyzer_agent.py](agents/structure_analyzer_agent.py)): Extracts entities (classes, functions, components) and builds dependency graph using NetworkX
   - **FlowReasoningAgent** ([agents/flow_reasoning_agent.py](agents/flow_reasoning_agent.py)): Analyzes dependency graph to produce execution flow steps
   - Agent graph coordinated by [agents/agent_graph.py](agents/agent_graph.py)
   - Returns: `execution_flow` JSON with key components, functions, and step-by-step flow

3. **Tutorial Generation** ([pages/api/tutorial.ts](pages/api/tutorial.ts):159-247)
   - Takes execution flow data from agent analysis
   - Sends to Claude with style-specific system prompts
   - Five narrative styles: explain5, frat, pizza (restaurant analogy), car (factory analogy), professional
   - Claude converts execution flow into analogy-based tutorial storyboard
   - Returns JSON with step-by-step tutorial frames (typically 5-7 frames)
   - Each frame contains: `visualScene` (cartoon description) + `narration` (analogy explanation)

4. **Image Generation** ([pages/api/image-gen.ts](pages/api/image-gen.ts))
   - Extracts visual descriptions from tutorial frames
   - Calls Pollinations.ai FREE Stable Diffusion API
   - Enforces "NO text/labels" in prompts via extensive negative prompts
   - Uploads generated PNGs to S3
   - Includes retry logic (3 attempts) and rate limit handling

5. **Audio Generation** ([pages/api/audio-gen.ts](pages/api/audio-gen.ts))
   - Sends frame text to Fish.Audio TTS API
   - Generates MP3 narration files
   - Uploads audio to S3
   - Gracefully handles failures (continues to next frame)

6. **Tutorial Viewer** ([pages/tutorial/[sessionId].tsx](pages/tutorial/[sessionId].tsx))
   - Fetches session data via GET /api/tutorial
   - Displays frames with images and audio playback
   - Supports frame navigation and audio rephrasing
   - "Save Tutorial" button persists tutorial to DynamoDB

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

### AWS Cognito & DynamoDB Setup

**Cognito User Pool Configuration**:
1. Create User Pool with email sign-in
2. **Critical**: App client must have **NO client secret** (public client for web apps)
3. Enable self-service sign-up and email verification
4. Auth flows: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`

**DynamoDB Tables**:

**Table 1: tutorialize-users**
- Partition key: `userId` (String)
- Stores user metadata and preferences

**Table 2: tutorialize-storyboards**
- Partition key: `userId` (String)
- Sort key: `sessionId` (String)
- Stores saved tutorial data with frames (JSON)
- Global Secondary Index (optional): `sessionId-index` for session lookups

See [AWS_SETUP_GUIDE.md](AWS_SETUP_GUIDE.md) and [AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md) for detailed setup instructions.

### BrightData MCP & Python Agent Setup

**BrightData MCP Configuration**:
1. Sign up at [brightdata.com](https://brightdata.com) for API token
2. Free tier: 5,000 requests/month for first 3 months
3. Add `BRIGHTDATA_API_KEY` to `.env.local`
4. MCP client at [lib/brightdata-mcp-client.ts](lib/brightdata-mcp-client.ts) handles scraping
5. Fallback to Web Unlocker API if MCP fails

**Python Agent Dependencies**:
1. Install Python 3.8+ on your system
2. Install agent dependencies: `cd agents && pip install -r requirements.txt`
3. Required packages: `uagents>=0.12.0`, `networkx>=3.0`
4. Set `PYTHON_PATH` in `.env.local` (default: `python3`)
5. Agent graph executes via subprocess with 30-second timeout

See [BRIGHTDATA_MCP_SETUP.md](BRIGHTDATA_MCP_SETUP.md) and [agents/README.md](agents/README.md) for detailed setup instructions.

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
- **Authentication**: AWS Cognito (email/password with email verification)
- **Database**: AWS DynamoDB (user data, saved tutorials)
- **APIs**: Next.js API Routes (serverless functions)
- **External Services**:
  - Anthropic Claude Sonnet 4.5 (AI reasoning & storyboard generation)
  - BrightData MCP Server (Model Context Protocol web scraping)
  - Fetch.ai uAgents (multi-agent reasoning framework)
  - Pollinations.ai (free image generation)
  - Fish.Audio (TTS)
  - AWS S3 (media storage)
  - AWS Cognito (authentication)
  - AWS DynamoDB (persistent storage)
- **Agent Framework**: Python 3.8+ with Fetch.ai uAgents SDK

## Project Structure

```
pages/
├── api/
│   ├── tutorial.ts           # Content fetch + agent analysis + Claude storyboard generation
│   ├── image-gen.ts          # Pollinations.ai image generation + S3 upload
│   ├── audio-gen.ts          # Fish.Audio TTS + S3 upload
│   ├── rephrase-audio.ts     # Alternative narration generation
│   ├── test-s3-access.ts     # S3 connectivity test endpoint
│   └── storyboards/
│       ├── save.ts           # POST save tutorial to DynamoDB
│       ├── list.ts           # GET user's saved tutorials
│       └── [sessionId].ts    # GET specific saved tutorial
├── tutorial/
│   └── [sessionId].tsx       # Tutorial viewer with frame navigation + save button
├── index.tsx                 # Landing page with URL input form
├── saved.tsx                 # Saved storyboards library page
├── login.tsx                 # Login page with Cognito auth
├── signup.tsx                # Signup page with email verification
└── _app.tsx                  # Next.js app wrapper with AuthProvider

lib/
├── session-storage.ts        # In-memory session management (temp storage)
├── cognito.ts                # AWS Cognito authentication client
├── dynamodb.ts               # DynamoDB client for storyboard storage
├── auth-middleware.ts        # JWT token verification middleware
├── AuthContext.tsx           # React context for authentication state
├── brightdata-mcp-client.ts  # BrightData MCP client wrapper
└── brightdata-mcp-runner.js  # Node.js script to invoke MCP server

agents/                       # Python multi-agent reasoning pipeline
├── repo_fetcher_agent.py     # Chunks text and generates embeddings
├── structure_analyzer_agent.py  # Extracts entities and dependency graph
├── flow_reasoning_agent.py   # Produces execution flow from graph
├── agent_graph.py            # Orchestrates agent pipeline
├── requirements.txt          # Python dependencies (uagents, networkx)
└── README.md                 # Agent setup and usage guide
```

## Known Limitations

1. **In-memory sessions**: Active tutorial sessions (temp data) lost on restart; not horizontally scalable. Saved tutorials persist in DynamoDB.
2. **Image generation latency**: 2-3 seconds per frame with Pollinations.ai
3. **Serverless timeouts**: Long content may timeout on Vercel/Lambda (default 10s)
4. **Rate limiting**: Implement user-based rate limiting for production to prevent abuse
5. **No caching**: Same URL generates new tutorial each time; add content hash-based caching

## Testing & Validation

**Setup Requirements:**
1. Create AWS Cognito User Pool (no client secret!)
2. Create two DynamoDB tables (tutorialize-users, tutorialize-storyboards)
3. Add AWS credentials to `.env.local`
4. Run `npm run verify-auth` to verify configuration

**Recommended test URLs:**
- GitHub repo: `https://github.com/facebook/react`
- Website: Any public website accessible by BrightData

**Test sequence:**

1. **Authentication Flow:**
   - Sign up with email/password
   - Verify email confirmation (if enabled)
   - Login and verify redirect to homepage
   - Logout and verify redirect to login

2. **Tutorial Generation:**
   - Submit URL via homepage
   - Verify Claude storyboard generation (check response JSON)
   - Verify image generation (check S3 uploads and URLs)
   - Verify audio generation (check TTS response and S3)
   - Navigate frames in viewer and test audio playback

3. **User Features:**
   - Save tutorial from viewer page
   - Navigate to "Saved Storyboards" page
   - Verify saved tutorial appears in list
   - View saved tutorial
   - Delete saved tutorial
   - Verify data persists in DynamoDB
