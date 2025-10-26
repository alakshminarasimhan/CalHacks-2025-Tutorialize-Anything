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
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table names
const STORYBOARDS_TABLE = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE || 'tutorialize-storyboards';
const USERS_TABLE = process.env.AWS_DYNAMODB_USERS_TABLE || 'tutorialize-users';

export interface SavedStoryboard extends SessionData {
  sessionId: string;
  userId: string;
  title?: string;
  updatedAt: number;
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
 * Save a storyboard to DynamoDB
 */
export async function saveStoryboard(
  userId: string,
  sessionId: string,
  sessionData: SessionData,
  title?: string
): Promise<void> {
  const command = new PutCommand({
    TableName: STORYBOARDS_TABLE,
    Item: {
      userId,
      sessionId,
      ...sessionData,
      title: title || `Tutorial - ${new URL(sessionData.url).hostname}`,
      updatedAt: Date.now(),
    },
  });

  await docClient.send(command);
}

/**
 * Get a specific storyboard by userId and sessionId
 */
export async function getStoryboard(
  userId: string,
  sessionId: string
): Promise<SavedStoryboard | null> {
  const command = new GetCommand({
    TableName: STORYBOARDS_TABLE,
    Key: {
      userId,
      sessionId,
    },
  });

  const response = await docClient.send(command);
  return (response.Item as SavedStoryboard) || null;
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
 * List all storyboards for a user
 */
export async function listUserStoryboards(
  userId: string,
  limit: number = 50
): Promise<SavedStoryboard[]> {
  const command = new QueryCommand({
    TableName: STORYBOARDS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Sort by sessionId descending (newest first)
    Limit: limit,
  });

  const response = await docClient.send(command);
  return (response.Items as SavedStoryboard[]) || [];
}

/**
 * Update a specific frame in a storyboard
 */
export async function updateStoryboardFrame(
  userId: string,
  sessionId: string,
  frameIndex: number,
  frameData: Partial<FrameData>
): Promise<void> {
  // Get the current storyboard
  const storyboard = await getStoryboard(userId, sessionId);
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
    Key: {
      userId,
      sessionId,
    },
    UpdateExpression: 'SET frames = :frames, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':frames': storyboard.frames,
      ':updatedAt': Date.now(),
    },
  });

  await docClient.send(command);
}

/**
 * Delete a storyboard
 */
export async function deleteStoryboard(userId: string, sessionId: string): Promise<void> {
  const command = new DeleteCommand({
    TableName: STORYBOARDS_TABLE,
    Key: {
      userId,
      sessionId,
    },
  });

  await docClient.send(command);
}

/**
 * Update storyboard title
 */
export async function updateStoryboardTitle(
  userId: string,
  sessionId: string,
  title: string
): Promise<void> {
  const command = new UpdateCommand({
    TableName: STORYBOARDS_TABLE,
    Key: {
      userId,
      sessionId,
    },
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
