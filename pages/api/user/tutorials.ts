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
        .from('saved_tutorials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ tutorials: data || [] });
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      return res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Tutorial id is required' });
      }

      const { error } = await supabase
        .from('saved_tutorials')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure user can only delete their own tutorials

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Tutorial deleted' });
    } catch (error) {
      console.error('Error deleting tutorial:', error);
      return res.status(500).json({ error: 'Failed to delete tutorial' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
