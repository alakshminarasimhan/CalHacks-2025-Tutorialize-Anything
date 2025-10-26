import { spawn } from 'child_process';
import path from 'path';

interface MCPResponse {
  content: string;
  error?: string;
}

/**
 * BrightData MCP Client
 * Uses the @modelcontextprotocol/sdk to interact with BrightData's MCP server
 */
export class BrightDataMCPClient {
  private apiToken: string;

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.BRIGHTDATA_API_KEY || '';
    if (!this.apiToken) {
      throw new Error('BrightData API token is required');
    }
  }

  /**
   * Scrape a webpage and return clean markdown content
   * Uses BrightData's scrape_as_markdown tool via MCP
   */
  async scrapeAsMarkdown(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'lib', 'brightdata-mcp-runner.js');

      const nodeProcess = spawn('node', [scriptPath, this.apiToken, url]);

      let outputData = '';
      let errorData = '';

      nodeProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      nodeProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      nodeProcess.on('close', (code) => {
        if (code !== 0 || errorData) {
          console.error('BrightData MCP error:', errorData);
          reject(new Error(`MCP request failed: ${errorData || 'Unknown error'}`));
        } else {
          try {
            const result = JSON.parse(outputData);
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve(result.content || '');
            }
          } catch (e) {
            console.error('Failed to parse MCP output:', e);
            reject(new Error('Failed to parse MCP response'));
          }
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        nodeProcess.kill();
        reject(new Error('MCP request timeout'));
      }, 60000);
    });
  }

  /**
   * Fallback: Use direct HTTP request to BrightData Web Unlocker API
   * This is used if MCP fails
   */
  async scrapeWithFallback(url: string): Promise<string> {
    try {
      const response = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify({
          url: url,
          format: 'raw'
        })
      });

      if (!response.ok) {
        throw new Error(`BrightData API error: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('BrightData fallback error:', error);
      throw error;
    }
  }
}
