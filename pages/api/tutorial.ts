import type { NextApiRequest, NextApiResponse } from 'next';
import { Anthropic } from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import { createSession, getSession, SessionData } from '@/lib/session-storage';

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Helper: fetch website content via BrightData Web Unlocker API
async function fetchWebsiteContent(url: string): Promise<string> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;

  if (!apiKey) {
    throw new Error('BrightData API key not configured');
  }

  const response = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url: url,
      format: 'raw'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BrightData request failed with status ${response.status}: ${errorText}`);
  }

  const html = await response.text();
  console.log(`BrightData Web Unlocker completed successfully`);
  return html;
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

// Helper: Build Claude prompt with analogy instructions
function buildClaudePrompt(contentTranscript: string, style: string) {
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

  const systemPrompt = `You are a tutorial creator that transforms technical content into engaging stop-motion style storyboard tutorials using visual analogies.

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

  const userPrompt = `Content to explain:\n"""${contentTranscript.substring(0, 8000)}"""\n\nStyle requirement: ${styleHint}\n\nCreate a conversational tutorial that teaches this content step-by-step. Use 5-8 frames that flow together as a story. Make it engaging and easy to understand. Each frame should teach something new while building on what came before.`;

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

  const { url, style } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    let contentText = '';

    // Fetch content based on URL type
    if (url.includes('github.com')) {
      contentText = await fetchRepoContent(url);
    } else {
      const html = await fetchWebsiteContent(url);

      // Parse HTML to text using cheerio
      const $ = cheerio.load(html);
      // Remove script and style elements
      $('script, style, nav, footer').remove();
      // Get text content
      contentText = $('body').text().replace(/\s+/g, ' ').trim();
      contentText = contentText.slice(0, 10000);
    }

    if (!contentText || contentText.length < 50) {
      throw new Error('Could not extract sufficient content from the URL');
    }

    // Build the prompt for Claude
    const { systemPrompt, userPrompt } = buildClaudePrompt(contentText, style);

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
    });

    return res.status(200).json({ sessionId, steps: storyboard });
  } catch (error) {
    console.error('Error in tutorial generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate tutorial';
    return res.status(500).json({ error: errorMessage });
  }
}
