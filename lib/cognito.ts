// AWS Cognito authentication utilities
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Cognito configuration from environment variables
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID || '',
};

// Validate required environment variables
if (!poolData.UserPoolId || !poolData.ClientId) {
  console.error('Missing AWS Cognito configuration. Please set NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID and NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID in your .env.local file');
}

const userPool = poolData.UserPoolId && poolData.ClientId 
  ? new CognitoUserPool(poolData)
  : null;

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  username: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export function signUp({ email, password, username }: SignUpParams): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
    ];

    userPool.signUp(username, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      if (!result) {
        reject(new Error('Sign up failed - no result returned'));
        return;
      }
      resolve(result.user);
    });
  });
}

/**
 * Confirm user email with verification code
 */
export function confirmSignUp(username: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Sign in an existing user
 */
export function signIn({ email, password }: SignInParams): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        resolve(session);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Sign out the current user
 */
export function signOut(): void {
  if (!userPool) {
    console.error('AWS Cognito is not configured. Cannot sign out.');
    return;
  }
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
}

/**
 * Get the current authenticated user session
 */
export function getCurrentSession(): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No current user'));
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        reject(err || new Error('No session'));
        return;
      }

      if (!session.isValid()) {
        reject(new Error('Session is invalid'));
        return;
      }

      resolve(session);
    });
  });
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await getCurrentSession();
    const idToken = session.getIdToken();
    const payload = idToken.payload;

    return {
      userId: payload.sub,
      email: payload.email || '',
      username: payload['cognito:username'] || '',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Refresh the current session token
 */
export function refreshSession(): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('No current user'));
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        reject(err || new Error('No session'));
        return;
      }

      const refreshToken = session.getRefreshToken();
      cognitoUser.refreshSession(refreshToken, (refreshErr, newSession) => {
        if (refreshErr) {
          reject(refreshErr);
          return;
        }
        resolve(newSession);
      });
    });
  });
}

/**
 * Get the current user's ID token (for API authentication)
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const session = await getCurrentSession();
    return session.getIdToken().getJwtToken();
  } catch (error) {
    return null;
  }
}

/**
 * Resend verification code
 */
export function resendConfirmationCode(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Initiate forgot password flow
 */
export function forgotPassword(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        resolve();
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Confirm new password with verification code
 */
export function confirmPassword(
  username: string,
  verificationCode: string,
  newPassword: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('AWS Cognito is not configured. Please set the required environment variables.'));
      return;
    }
    
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(verificationCode, newPassword, {
      onSuccess: () => {
        resolve();
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}
