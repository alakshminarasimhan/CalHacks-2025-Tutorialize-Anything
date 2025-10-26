// Authentication context provider using AWS Cognito
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CognitoUserSession } from 'amazon-cognito-identity-js';
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  signOut as cognitoSignOut,
  getCurrentUser,
  getCurrentSession,
  confirmSignUp as cognitoConfirmSignUp,
  getIdToken,
  AuthUser,
  SignInParams,
  SignUpParams,
} from './cognito';
import { saveUserProfile } from './dynamodb';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => void;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(params: SignInParams) {
    setIsLoading(true);
    try {
      const session = await cognitoSignIn(params);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Save/update user profile in DynamoDB
      if (currentUser) {
        await saveUserProfile({
          userId: currentUser.userId,
          email: currentUser.email,
          username: currentUser.username,
          createdAt: Date.now(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(params: SignUpParams) {
    setIsLoading(true);
    try {
      await cognitoSignUp(params);
      // Note: User will need to confirm email before signing in
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmSignUp(username: string, code: string) {
    setIsLoading(true);
    try {
      await cognitoConfirmSignUp(username, code);
    } finally {
      setIsLoading(false);
    }
  }

  function signOut() {
    cognitoSignOut();
    setUser(null);
  }

  async function getToken() {
    return await getIdToken();
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
