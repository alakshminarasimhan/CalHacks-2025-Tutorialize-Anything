// API endpoint to save a storyboard to DynamoDB
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth-middleware';
import { saveStoryboard } from '@/lib/dynamodb';
import { getSession } from '@/lib/session-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) return; // Response already sent by middleware

  const { sessionId, title } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    // Get the session data from in-memory storage
    const sessionData = getSession(sessionId);

    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save to DynamoDB
    await saveStoryboard(user.userId, sessionId, sessionData, title);

    res.status(200).json({
      success: true,
      message: 'Storyboard saved successfully',
      sessionId,
    });
  } catch (error: any) {
    console.error('Error saving storyboard:', error);
    res.status(500).json({ error: 'Failed to save storyboard', details: error.message });
  }
}
