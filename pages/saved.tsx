import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';

interface SavedStoryboard {
  sessionId: string;
  title: string;
  url: string;
  style: string;
  frameCount: number;
  createdAt: number;
  updatedAt: number;
}

export default function SavedStoryboardsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, getToken, isAuthenticated } = useAuth();
  const [storyboards, setStoryboards] = useState<SavedStoryboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStoryboards();
    }
  }, [isAuthenticated]);

  const loadStoryboards = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = await getToken();
      const response = await fetch('/api/storyboards/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load storyboards');
      }

      const data = await response.json();
      setStoryboards(data.storyboards || []);
    } catch (err: any) {
      console.error('Error loading storyboards:', err);
      setError(err.message || 'Failed to load storyboards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this storyboard?')) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/storyboards/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete storyboard');
      }

      // Reload storyboards
      loadStoryboards();
    } catch (err: any) {
      console.error('Error deleting storyboard:', err);
      alert('Failed to delete storyboard: ' + err.message);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || !isAuthenticated) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-light text-gray-900 mb-2" style={{ fontFamily: 'serif' }}>
              Saved Storyboards
            </h1>
            <p className="text-gray-600">
              View and manage your saved tutorial storyboards
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Create New
          </button>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <p className="text-sm text-gray-600">
            Logged in as <strong>{user?.email}</strong>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 animate-pulse"></div>
            <p className="text-gray-500">Loading storyboards...</p>
          </div>
        )}

        {/* Storyboards List */}
        {!isLoading && storyboards.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-600 text-lg mb-4">No saved storyboards yet</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
            >
              Create Your First Storyboard
            </button>
          </div>
        )}

        {!isLoading && storyboards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storyboards.map((storyboard) => (
              <div
                key={storyboard.sessionId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                    {storyboard.title}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{storyboard.url}</p>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Style:</span>
                    <span className="font-medium capitalize">{storyboard.style}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Frames:</span>
                    <span className="font-medium">{storyboard.frameCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span className="font-medium">{formatDate(storyboard.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/tutorial/${storyboard.sessionId}`)}
                    className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(storyboard.sessionId)}
                    className="bg-red-50 text-red-600 py-2 px-4 rounded-lg hover:bg-red-100 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
