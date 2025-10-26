# Recent Updates - Tutorial Maker

## Overview

This document summarizes the recent major updates to the Tutorial Maker application, including BrightData MCP integration, Fetch.ai multi-agent reasoning pipeline, and Fish.Audio celebrity voice support.

## Update 1: BrightData MCP Integration

### What Changed

Replaced the traditional BrightData Web Unlocker API with the **Model Context Protocol (MCP)** server for advanced web scraping.

### Why

- **AI-Ready Output**: MCP returns clean markdown instead of raw HTML
- **Better Agent Integration**: Works seamlessly with the new agent-based workflow
- **Free Tier**: 5,000 requests/month for first 3 months
- **Automatic Cleaning**: No need for manual cheerio parsing

### Files Modified

- [pages/api/tutorial.ts](pages/api/tutorial.ts) - Updated scraping logic with MCP client
- [lib/brightdata-mcp-client.ts](lib/brightdata-mcp-client.ts) - NEW: MCP client wrapper
- [lib/brightdata-mcp-runner.js](lib/brightdata-mcp-runner.js) - NEW: Node.js MCP runner
- [package.json](package.json) - Added `@modelcontextprotocol/sdk`
- [.env.example](.env.example) - Updated BrightData configuration

### How It Works

```
URL → BrightData MCP Server (scrape_as_markdown)
  ↓
Clean Markdown Content
  ↓
Agent Pipeline Processing
```

### Error Handling

The implementation includes robust fallbacks:
1. **Primary**: BrightData MCP `scrape_as_markdown`
2. **Fallback 1**: BrightData Web Unlocker API
3. **Fallback 2**: Basic fetch with User-Agent

### Documentation

- [BRIGHTDATA_MCP_SETUP.md](BRIGHTDATA_MCP_SETUP.md) - Complete setup guide

---

## Update 2: Fetch.ai Multi-Agent Reasoning Pipeline

### What Changed

Added a **3-agent reasoning pipeline** using Fetch.ai's uAgents framework to analyze content before generating tutorials.

### Agent Architecture

```
Content → RepoFetcherAgent → StructureAnalyzerAgent → FlowReasoningAgent
            (Chunking)         (Dependency Graph)      (Execution Flow)
                                                              ↓
                                                    Claude AI Storyboard
```

### Agents Created

1. **RepoFetcherAgent** ([agents/repo_fetcher_agent.py](agents/repo_fetcher_agent.py))
   - Chunks text into manageable pieces
   - Generates embeddings for each chunk
   - Prepares content for analysis

2. **StructureAnalyzerAgent** ([agents/structure_analyzer_agent.py](agents/structure_analyzer_agent.py))
   - Extracts entities (classes, functions, components)
   - Builds dependency graph using NetworkX
   - Identifies relationships between components

3. **FlowReasoningAgent** ([agents/flow_reasoning_agent.py](agents/flow_reasoning_agent.py))
   - Analyzes dependency graph
   - Creates execution flow steps
   - Identifies key components and functions

### Output Format

```json
{
  "key_components": ["component1", "component2", ...],
  "key_functions": ["function1", "function2", ...],
  "execution_flow": [
    "Initialize component1",
    "Process component2",
    "Return result from component3"
  ]
}
```

### Files Created

- [agents/repo_fetcher_agent.py](agents/repo_fetcher_agent.py)
- [agents/structure_analyzer_agent.py](agents/structure_analyzer_agent.py)
- [agents/flow_reasoning_agent.py](agents/flow_reasoning_agent.py)
- [agents/agent_graph.py](agents/agent_graph.py) - Orchestrator
- [agents/requirements.txt](agents/requirements.txt) - Python dependencies
- [agents/README.md](agents/README.md) - Agent documentation

### Files Modified

- [pages/api/tutorial.ts](pages/api/tutorial.ts) - Integrated agent pipeline
- [CLAUDE.md](CLAUDE.md) - Updated architecture documentation

### Setup Requirements

```bash
cd agents
pip install -r requirements.txt
```

Required packages:
- `uagents>=0.12.0`
- `networkx>=3.0`

### Environment Variables

```bash
PYTHON_PATH=python3  # Path to Python executable
```

### Documentation

- [agents/README.md](agents/README.md) - Agent setup and usage

---

## Update 3: Fish.Audio Celebrity Voice Support

### What Changed

Added **celebrity-style voice selection** for tutorial narration using Fish.Audio's voice cloning API.

### Features

- Voice selection dropdown on homepage
- 5+ pre-configured celebrity-style voices
- Voice preference stored in session
- Automatic voice application during audio generation

### Voice Options (Placeholder IDs)

- Default Voice
- Morgan Freeman Style
- David Attenborough Style
- Oprah Winfrey Style
- Neil deGrasse Tyson Style
- Stephen Fry Style

**Note**: These are placeholder IDs. Replace with actual voice IDs from Fish.Audio.

### Files Modified

- [pages/index.tsx](pages/index.tsx) - Added voice selection UI
- [pages/api/tutorial.ts](pages/api/tutorial.ts) - Accept and store voiceId
- [pages/api/audio-gen.ts](pages/api/audio-gen.ts) - Use voiceId in TTS requests
- [lib/session-storage.ts](lib/session-storage.ts) - Added voiceId field

### How It Works

```
User selects voice on homepage
  ↓
Voice ID stored in session
  ↓
Audio generation uses Fish.Audio reference_id parameter
  ↓
Narration generated in selected voice
```

### API Integration

```typescript
const ttsPayload = {
  text: narration,
  format: 'mp3',
  sample_rate: 44100,
  reference_id: voiceId || null  // Celebrity voice ID
};
```

### Getting Real Voice IDs

1. Sign up at [fish.audio](https://fish.audio)
2. Browse Voice Library: https://fish.audio/app/discovery/
3. Copy voice `reference_id` or `model_id`
4. Replace placeholder IDs in [pages/index.tsx](pages/index.tsx)

### Documentation

- [FISHAUDIO_VOICE_SETUP.md](FISHAUDIO_VOICE_SETUP.md) - Complete voice setup guide

---

## Combined Architecture

### Complete Pipeline

```
User enters URL + selects voice & style
  ↓
BrightData MCP → Clean Markdown
  ↓
Fetch.ai Agent Graph (3 agents)
  ├─ Chunk & Embed
  ├─ Dependency Graph
  └─ Execution Flow
  ↓
Claude AI → Analogy Storyboard
  ↓
Stable Diffusion → Images
  ↓
Fish.Audio (with celebrity voice) → Audio
  ↓
Tutorial Viewer
```

### Tech Stack Updates

**New Additions**:
- BrightData MCP Server (Model Context Protocol)
- Fetch.ai uAgents (Python multi-agent framework)
- Fish.Audio Voice Cloning API
- NetworkX (Python graph analysis)

**Existing**:
- Next.js 14
- TypeScript
- AWS Cognito + DynamoDB + S3
- Anthropic Claude Sonnet 4.5
- Pollinations.ai Stable Diffusion

---

## Breaking Changes

### None

All updates are backward compatible with existing functionality:
- Old sessions continue to work
- Default voice used if no voice selected
- Basic fetch works if BrightData not configured
- Agent pipeline has fallback flow if Python not available

---

## Setup Instructions

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Install Python Dependencies

```bash
cd agents
pip install -r requirements.txt
```

### 3. Update Environment Variables

Add to `.env.local`:

```bash
# BrightData MCP
BRIGHTDATA_API_KEY=your_api_token_here

# Python for Agents
PYTHON_PATH=python3

# Fish.Audio (existing)
FISHAUDIO_API_KEY=your_api_key_here
```

### 4. Get Fish.Audio Voice IDs

1. Visit https://fish.audio/app/discovery/
2. Browse and select voices
3. Copy voice IDs
4. Update `voiceOptions` in [pages/index.tsx](pages/index.tsx)

### 5. Run Development Server

```bash
npm run dev
```

---

## Testing

### Test Scraping Error Fix

Try the URL that was failing before:
```
https://pmc.ncbi.nlm.nih.gov/articles/PMC7983091/
```

The improved error handling should now:
1. Attempt BrightData MCP
2. Fallback to Web Unlocker if MCP fails
3. Fallback to basic fetch as last resort
4. Provide detailed error logs

### Test Celebrity Voice

1. Select a voice from dropdown
2. Submit a URL
3. Check console logs for: `Using voice ID: ...`
4. Listen to generated audio with selected voice

### Test Agent Pipeline

1. Submit any URL (GitHub repo or website)
2. Check server logs for:
   - `Running agent graph for content analysis...`
   - `Agent graph completed:` with execution flow JSON
3. Verify tutorial quality improved by agent analysis

---

## Known Issues

### Voice IDs are Placeholders

Current voice IDs in UI are placeholders. To use:
1. Get real IDs from Fish.Audio
2. Update `voiceOptions` in [pages/index.tsx](pages/index.tsx)

### BrightData MCP Requires Setup

MCP requires:
- BrightData account and API token
- `npx` available in PATH
- Node.js 18+

If not configured, falls back to basic fetch.

### Python Agent Pipeline

Requires:
- Python 3.8+
- uAgents and NetworkX installed
- PYTHON_PATH configured

If not available, uses fallback execution flow.

---

## Documentation

All new features are documented:

- [BRIGHTDATA_MCP_SETUP.md](BRIGHTDATA_MCP_SETUP.md) - BrightData MCP setup
- [FISHAUDIO_VOICE_SETUP.md](FISHAUDIO_VOICE_SETUP.md) - Celebrity voice setup
- [agents/README.md](agents/README.md) - Agent pipeline documentation
- [CLAUDE.md](CLAUDE.md) - Updated project overview

---

## Performance Impact

### Improved

- **Scraping**: MCP returns cleaner content (less processing needed)
- **Content Understanding**: Agent analysis provides better structure
- **Tutorial Quality**: Execution flow → better analogies

### Added Latency

- **Agent Processing**: +5-10 seconds for analysis (30s timeout)
- **Voice Generation**: Minimal impact (Fish.Audio already used)
- **MCP Scraping**: Similar to Web Unlocker API

### Optimizations

- Parallel processing where possible
- Timeouts prevent hanging
- Fallback mechanisms ensure completion

---

## Future Improvements

### Short Term

1. Get real Fish.Audio voice IDs
2. Test with more URLs to verify scraping fixes
3. Add voice preview feature
4. Cache agent analysis results

### Long Term

1. Replace in-memory session storage with Redis/DynamoDB
2. Add more sophisticated agent reasoning
3. Expand voice library with more options
4. Implement voice matching based on content type

---

## Support

For issues or questions:
- Check documentation in respective setup guides
- Review error logs in browser console and server logs
- Test with fallback options to isolate issues
