import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { SavedTutorial } from '@/lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [tutorials, setTutorials] = useState<SavedTutorial[]>([]);
  const [preferences, setPreferences] = useState({ preferred_style: 'explain5' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch saved tutorials
        const tutorialsRes = await fetch('/api/user/tutorials');
        const tutorialsData = await tutorialsRes.json();
        setTutorials(tutorialsData.tutorials || []);

        // Fetch preferences
        const prefsRes = await fetch('/api/user/preferences');
        const prefsData = await prefsRes.json();
        setPreferences(prefsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteTutorial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tutorial?')) return;

    try {
      const res = await fetch('/api/user/tutorials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setTutorials(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting tutorial:', error);
      alert('Failed to delete tutorial');
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        alert('Preferences saved!');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 animate-pulse"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900" style={{ fontFamily: 'serif' }}>
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Create New Tutorial
            </button>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Preferences Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Preferences</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Explanation Style
              </label>
              <select
                value={preferences.preferred_style}
                onChange={(e) => setPreferences({ preferred_style: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="explain5">Explain Like I'm 5</option>
                <option value="frat">College Frat Guy</option>
                <option value="pizza">Pizza Restaurant Analogy</option>
                <option value="car">Car Factory Analogy</option>
                <option value="professional">Adult Professional</option>
              </select>
            </div>
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Saved Tutorials Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">
            Saved Tutorials ({tutorials.length})
          </h2>

          {tutorials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No saved tutorials yet</p>
              <button
                onClick={() => router.push('/')}
                className="text-gray-900 hover:underline"
              >
                Create your first tutorial
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tutorials.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {tutorial.title || 'Untitled Tutorial'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{tutorial.url}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Style: {tutorial.style}</span>
                        <span>Frames: {tutorial.frames?.length || 0}</span>
                        <span>
                          Created: {new Date(tutorial.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/tutorial/${tutorial.session_id}`)}
                        className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteTutorial(tutorial.id)}
                        className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
