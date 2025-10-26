/**
 * BrightData MCP Runner
 * This script runs the MCP server via npx and invokes the scrape_as_markdown tool
 *
 * Usage: node brightdata-mcp-runner.js <API_TOKEN> <URL>
 */

const { spawn } = require('child_process');

const apiToken = process.argv[2];
const targetUrl = process.argv[3];

if (!apiToken || !targetUrl) {
  console.error(JSON.stringify({ error: 'Missing API token or URL' }));
  process.exit(1);
}

// Spawn npx @brightdata/mcp with the API token
const mcpProcess = spawn('npx', ['@brightdata/mcp'], {
  env: {
    ...process.env,
    API_TOKEN: apiToken,
    PRO_MODE: 'false', // Use free tier (Rapid Mode)
  }
});

let outputData = '';
let errorData = '';

// Send MCP JSON-RPC request to scrape as markdown
const mcpRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'scrape_as_markdown',
    arguments: {
      url: targetUrl
    }
  }
};

mcpProcess.stdout.on('data', (data) => {
  outputData += data.toString();
});

mcpProcess.stderr.on('data', (data) => {
  errorData += data.toString();
});

mcpProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(JSON.stringify({ error: `MCP process exited with code ${code}: ${errorData}` }));
    process.exit(1);
  }

  try {
    // Parse the JSON-RPC response
    const response = JSON.parse(outputData);

    if (response.error) {
      console.error(JSON.stringify({ error: response.error.message || 'MCP error' }));
      process.exit(1);
    }

    // Extract the markdown content from the result
    const content = response.result?.content?.[0]?.text || response.result?.text || '';

    console.log(JSON.stringify({ content }));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ error: `Failed to parse MCP response: ${e.message}` }));
    process.exit(1);
  }
});

// Send the request to MCP server via stdin
mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
mcpProcess.stdin.end();

// Timeout after 50 seconds
setTimeout(() => {
  mcpProcess.kill();
  console.error(JSON.stringify({ error: 'MCP request timeout' }));
  process.exit(1);
}, 50000);
