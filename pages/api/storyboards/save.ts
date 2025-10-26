// API endpoint to save a storyboard to DynamoDB
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth-middleware';
import { saveStoryboard } from '@/lib/dynamodb';
import { getSession } from '@/lib/session-storage';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

async function logAwsIdentity() {
  const sts = new STSClient({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  const id = await sts.send(new GetCallerIdentityCommand({}));
  console.log('🪪 AWS IDENTITY -> account:', id.Account, 'arn:', id.Arn);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { sessionId, title } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    await logAwsIdentity();

    // Get the session data from memory
    const sessionData = getSession(sessionId);

    console.log('📦 SESSION DATA LOADED FOR SAVE:', sessionData);
    console.log("📦 sessionData.url being saved =", sessionData?.url);
    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found in memory (expired)' });
    }

    if (!sessionData.url) {
      return res.status(400).json({
        error: 'Session is missing url field. Cannot save.',
      });
    }

    // ✅ Save to DynamoDB using a valid URL
    await saveStoryboard(user.userId, sessionId, sessionData, title);

    res.status(200).json({
      success: true,
      message: 'Storyboard saved successfully',
      sessionId,
    });
  } catch (error: any) {
    console.error('❌ Error saving storyboard:', error);
    res.status(500).json({ error: 'Failed to save storyboard', details: error.message });
  }
}
