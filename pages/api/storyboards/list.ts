// API endpoint to list all storyboards for a user
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth-middleware';
import { listUserStoryboards } from '@/lib/dynamodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) return; // Response already sent by middleware

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const storyboards = await listUserStoryboards(user.userId, limit);

    res.status(200).json({
      success: true,
      storyboards: storyboards.map((sb) => ({
        sessionId: sb.sessionId,
        title: sb.title,
        url: sb.url,
        style: sb.style,
        frameCount: sb.frames.length,
        createdAt: sb.createdAt,
        updatedAt: sb.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error listing storyboards:', error);
    res.status(500).json({ error: 'Failed to list storyboards', details: error.message });
  }
}
