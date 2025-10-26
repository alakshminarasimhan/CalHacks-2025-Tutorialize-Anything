import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSession, updateFrame } from '@/lib/session-storage';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET || '';
// Stable Diffusion 1.5 API - correct endpoint
const SD_API_URL = 'https://modelslab.com/api/v6/images/text2img';
const SD_API_KEY = process.env.STABLE_DIFFUSION_API_KEY || 'PPfSFhBA1U5nMk8LTapVaopkPYbrRIvqWCKcO59pUUH6IH2SWy0Mtge9qTd6';

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
          // Using Stable Diffusion 1.5 - Optimized for speed
          const negativePrompt = 'text, words, letters, labels, signs, writing, typography, captions, subtitles, titles, numbers, digits, symbols, alphabet, characters, fonts, readable text, written words, inscriptions, banners, posters, books with text, newspapers, screens with text, billboards, name tags, speech bubbles with text, painting, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face';

          const payload = {
            key: SD_API_KEY,
            model_id: "sd-1.5",
            prompt: prompt,
            negative_prompt: negativePrompt,
            width: 512,
            height: 512,
            samples: 1,
            num_inference_steps: 20, // Reduced from 30 to 20 for faster generation
            guidance_scale: 7.5,
            safety_checker: false,
            enhance_prompt: false,
            seed: null,
            webhook: null,
            track_id: null
          };

          console.log(`Calling Stable Diffusion API for ${key}...`);

          const response = await fetch(SD_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          console.log(`Response status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Stable Diffusion API error:`, errorText);
            throw new Error(`Stable Diffusion API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          console.log('SD API response:', result);

          // Handle different response formats
          let imageUrl: string | null = null;

          // Case 1: Immediate success with image URL
          if (result.status === 'success' && result.output && result.output[0]) {
            imageUrl = result.output[0];
          }
          // Case 2: Processing - need to poll with fetch_url
          else if (result.status === 'processing' && result.fetch_result) {
            console.log(`Image processing for ${key}, polling with fetch_url...`);
            const fetchUrl = result.fetch_result;

            // Poll up to 5 times (10 seconds max)
            for (let poll = 0; poll < 5; poll++) {
              await new Promise(resolve => setTimeout(resolve, 2000));

              const pollResponse = await fetch(fetchUrl);
              if (!pollResponse.ok) {
                console.error(`Poll failed: ${pollResponse.status}`);
                continue;
              }

              const pollResult = await pollResponse.json();
              console.log(`Poll attempt ${poll + 1}:`, pollResult);

              if (pollResult.status === 'success' && pollResult.output && pollResult.output[0]) {
                imageUrl = pollResult.output[0];
                break;
              }
            }
          }
          // Case 3: Direct image URL in output field
          else if (result.output && typeof result.output === 'string') {
            imageUrl = result.output;
          }

          if (!imageUrl) {
            throw new Error(`No image URL received. Response: ${JSON.stringify(result)}`);
          }

          console.log(`Image URL received: ${imageUrl}`);

          // Download the image
          const imgResponse = await fetch(imageUrl);
          if (!imgResponse.ok) {
            throw new Error(`Failed to download image: ${imgResponse.status}`);
          }

          const imageBlob = await imgResponse.arrayBuffer();
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
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: imageData,
          ContentType: 'image/png'
        }));

        const publicUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
        imageUrls.push(publicUrl);

        // Update the session with the image URL
        updateFrame(sessionId, i, {
          imageUrl: publicUrl,
        });

        console.log(`Successfully generated and uploaded image ${i + 1}/${frameKeys.length}`);
      } catch (uploadErr) {
        console.error(`Failed to upload image for ${key}:`, uploadErr);
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
