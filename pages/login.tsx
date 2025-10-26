import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useEcho } from '@merit-systems/echo-react-sdk';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, signIn } = useEcho();

  useEffect(() => {
    // If already logged in, redirect to homepage
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogin = async () => {
    console.log('Login button clicked');
    try {
      await signIn();
      console.log('Sign in initiated');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (isLoading) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-light text-gray-900 mb-4" style={{ fontFamily: 'serif' }}>
            Tutorial Maker
          </h1>
          <p className="text-gray-600 text-lg">
            Sign in to start creating tutorials
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Welcome</h2>
            <p className="text-gray-600 text-sm">
              Sign in with Echo to access your universal AI balance
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in with Echo'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Powered by Merit Systems Echo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
