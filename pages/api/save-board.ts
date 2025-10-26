// pages/api/save-board.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { saveStoryboard } from '@/lib/dynamodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, sessionId, sessionData, title } = req.body;

    if (!userId || !sessionId || !sessionData || !sessionData.url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await saveStoryboard(userId, sessionId, sessionData, title);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error saving storyboard:', error);
    return res.status(500).json({ error: error.message });
  }
}