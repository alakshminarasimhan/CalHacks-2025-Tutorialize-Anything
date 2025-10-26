import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSession, updateFrame } from '@/lib/session-storage';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET || '';
const region = process.env.AWS_REGION || 'us-east-2';
const FISH_API_URL = 'https://api.fish.audio/v1/tts';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, voiceId: requestVoiceId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(400).json({ error: 'Session not found' });
  }

  // Use voice from request, fallback to session voice, or use null for default
  const voiceId = requestVoiceId || session.voiceId || null;
  console.log('Using voice ID for audio generation:', voiceId);

  try {
    const storyboard = session.steps;
    const frameKeys = Object.keys(storyboard).sort();
    const audioUrls: string[] = [];

    // Ensure frames exist with visual and narration content (in case this runs before image-gen)
    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const stepData = storyboard[key];
      const existingFrame = session.frames[i];
      if (!existingFrame) {
        updateFrame(sessionId, i, {
          visualScene: stepData.visualScene,
          narration: stepData.narration
        });
      }
    }

    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const stepData = storyboard[key];
      const narration = stepData.narration;

      console.log(`Generating audio for ${key}`);

      try {
        // Prepare TTS request payload - using the narration field for storytelling audio
        const ttsPayload: any = {
          text: narration,
          format: 'mp3',
          sample_rate: 44100
        };

        // Add reference_id for voice selection (all voices have IDs now)
        if (voiceId && voiceId.trim() !== '') {
          ttsPayload.reference_id = voiceId;
          console.log(`  Using voice ID: ${voiceId.substring(0, 8)}...`);
        } else {
          console.log(`  No voice ID specified, using Fish.Audio default`);
        }

        const ttsRes = await fetch(FISH_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.FISHAUDIO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(ttsPayload)
        });

        if (!ttsRes.ok) {
          const errorText = await ttsRes.text();
          console.error(`Fish TTS API error for ${key}:`, errorText);
          console.warn(`Skipping audio generation for ${key}, frame will display without audio`);
          continue; // Skip to next frame instead of throwing
        }

        const audioData = await ttsRes.arrayBuffer();

        // Upload audio to S3
        const fileKey = `${sessionId}/frame${i + 1}.mp3`;

        console.log(`Uploading audio to S3: ${bucketName}/${fileKey}`);
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: Buffer.from(audioData),
          ContentType: 'audio/mpeg'
          // Note: ACL removed - bucket policy handles public access
        }));

        // Correct S3 URL format with region
        const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
        audioUrls.push(publicUrl);

        // Update session frames with audio URL
        updateFrame(sessionId, i, {
          audioUrl: publicUrl,
        });

        console.log(`✅ Successfully generated and uploaded audio ${i + 1}/${frameKeys.length}: ${publicUrl}`);
      } catch (audioErr) {
        console.error(`❌ Failed to generate/upload audio for ${key}:`, audioErr);
        console.error('Audio Error Details:', {
          bucket: bucketName,
          key: `${sessionId}/frame${i + 1}.mp3`,
          region: region,
          voiceId: voiceId
        });
        // Continue to next frame even if this one fails
      }
    }

    return res.status(200).json({ audios: audioUrls, message: `Generated ${audioUrls.length}/${frameKeys.length} audio files` });
  } catch (error) {
    console.error('Error in audio generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Audio generation failed';
    return res.status(500).json({ error: errorMessage });
  }
}
