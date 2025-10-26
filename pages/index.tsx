import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut, isAuthenticated } = useAuth();
  const [targetURL, setTargetURL] = useState('');
  const [narrativeStyle, setNarrativeStyle] = useState('explain5');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStage, setLoadingStage] = useState('');
  const [progress, setProgress] = useState(0);

  // Check authentication on mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogout = () => {
    signOut();
    router.push('/login');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 animate-pulse"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not logged in
  if (!user) {
    return null;
  }

  const styleOptions = [
    { value: 'explain5', label: "Explain Like I'm 5" },
    { value: 'frat', label: 'College Frat Guy' },
    { value: 'pizza', label: 'Pizza Restaurant Analogy' },
    { value: 'car', label: 'Car Factory Analogy' },
    { value: 'professional', label: 'Adult Professional' }
  ];

  // Celebrity voice options for Fish.Audio TTS
  // These are real model IDs from Fish.Audio
  const voiceOptions = [
    { value: '07424106e0ff4c58919e77d6f421c48b', label: 'Default Male' },
    { value: '2a9605eeafe84974b5b20628d42c0060', label: 'Default Female' },
    { value: 'ac04af95ebe747ceae442e5796e02729', label: 'Minnie Mouse' },
    { value: 'f98232d43a2a41d8818ef9c0ee80b027', label: 'Kim Kardashian' },
    { value: '874aa2258ca947fc9cd0a7902ae569ca', label: 'Jake Paul' },
    { value: '3446a5f02a1c4d6fa6e85cf467302f4f', label: 'Darth Vader' },
    { value: '54e3a85ac9594ffa83264b8a494b901b', label: 'SpongeBob SquarePants' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!targetURL) {
      setError('Please enter a repository or website URL');
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      // 1. Analyzing content
      setLoadingStage('Analyzing content...');
      setProgress(10);
      const res = await fetch('/api/tutorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetURL,
          style: narrativeStyle,
          voiceId: selectedVoice || undefined  // Include voice preference
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const sessionId = data.sessionId;
      setProgress(30);

      // 2. Generating images
      setLoadingStage('Creating visual frames...');
      await fetch('/api/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      setProgress(70);

      // 3. Generating audio
      setLoadingStage('Generating narration...');
      await fetch('/api/audio-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      setProgress(95);

      // 4. Navigate to viewer
      setLoadingStage('Finalizing tutorial...');
      setProgress(100);
      setTimeout(() => router.push(`/tutorial/${sessionId}`), 500);
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate tutorial. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          {/* Pulsating loader */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-900 animate-pulse"></div>
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-gray-900 animate-ping opacity-20"></div>
            </div>
          </div>
          
          {/* Loading text */}
          <h2 className="text-3xl font-light text-gray-900 mb-4">{loadingStage}</h2>
          
          {/* Progress bar */}
          <div className="w-80 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto">
            <div 
              className="h-full bg-gray-900 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <p className="text-gray-500 mt-4 text-sm">{progress}% complete</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-2xl px-6">
        {/* User Info & Logout */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/saved')}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Saved Storyboards
          </button>
          <span className="text-sm text-gray-600">
            {user.email || 'Logged in'}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Logout
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-light text-gray-900 mb-4" style={{ fontFamily: 'serif' }}>
            Tutorial Maker
          </h1>
          <p className="text-gray-600 text-lg">
            Transform any website into an interactive visual tutorial
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
            <input
              type="url"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              placeholder="https://example.com"
              value={targetURL}
              onChange={(e) => setTargetURL(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation Style</label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              value={narrativeStyle}
              onChange={(e) => setNarrativeStyle(e.target.value)}
            >
              {styleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Narrator Voice
              <span className="text-gray-500 text-xs ml-2">(Powered by Fish.Audio)</span>
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
            >
              {voiceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Choose a celebrity-style voice for your tutorial narration
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition font-medium text-lg"
          >
            Start for free
          </button>
        </form>
      </div>
    </div>
  );
}
