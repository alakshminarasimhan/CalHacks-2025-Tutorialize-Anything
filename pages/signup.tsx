import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, confirmSignUp, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<'signup' | 'confirm'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password || !username) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      await signUp({ email, password, username });
      setStep('confirm');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!confirmationCode) {
      setError('Please enter the confirmation code');
      setIsLoading(false);
      return;
    }

    try {
      await confirmSignUp(username, confirmationCode);
      alert('Email confirmed! You can now sign in.');
      router.push('/login');
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Failed to confirm email. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-light text-gray-900 mb-4" style={{ fontFamily: 'serif' }}>
            Tutorial Maker
          </h1>
          <p className="text-gray-600 text-lg">
            {step === 'signup' ? 'Create your account' : 'Confirm your email'}
          </p>
        </div>

        {/* Signup/Confirm Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 'signup' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-medium text-gray-900 mb-2">Sign Up</h2>
                <p className="text-gray-600 text-sm">
                  Create an account to save your storyboards
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="johndoe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least 8 characters long
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => router.push('/login')}
                    className="text-gray-900 font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-medium text-gray-900 mb-2">Confirm Email</h2>
                <p className="text-gray-600 text-sm">
                  We sent a confirmation code to <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleConfirm} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                    placeholder="123456"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Confirming...' : 'Confirm Email'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    onClick={() => setStep('signup')}
                    className="text-gray-900 font-medium hover:underline"
                  >
                    Go back
                  </button>
                </p>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Powered by AWS Cognito
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
