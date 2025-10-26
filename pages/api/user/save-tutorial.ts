import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getSession } from '@/lib/session-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const supabase = createServerSupabaseClient();

  // Get user from session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    const { sessionId, title } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Get tutorial data from in-memory session storage
    const sessionData = getSession(sessionId);

    if (!sessionData) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('saved_tutorials')
      .insert({
        user_id: userId,
        session_id: sessionId,
        title: title || `Tutorial from ${sessionData.url}`,
        url: sessionData.url,
        style: sessionData.style,
        frames: sessionData.frames,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      tutorial: data,
      message: 'Tutorial saved successfully!'
    });
  } catch (error) {
    console.error('Error saving tutorial:', error);
    return res.status(500).json({ error: 'Failed to save tutorial' });
  }
}
