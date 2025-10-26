import type { NextApiRequest, NextApiResponse } from 'next';
import { Anthropic } from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from '@/lib/session-storage';
import { BrightDataMCPClient } from '@/lib/brightdata-mcp-client';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Helper: fetch website content via BrightData MCP
async function fetchWebsiteContent(url: string): Promise<string> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;

  if (!apiKey) {
    console.warn('BrightData API key not configured, using basic fetch');
    // Fallback to basic fetch if no API key
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TutorialBot/1.0)'
        }
      });
      return await response.text();
    } catch (error) {
      throw new Error('Failed to fetch URL and no BrightData API key configured');
    }
  }

  try {
    // Use BrightData MCP for scraping
    const mcpClient = new BrightDataMCPClient(apiKey);
    console.log('Fetching website via BrightData MCP...');
    const markdown = await mcpClient.scrapeAsMarkdown(url);
    console.log('BrightData MCP scraping completed successfully, length:', markdown.length);

    // Convert markdown back to text (already cleaned by MCP)
    return markdown;
  } catch (mcpError) {
    console.error('BrightData MCP failed:', mcpError);

    try {
      // Fallback to direct Web Unlocker API
      console.log('Attempting BrightData Web Unlocker fallback...');
      const mcpClient = new BrightDataMCPClient(apiKey);
      const html = await mcpClient.scrapeWithFallback(url);
      console.log('BrightData fallback completed successfully, length:', html.length);
      return html;
    } catch (fallbackError) {
      console.error('BrightData fallback also failed:', fallbackError);

      // Final fallback to basic fetch
      console.log('Attempting basic fetch as last resort...');
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TutorialBot/1.0)'
          }
        });
        const html = await response.text();
        console.log('Basic fetch completed, length:', html.length);
        return html;
      } catch (fetchError) {
        console.error('All fetch methods failed:', fetchError);
        throw new Error(`Failed to fetch content from URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    }
  }
}

// Helper: Analyze content using Claude directly (more reliable than Python agents)
async function analyzeContentWithClaude(content: string): Promise<any> {
  try {
    const analysisPrompt = `Analyze this content and extract the key concepts, main topics, and logical flow. Return ONLY valid JSON in this exact format:

{
  "key_topics": ["topic1", "topic2", "topic3"],
  "main_concepts": ["concept1", "concept2", "concept3"],
  "content_summary": "A 2-3 sentence summary",
  "complexity_level": "simple" | "moderate" | "complex",
  "recommended_frames": 5-10
}

Content to analyze:
"""
${content.substring(0, 6000)}
"""`;

    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('Content analysis:', analysis);
      return analysis;
    }

    // Fallback if parsing fails
    return {
      key_topics: ["system", "process", "data"],
      main_concepts: ["initialization", "processing", "output"],
      content_summary: "Technical content requiring explanation",
      complexity_level: "moderate",
      recommended_frames: 6
    };
  } catch (error) {
    console.error('Content analysis error:', error);
    return {
      key_topics: ["system", "process", "data"],
      main_concepts: ["initialization", "processing", "output"],
      content_summary: "Technical content requiring explanation",
      complexity_level: "moderate",
      recommended_frames: 6
    };
  }
}

// Helper: fetch GitHub repo content (README.md as a summary)
async function fetchRepoContent(repoUrl: string): Promise<string> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)(?:\/|$)/);
    if (!match) throw new Error('Invalid GitHub repo URL');

    const repoPath = match[1];
    const rawUrl = `https://raw.githubusercontent.com/${repoPath}/main/README.md`;

    const res = await fetch(rawUrl);
    if (res.ok) {
      const text = await res.text();
      return text;
    }

    // Try master branch if main doesn't exist
    const masterUrl = `https://raw.githubusercontent.com/${repoPath}/master/README.md`;
    const masterRes = await fetch(masterUrl);
    if (masterRes.ok) {
      return await masterRes.text();
    }

    return 'This repository contains code. No README available.';
  } catch (err) {
    console.error('Failed to fetch repo content:', err);
    return 'This repository contains code files.';
  }
}

// Helper: Build Claude prompt using actual content and analysis
function buildClaudePromptFromContent(content: string, analysis: any, style: string) {
  let styleHint = '';
  switch(style) {
    case 'explain5':
      styleHint = 'Explain like I am 5 years old, using simple words and concepts.';
      break;
    case 'frat':
      styleHint = 'Explain in a casual college frat guy tone, with humor and slang.';
      break;
    case 'pizza':
      styleHint = 'Use a Pizza Restaurant as an analogy context (e.g., orders, kitchen, delivery).';
      break;
    case 'car':
      styleHint = 'Use a Car Factory analogy for the explanation (e.g., assembly line, parts, workers).';
      break;
    case 'professional':
      styleHint = 'Explain in a formal, adult professional manner suitable for business contexts.';
      break;
    default:
      styleHint = 'Explain in a clear and engaging manner.';
  }

  const systemPrompt = `You are a tutorial creator that transforms execution flow data into engaging stop-motion style storyboard tutorials using visual analogies.

Your goal is to create a MINIMAL stop-motion sequence that teaches step-by-step using analogies and storytelling.

CRITICAL: You must output TWO separate things for each frame:
1. "visualScene" - A pure visual description for image generation (what to draw)
2. "narration" - A storytelling narrative that explains the concept using analogies

Think of this like a documentary: the visuals show the scene, while the narrator tells the story and explains what's happening using analogies.

Use the MINIMUM number of frames needed (typically 5-7 frames) for stop-motion flow.

CRITICAL RULES FOR NARRATION:
1. Write like a storyteller/narrator explaining concepts through analogies
2. Use phrases like "Think of this like...", "Just like when you...", "Similar to..."
3. Connect what's in the scene to the technical concept being taught
4. Make it conversational and engaging: "Now watch as...", "Here's where..."
5. Each narration should be 2-4 sentences maximum

CRITICAL RULES FOR VISUAL SCENES:
1. Pure visual descriptions only (NO explanations, NO analogies in the visual field)
2. Describe cartoon-style scenes that illustrate the concept
3. NEVER mention text, labels, signs, or written words
4. Keep visual continuity between frames (same characters/style)
5. Simple, clean scene descriptions

Example output format:
{
  "step1": {
    "visualScene": "A cartoon house with a front door and windows, warm lighting inside, character standing at the doorway",
    "narration": "Let's start our journey. Think of this application like a house you're about to enter. Just like when you walk into your home, this front door is your entry point - it's where everything begins."
  },
  "step2": {
    "visualScene": "The same character now inside the house, holding a package, walking toward a back door where a delivery truck is visible outside",
    "narration": "Now watch as information needs to move somewhere. Think of this like grabbing your mail and bringing it to the post office. The data, just like your package, needs to be picked up and transported to its destination."
  },
  "step3": {
    "visualScene": "A large warehouse building with organized shelves full of boxes, the character placing a box on a shelf",
    "narration": "Here's where everything gets stored safely. Similar to how a warehouse keeps inventory organized, your data sits here on these shelves until you need it again. Each box has its place, just like each piece of information in the database."
  }
}

Do not include any text before or after the JSON object. Only return valid JSON with this exact structure.`;

  // Determine frame count based on complexity
  const recommendedFrames = analysis.recommended_frames || 6;
  const frameCount = Math.max(5, Math.min(10, recommendedFrames));

  const userPrompt = `Create a ${frameCount}-frame tutorial storyboard explaining this content:

CONTENT SUMMARY: ${analysis.content_summary || 'Technical content'}

KEY TOPICS TO COVER:
${analysis.key_topics ? analysis.key_topics.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n') : 'Main concepts from the content'}

ACTUAL CONTENT:
"""
${content.substring(0, 5000)}
"""

Style requirement: ${styleHint}

IMPORTANT:
- Create EXACTLY ${frameCount} frames (step1 through step${frameCount})
- Each frame must explain a KEY CONCEPT from the actual content above
- Each frame must have "visualScene" and "narration" fields
- Use analogies in the narration to explain the REAL concepts from the content
- Visual scenes should be pure cartoon descriptions with NO text or labels
- Make it conversational and engaging
- The tutorial should actually teach what the content is about, not generic system concepts
- Return ONLY valid JSON with step1, step2, etc.`;

  return { systemPrompt, userPrompt };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle GET requests to retrieve tutorial data by sessionId
  if (req.method === 'GET') {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid sessionId' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json(session);
  }

  // Handle POST requests to create a new tutorial
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url, style, voiceId } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    let contentText = '';

    // Fetch content based on URL type
    if (url.includes('github.com')) {
      contentText = await fetchRepoContent(url);
    } else {
      // Fetch via BrightData MCP (returns markdown or HTML)
      const scrapedContent = await fetchWebsiteContent(url);

      console.log('Scraped content length:', scrapedContent.length);
      console.log('Scraped content preview:', scrapedContent.substring(0, 300));

      // Check if content is already markdown (from MCP) or HTML (from fallback)
      if (scrapedContent.includes('<html') || scrapedContent.includes('<!DOCTYPE') || scrapedContent.includes('<body')) {
        // HTML from fallback - clean it using cheerio
        const cheerio = await import('cheerio');
        const $ = cheerio.load(scrapedContent);

        // Remove unwanted elements
        $('script, style, nav, footer, header, iframe, noscript').remove();

        // Try to extract main content area first
        let extractedText = '';

        // Try common content containers
        const contentSelectors = [
          'article',
          'main',
          '[role="main"]',
          '.content',
          '.main-content',
          '#content',
          '#main-content',
          '.article-body',
          '.post-content'
        ];

        for (const selector of contentSelectors) {
          const content = $(selector).text();
          if (content.length > extractedText.length) {
            extractedText = content;
          }
        }

        // If no content container found, get body text
        if (extractedText.length < 100) {
          extractedText = $('body').text();
        }

        // Clean up whitespace
        contentText = extractedText.replace(/\s+/g, ' ').trim();
      } else {
        // Already clean markdown from MCP - use directly
        contentText = scrapedContent;
      }

      if (contentText.length > 10000) {
        contentText = contentText.substring(0, 10000);
      }
    }

    console.log('Extracted content length:', contentText.length);
    console.log('Content preview:', contentText.substring(0, 200));

    if (!contentText || contentText.length < 50) {
      throw new Error(`Could not extract sufficient content from the URL. Got ${contentText.length} characters.`);
    }

    // Truncate for agent processing
    if (contentText.length > 8000) {
      contentText = contentText.substring(0, 8000);
    }

    // Analyze content using Claude
    console.log('Analyzing content with Claude...');
    const contentAnalysis = await analyzeContentWithClaude(contentText);
    console.log('Content analysis completed:', contentAnalysis);

    // Build the prompt for Claude using content analysis
    const { systemPrompt, userPrompt } = buildClaudePromptFromContent(contentText, contentAnalysis, style);

    // Call Claude API to get the storyboard JSON
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Extract the response content
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let assistantReply = content.text;

    // Parse the JSON from Claude's reply
    let storyboard: Record<string, { visualScene: string; narration: string }>;
    try {
      storyboard = JSON.parse(assistantReply);
    } catch (e) {
      // If Claude output is not pure JSON, try to extract JSON substring
      const jsonMatch = assistantReply.match(/\{[\s\S]+\}/);
      if (jsonMatch) {
        storyboard = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse Claude response:', assistantReply);
        throw new Error('Claude output was not valid JSON');
      }
    }

    // Validate that we have at least one step
    if (Object.keys(storyboard).length === 0) {
      throw new Error('Claude did not generate any storyboard steps');
    }

    // Generate a session ID and store the data
    const sessionId = uuidv4();
    createSession(sessionId, {
      steps: storyboard,
      frames: [],
      url,
      style: style || 'explain5',
      voiceId: voiceId,  // Store voice preference for later audio generation
    });

    return res.status(200).json({ sessionId, steps: storyboard });
  } catch (error) {
    console.error('Error in tutorial generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate tutorial';
    return res.status(500).json({ error: errorMessage });
  }
}
