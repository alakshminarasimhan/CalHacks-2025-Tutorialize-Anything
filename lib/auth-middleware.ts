// API route authentication middleware for AWS Cognito
import { NextApiRequest, NextApiResponse } from 'next';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID || '',
  tokenUse: 'id',
  clientId: process.env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID || '',
});

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

/**
 * Verify and decode Cognito JWT token
 */
export async function verifyToken(token: string) {
  try {
    const payload = await verifier.verify(token);
    return {
      userId: payload.sub,
      email: payload.email as string,
      username: payload['cognito:username'] as string,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to require authentication on API routes
 * Usage:
 *   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 *     const user = await requireAuth(req, res);
 *     if (!user) return; // Response already sent
 *
 *     // User is authenticated, proceed with logic
 *   }
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<{ userId: string; email: string; username: string } | null> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'No authentication token provided' });
    return null;
  }

  const user = await verifyToken(token);

  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // Attach user to request for downstream use
  req.user = user;
  return user;
}

/**
 * Middleware to optionally authenticate (doesn't block if no token)
 * Returns user if authenticated, null otherwise
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<{ userId: string; email: string; username: string } | null> {
  const token = extractToken(req);

  if (!token) {
    return null;
  }

  const user = await verifyToken(token);
  if (user) {
    req.user = user;
  }

  return user;
}
