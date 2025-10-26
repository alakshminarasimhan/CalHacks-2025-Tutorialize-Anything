import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSession, updateFrame } from '@/lib/session-storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET || '';
const region = process.env.AWS_REGION || 'us-east-2';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize Gemini for prompt enhancement
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(400).json({ error: 'Session not found' });
  }

  try {
    const storyboard = session.steps;
    const frameKeys = Object.keys(storyboard).sort();
    const imageUrls: string[] = [];

    // Initialize frames with visual and narration content first, so they exist even if image generation fails
    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const stepData = storyboard[key];
      updateFrame(sessionId, i, {
        visualScene: stepData.visualScene,
        narration: stepData.narration,
      });
    }

    for (let i = 0; i < frameKeys.length; i++) {
      const key = frameKeys[i];
      const stepData = storyboard[key];

      // Use the visualScene field directly (no extraction needed since it's already separated)
      const visualDescription = stepData.visualScene;

      // Build sequential context for visual continuity
      const previousContext = i > 0 ? `Continuing the story, ` : '';
      const sequenceInfo = `Frame ${i + 1} of ${frameKeys.length}. `;

      // Create a prompt with minimalist flat cartoon style
      const stylePrefix = `Minimalist flat cartoon diagram in soft pastel colors, simple rounded shapes. Abstract human figures as circle heads with rectangle bodies. Neutral UI panel background, soft strokes, minimal shadows. Clean and consistent style, like a product storyboard or stop-motion teaching frame.`;
      const prompt = `${sequenceInfo}${previousContext}${stylePrefix} NO text NO words NO letters NO labels anywhere. Scene: ${visualDescription}`;

      console.log(`Generating image for ${key}: "${prompt}"`);

      let imageData: Buffer | null = null;

      // Try up to 2 retries for image generation (optimized for speed)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Step 1: Use Gemini to enhance the visual prompt for better image generation
          let enhancedPrompt = prompt;
          if (GEMINI_API_KEY && attempt === 0) {
            try {
              console.log(`Using Gemini to enhance prompt for ${key}...`);
              const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

              const enhancementRequest = `Given this image generation prompt, make it more detailed and vivid while keeping the same style and removing any text/labels. Keep it under 100 words and focus on visual details only:\n\n${prompt}`;

              const result = await model.generateContent(enhancementRequest);
              const response = await result.response;
              enhancedPrompt = response.text().trim();

              console.log(`Gemini enhanced prompt for ${key}: "${enhancedPrompt}"`);
            } catch (geminiErr) {
              console.warn(`Gemini enhancement failed for ${key}, using original prompt:`, geminiErr);
              enhancedPrompt = prompt;
            }
          }

          // Step 2: Generate image using Pollinations.ai with enhanced prompt
          console.log(`Calling Pollinations.ai for ${key}...`);

          // Pollinations.ai supports multiple models including Flux
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=512&height=512&model=flux&nologo=true&nofeed=true`;

          console.log(`Pollinations URL: ${pollinationsUrl}`);

          const imageResponse = await fetch(pollinationsUrl);

          if (!imageResponse.ok) {
            throw new Error(`Pollinations.ai API error: ${imageResponse.status}`);
          }

          const imageBlob = await imageResponse.arrayBuffer();
          imageData = Buffer.from(imageBlob);
          console.log(`Successfully generated image for ${key}, size: ${imageData.length} bytes`);
          break;
        } catch (genErr: any) {
          const isRateLimitError = genErr?.message?.includes('rate limit') || genErr?.message?.includes('429');
          
          console.error(`Image gen failed on attempt ${attempt + 1} for ${key}:`, genErr);
          
          if (isRateLimitError) {
            console.warn(`Rate limit hit for ${key}. Skipping remaining images to avoid further quota issues.`);
            // Skip all remaining images if we hit rate limit
            i = frameKeys.length;
            break;
          }
          
          if (attempt === 1) {
            // Log error but continue to next frame instead of throwing
            console.error(`Skipping image generation for ${key} after 2 failed attempts`);
            break;
          }
          // Minimal wait before retrying for speed optimization
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // No delay between requests for maximum speed

      if (!imageData) {
        console.warn(`Failed to generate image for ${key}, frame will display without image`);
        continue; // Skip to next frame instead of throwing error
      }

      // Upload imageData to S3
      const fileKey = `${sessionId}/frame${i + 1}.png`;

      try {
        console.log(`Uploading image to S3: ${bucketName}/${fileKey}`);
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: imageData,
          ContentType: 'image/png'
          // Note: ACL removed - bucket policy handles public access
        }));

        // Correct S3 URL format with region
        const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
        imageUrls.push(publicUrl);

        // Update the session with the image URL
        updateFrame(sessionId, i, {
          imageUrl: publicUrl,
        });

        console.log(`✅ Successfully generated and uploaded image ${i + 1}/${frameKeys.length}: ${publicUrl}`);
      } catch (uploadErr) {
        console.error(`❌ Failed to upload image for ${key}:`, uploadErr);
        console.error('S3 Upload Error Details:', {
          bucket: bucketName,
          key: fileKey,
          region: region
        });
        // Continue to next frame even if upload fails
      }
    }

    return res.status(200).json({ images: imageUrls, message: `Generated ${imageUrls.length}/${frameKeys.length} images` });
  } catch (error) {
    console.error('Error in image generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
    return res.status(500).json({ error: errorMessage });
  }
}
