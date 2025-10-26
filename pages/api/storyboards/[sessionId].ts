// API endpoint to get or delete a specific storyboard
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, optionalAuth } from '@/lib/auth-middleware';
import { getStoryboardByUrl, deleteStoryboard } from '@/lib/dynamodb';
import { getSession } from '@/lib/session-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;
  const { url } = req.query;  // Support url parameter as well

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // GET: Retrieve storyboard (optionally authenticated for backward compatibility)
  if (req.method === 'GET') {
    const user = await optionalAuth(req, res);

    try {
      let storyboard = null;

      // Try in-memory session storage first (for active sessions)
      storyboard = getSession(sessionId);

      // If not in memory and url is provided, check DynamoDB
      if (!storyboard && url && typeof url === 'string') {
        storyboard = await getStoryboardByUrl(url);

        // Verify user has access (is in savedBy array)
        if (storyboard && user) {
          const savedBy = storyboard.savedBy || [];
          if (!savedBy.includes(user.userId)) {
            return res.status(403).json({ error: 'Access denied to this storyboard' });
          }
        }
      }

      if (!storyboard) {
        return res.status(404).json({ error: 'Storyboard not found' });
      }

      return res.status(200).json({
        success: true,
        storyboard,
      });
    } catch (error: any) {
      console.error('Error retrieving storyboard:', error);
      return res.status(500).json({ error: 'Failed to retrieve storyboard', details: error.message });
    }
  }

  // DELETE: Remove storyboard (requires authentication)
  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res);
    if (!user) return; // Response already sent by middleware

    try {
      // Get URL from request body or query
      const urlToDelete = (req.body?.url || url) as string;

      if (!urlToDelete) {
        return res.status(400).json({ error: 'url is required to delete storyboard' });
      }

      await deleteStoryboard(urlToDelete, user.userId);

      return res.status(200).json({
        success: true,
        message: 'Storyboard deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting storyboard:', error);
      return res.status(500).json({ error: 'Failed to delete storyboard', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
