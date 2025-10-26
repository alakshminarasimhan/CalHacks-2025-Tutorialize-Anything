# BrightData MCP Integration Guide

This guide explains how the BrightData MCP (Model Context Protocol) server is integrated for advanced web scraping with agent-based workflows.

## What is BrightData MCP?

BrightData MCP is a Model Context Protocol server that provides AI assistants with real-time web access capabilities. It offers:

- **Anti-bot protection**: Automatic bypass of CAPTCHAs, rate limits, and blocks
- **Clean output**: Returns markdown-formatted content ready for AI processing
- **Global access**: Handles geo-restrictions automatically
- **Free tier**: 5,000 requests/month for the first 3 months

## Architecture

The integration replaces the traditional Web Unlocker API with an MCP-based approach:

```
User URL
   ↓
BrightData MCP Server
   ├─ scrape_as_markdown tool
   ├─ Anti-bot protection
   └─ Content cleaning
   ↓
Clean Markdown Text
   ↓
Fetch.ai Agent Graph
   ├─ RepoFetcherAgent: Chunk & embed
   ├─ StructureAnalyzerAgent: Dependency graph
   └─ FlowReasoningAgent: Execution flow
   ↓
execution_flow JSON
   ↓
Claude AI → Analogy Storyboard
   ↓
Image & Audio Generation
```

## Setup Instructions

### 1. Get BrightData API Token

1. Sign up at [brightdata.com](https://brightdata.com)
2. Navigate to your dashboard
3. Generate an API token
4. Copy the token

### 2. Configure Environment

Add to `.env.local`:

```bash
BRIGHTDATA_API_KEY=your_brightdata_api_token_here
```

### 3. Install Dependencies

Install the MCP SDK package:

```bash
npm install
```

This will install `@modelcontextprotocol/sdk` which is required for MCP communication.

### 4. Verify Setup

The application will automatically use BrightData MCP when scraping websites. The integration includes:

- **Primary**: MCP `scrape_as_markdown` tool (returns clean markdown)
- **Fallback**: Direct Web Unlocker API (returns HTML if MCP fails)

## How It Works

### MCP Client (`lib/brightdata-mcp-client.ts`)

The client handles communication with BrightData's MCP server:

```typescript
const mcpClient = new BrightDataMCPClient(apiToken);
const markdown = await mcpClient.scrapeAsMarkdown(url);
```

### MCP Runner (`lib/brightdata-mcp-runner.js`)

A Node.js script that:
1. Spawns `npx @brightdata/mcp` with your API token
2. Sends JSON-RPC request to invoke `scrape_as_markdown`
3. Returns clean markdown content

### Tutorial API Integration

The `/pages/api/tutorial.ts` endpoint:

1. **Fetches content** via BrightData MCP
2. **Detects format**: Markdown (from MCP) or HTML (from fallback)
3. **Processes content** through Fetch.ai agent graph
4. **Generates storyboard** using Claude AI

## Advantages Over Web Unlocker

| Feature | Web Unlocker API | BrightData MCP |
|---------|------------------|----------------|
| Output format | Raw HTML | Clean Markdown |
| AI-ready | Requires parsing | Yes |
| Agent workflow | Separate step | Integrated |
| Rate limiting | Manual handling | Automatic |
| CAPTCHA solving | Included | Included |
| Content cleaning | Manual (cheerio) | Automatic |

## Error Handling

The integration includes robust error handling:

1. **MCP timeout**: 60-second timeout on scraping requests
2. **Fallback mechanism**: Automatically switches to Web Unlocker API if MCP fails
3. **Graceful degradation**: Continues with fallback data if errors occur

## Troubleshooting

### "MCP request failed" Error

**Cause**: BrightData MCP server couldn't be reached or token is invalid

**Solution**:
1. Verify your API token in `.env.local`
2. Check you have an active BrightData account
3. Ensure you haven't exceeded free tier limits (5,000 requests/month)

### "MCP request timeout" Error

**Cause**: Website took too long to scrape (>60 seconds)

**Solution**: The system will automatically fall back to Web Unlocker API. No action needed.

### "Failed to parse MCP response" Error

**Cause**: MCP server returned invalid JSON

**Solution**: The fallback mechanism will handle this automatically.

## Free Tier Limits

- **5,000 requests per month** for the first 3 months
- After 3 months, credit card required
- Monitor usage in your BrightData dashboard

## Advanced Configuration

### Pro Mode (Optional)

To enable Pro Mode with 60+ advanced tools, update the MCP runner environment:

```javascript
env: {
  API_TOKEN: apiToken,
  PRO_MODE: 'true', // Enable Pro Mode
}
```

**Note**: Pro mode requires paid plan and is not included in free tier.

### Custom Timeout

Modify timeout in `lib/brightdata-mcp-client.ts`:

```typescript
setTimeout(() => {
  nodeProcess.kill();
  reject(new Error('MCP request timeout'));
}, 90000); // Change from 60000 to 90000 for 90 seconds
```

## Testing

Test the integration manually:

```bash
# Test URL scraping
curl -X POST http://localhost:3000/api/tutorial \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "style": "professional"}'
```

Check logs for:
- `Fetching website via BrightData MCP...`
- `BrightData MCP scraping completed successfully`

## Resources

- [BrightData MCP Documentation](https://docs.brightdata.com/mcp-server/overview)
- [BrightData GitHub](https://github.com/brightdata/brightdata-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
