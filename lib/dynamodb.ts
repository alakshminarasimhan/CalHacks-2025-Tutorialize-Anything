// DynamoDB storage layer for storyboards
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SessionData, FrameData, StepData } from './session-storage';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2', // ✅ Updated default
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// ✅ Updated default to match your actual table
const STORYBOARDS_TABLE = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE || 'Calhacks-Skywalkr';
const USERS_TABLE = process.env.AWS_DYNAMODB_USERS_TABLE || 'tutorialize-users';

// Debug logging
console.log('DynamoDB Configuration:', {
  region: process.env.AWS_REGION,
  storyboardsTable: STORYBOARDS_TABLE,
  usersTable: USERS_TABLE,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
});


export interface SavedStoryboard extends SessionData {
  url: string;  // Primary key - the site URL to prevent redundancy
  sessionId: string;
  userId: string;  // User who created/saved this tutorial
  title?: string;
  updatedAt: number;
  savedBy: string[];  // Array of userIds who have saved this tutorial
}

export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Create or update user profile
 */
export async function saveUserProfile(profile: Omit<UserProfile, 'updatedAt'>): Promise<void> {
  const command = new PutCommand({
    TableName: USERS_TABLE,
    Item: {
      ...profile,
      updatedAt: Date.now(),
    },
  });

  await docClient.send(command);
}

/**
 * Get user profile by userId
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const command = new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  });

  const response = await docClient.send(command);
  return (response.Item as UserProfile) || null;
}

/**
 * Save a storyboard to DynamoDB using URL as primary key to prevent redundancy
 * Only saves text data (narration) - no image or audio URLs
 */
export async function saveStoryboard(
  userId: string,
  sessionId: string,
  sessionData: SessionData,
  title?: string
): Promise<void> {
  const url = sessionData.url;

  // Check if this URL already exists
  const existing = await getStoryboardByUrl(url);

  if (existing) {
    // URL already exists - just add userId to savedBy array if not already present
    const savedBy = existing.savedBy || [];
    if (!savedBy.includes(userId)) {
      savedBy.push(userId);

      const command = new UpdateCommand({
        TableName: STORYBOARDS_TABLE,
        Key: { url },
        UpdateExpression: 'SET savedBy = :savedBy, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':savedBy': savedBy,
          ':updatedAt': Date.now(),
        },
      });

      await docClient.send(command);
    }
    // If user already saved it, do nothing (idempotent)
    return;
  }

  // Strip out image and audio URLs from frames - only keep text data
  const textOnlyFrames = sessionData.frames.map(frame => ({
    visualScene: frame.visualScene,
    narration: frame.narration,
    // Explicitly exclude imageUrl and audioUrl
  }));

  // New URL - create new storyboard with URL as primary key
  const command = new PutCommand({
    TableName: STORYBOARDS_TABLE,
    Item: {
      url,  // Primary key (the link)
      userId,  // Creator
      sessionId,
      steps: sessionData.steps,
      frames: textOnlyFrames,  // Only text data, no image/audio URLs
      style: sessionData.style,
      voiceId: sessionData.voiceId,
      createdAt: sessionData.createdAt,
      title: title || `Tutorial - ${new URL(url).hostname}`,
      savedBy: [userId],  // Initialize with current user
      updatedAt: Date.now(),
    },
  });

  await docClient.send(command);
}

/**
 * Get a storyboard by URL (primary key)
 */
export async function getStoryboardByUrl(url: string): Promise<SavedStoryboard | null> {
  const command = new GetCommand({
    TableName: STORYBOARDS_TABLE,
    Key: { url },
  });

  const response = await docClient.send(command);
  return (response.Item as SavedStoryboard) || null;
}

/**
 * Get a specific storyboard by userId and sessionId (legacy - kept for backward compatibility)
 * @deprecated Use getStoryboardByUrl instead
 */
export async function getStoryboard(
  userId: string,
  sessionId: string
): Promise<SavedStoryboard | null> {
  // This requires a scan which is expensive
  // For now, we'll throw an error - use getStoryboardByUrl instead
  throw new Error('getStoryboard (userId+sessionId) is deprecated. Use getStoryboardByUrl instead.');
}

/**
 * Get a storyboard by sessionId only (for backward compatibility with in-memory sessions)
 */
export async function getStoryboardBySessionId(sessionId: string): Promise<SavedStoryboard | null> {
  // Use GSI if you created one, otherwise this requires a scan (expensive)
  // For now, we'll require userId for efficient queries
  throw new Error('getStoryboardBySessionId requires a Global Secondary Index on sessionId');
}

/**
 * List all storyboards saved by a user
 * Since URL is now the primary key, we need to use a GSI on savedBy or scan
 * For now, we'll scan and filter (replace with GSI in production for better performance)
 */
export async function listUserStoryboards(
  userId: string,
  limit: number = 50
): Promise<SavedStoryboard[]> {
  // Using Scan with FilterExpression (not ideal for large datasets, but works for now)
  // In production, create a GSI with savedBy as partition key
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');

  const command = new ScanCommand({
    TableName: STORYBOARDS_TABLE,
    FilterExpression: 'contains(savedBy, :userId)',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    Limit: limit,
  });

  const response = await docClient.send(command);

  // Sort by updatedAt descending (newest first)
  const items = (response.Items as SavedStoryboard[]) || [];
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Update a specific frame in a storyboard
 */
export async function updateStoryboardFrame(
  url: string,
  frameIndex: number,
  frameData: Partial<FrameData>
): Promise<void> {
  // Get the current storyboard
  const storyboard = await getStoryboardByUrl(url);
  if (!storyboard) {
    throw new Error('Storyboard not found');
  }

  // Update the frame
  if (!storyboard.frames[frameIndex]) {
    storyboard.frames[frameIndex] = { visualScene: '', narration: '' };
  }
  storyboard.frames[frameIndex] = { ...storyboard.frames[frameIndex], ...frameData };

  // Save the updated storyboard
  const command = new UpdateCommand({
    TableName: STORYBOARDS_TABLE,
    Key: { url },
    UpdateExpression: 'SET frames = :frames, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':frames': storyboard.frames,
      ':updatedAt': Date.now(),
    },
  });

  await docClient.send(command);
}

/**
 * Delete a storyboard (removes user from savedBy, only deletes if no users left)
 */
export async function deleteStoryboard(url: string, userId: string): Promise<void> {
  const storyboard = await getStoryboardByUrl(url);
  if (!storyboard) {
    throw new Error('Storyboard not found');
  }

  // Remove userId from savedBy array
  const savedBy = (storyboard.savedBy || []).filter(id => id !== userId);

  if (savedBy.length === 0) {
    // No more users have saved this - delete the entire storyboard
    const command = new DeleteCommand({
      TableName: STORYBOARDS_TABLE,
      Key: { url },
    });
    await docClient.send(command);
  } else {
    // Still have other users - just update savedBy
    const command = new UpdateCommand({
      TableName: STORYBOARDS_TABLE,
      Key: { url },
      UpdateExpression: 'SET savedBy = :savedBy, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':savedBy': savedBy,
        ':updatedAt': Date.now(),
      },
    });
    await docClient.send(command);
  }
}

/**
 * Update storyboard title
 */
export async function updateStoryboardTitle(
  url: string,
  title: string
): Promise<void> {
  const command = new UpdateCommand({
    TableName: STORYBOARDS_TABLE,
    Key: { url },
    UpdateExpression: 'SET title = :title, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':title': title,
      ':updatedAt': Date.now(),
    },
  });

  await docClient.send(command);
}

/**
 * Hybrid storage: Try DynamoDB first, fall back to in-memory session storage
 */
export async function getStoryboardHybrid(
  sessionId: string,
  userId?: string
): Promise<SessionData | SavedStoryboard | null> {
  // If userId is provided, try DynamoDB first
  if (userId) {
    try {
      const storyboard = await getStoryboard(userId, sessionId);
      if (storyboard) {
        return storyboard;
      }
    } catch (error) {
      console.error('DynamoDB lookup failed, falling back to in-memory:', error);
    }
  }

  // Fall back to in-memory session storage
  const { getSession } = await import('./session-storage');
  return getSession(sessionId) || null;
}
