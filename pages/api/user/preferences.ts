import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  // Get user from session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      // If no preferences exist, return defaults
      if (!data) {
        return res.status(200).json({
          user_id: userId,
          preferred_style: 'explain5',
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { preferred_style } = req.body;

      if (!preferred_style) {
        return res.status(400).json({ error: 'preferred_style is required' });
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferred_style,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error updating preferences:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
