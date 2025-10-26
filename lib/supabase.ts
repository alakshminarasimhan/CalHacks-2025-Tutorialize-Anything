import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

// Client-side Supabase client
export const createSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Database types
export interface UserPreferences {
  user_id: string;
  preferred_style: string;
  created_at: string;
  updated_at: string;
}

export interface SavedTutorial {
  id: string;
  user_id: string;
  session_id: string;
  title: string | null;
  url: string;
  style: string;
  frames: Array<{
    visualScene: string;
    narration: string;
    imageUrl?: string;
    audioUrl?: string;
  }>;
  created_at: string;
}
