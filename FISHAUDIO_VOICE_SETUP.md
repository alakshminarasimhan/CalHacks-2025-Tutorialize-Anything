# Fish.Audio Celebrity Voice Setup Guide

This guide explains how to add celebrity voice options to your Tutorial Maker application using Fish.Audio's voice cloning API.

## Overview

Fish.Audio provides AI-powered voice cloning with 200,000+ voices including celebrity-style voices. The application now supports custom voice selection for tutorial narration.

## Current Implementation

### Voice Selection UI

The homepage ([pages/index.tsx](pages/index.tsx)) now includes a "Narrator Voice" dropdown with pre-configured celebrity-style options:

- Default Voice (system default)
- Morgan Freeman Style
- David Attenborough Style
- Oprah Winfrey Style
- Neil deGrasse Tyson Style
- Stephen Fry Style

### How It Works

1. **User Selection**: User selects voice on homepage
2. **Session Storage**: Voice ID stored in session ([lib/session-storage.ts](lib/session-storage.ts))
3. **Audio Generation**: Voice ID passed to Fish.Audio API ([pages/api/audio-gen.ts](pages/api/audio-gen.ts))
4. **TTS Request**: `reference_id` parameter specifies the voice

## Getting Real Voice IDs from Fish.Audio

### Method 1: Browse Voice Library

1. **Login to Fish.Audio**
   - Go to [fish.audio](https://fish.audio)
   - Sign in or create account

2. **Access Voice Library**
   - Navigate to Voice Library: https://fish.audio/app/discovery/
   - Browse 200,000+ available voices
   - Filter by language, style, or search for specific celebrity voices

3. **Get Voice ID**
   - Click on a voice you want to use
   - Copy the **reference_id** or **model_id** from the voice details
   - Example format: `abc123def456` or similar

4. **Update Voice Options**
   - Open [pages/index.tsx](pages/index.tsx)
   - Replace placeholder values in `voiceOptions` array:

   ```typescript
   const voiceOptions = [
     { value: '', label: 'Default Voice' },
     { value: 'actual-voice-id-here', label: 'Morgan Freeman Style' },
     // Replace 'actual-voice-id-here' with real ID from Fish.Audio
   ];
   ```

### Method 2: Create Custom Voice Clone

Fish.Audio allows you to clone any voice from just 15 seconds of audio:

1. **Upload Audio Sample**
   - Record or upload 15+ seconds of clear speech
   - Ensure high quality audio (no background noise)

2. **Train Voice Model**
   - Fish.Audio processes and creates voice clone
   - Typically takes a few minutes
   - 99% voice accuracy according to Fish.Audio

3. **Get Reference ID**
   - Once trained, copy the reference ID
   - Add to `voiceOptions` in [pages/index.tsx](pages/index.tsx)

### Method 3: API Discovery

Query Fish.Audio API to list available voices:

```bash
curl https://api.fish.audio/v1/voices \
  -H "Authorization: Bearer YOUR_API_KEY"
```

This returns a list of available voices with their IDs.

## API Integration Details

### Request Format

When generating audio, the voice is specified via `reference_id`:

```typescript
const ttsPayload = {
  text: narration,
  format: 'mp3',
  sample_rate: 44100,
  reference_id: voiceId || null  // Your voice ID here
};
```

### Voice ID Flow

```
User selects voice on homepage
         ↓
POST /api/tutorial { voiceId: "voice-123" }
         ↓
Session created with voiceId
         ↓
POST /api/audio-gen { sessionId }
         ↓
Retrieves voiceId from session
         ↓
Fish.Audio TTS with reference_id: "voice-123"
         ↓
Audio generated in selected voice
```

## Testing Voice Selection

### 1. Local Testing

```bash
# Start development server
npm run dev

# Navigate to homepage
# Select a voice from dropdown
# Submit a URL
# Check console logs for:
"Using voice ID: your-voice-id"
```

### 2. Verify API Request

Check the Fish.Audio API request in [pages/api/audio-gen.ts](pages/api/audio-gen.ts):

```typescript
console.log('Using voice ID:', voiceId);
```

### 3. Test Different Voices

Create test requests with different voice IDs to compare output quality.

## Celebrity Voice Considerations

### Legal & Ethical

- **Public Figures**: Celebrity voice cloning may have legal restrictions
- **Consent Required**: Always ensure you have rights to use a voice
- **Commercial Use**: Review Fish.Audio terms for commercial voice usage
- **Attribution**: Consider crediting voice sources

### Best Practices

1. **Educational Use**: For tutorials, documentary-style voices (David Attenborough, etc.) work well
2. **Voice-Style Match**: Match voice to explanation style (e.g., professional voice for professional style)
3. **Clear Speech**: Choose voices with clear enunciation for educational content
4. **Consistency**: Use same voice throughout a tutorial for better flow

## Pricing & Limits

### Fish.Audio Pricing

- **Free Tier**: 10,000 characters/month
- **Pay-as-you-go**: 50% cheaper than competitors
- **Voice Cloning**: Included in API pricing
- **Batch Processing**: Available for multiple voices

### Rate Limits

Monitor usage to stay within limits:
- Track characters generated per session
- Implement caching for repeated content
- Use session storage to avoid regeneration

## Troubleshooting

### "Voice ID not found" Error

**Cause**: Invalid or expired voice reference ID

**Solution**:
1. Verify voice ID in Fish.Audio dashboard
2. Check that voice is still available
3. Use default voice (null) as fallback

### Poor Voice Quality

**Cause**: Low-quality reference audio or mismatched language

**Solution**:
1. Use Fish.Audio's pre-trained voices
2. Ensure reference audio is high quality (if custom)
3. Match voice language to narration language

### Voice Not Applied

**Cause**: Voice ID not passed correctly through API chain

**Debug Steps**:
1. Check browser console for voice ID in POST request
2. Check server logs: `console.log('Using voice ID:', voiceId)`
3. Verify Fish.Audio API receives `reference_id` parameter

## Advanced Configuration

### Dynamic Voice Selection

Allow users to change voice mid-tutorial:

```typescript
// In tutorial viewer
const changeVoice = async (newVoiceId: string) => {
  await fetch('/api/audio-gen', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      voiceId: newVoiceId  // Override session voice
    })
  });
};
```

### Voice Presets

Create voice presets for different use cases:

```typescript
const voicePresets = {
  educational: 'david-attenborough-id',
  motivational: 'morgan-freeman-id',
  technical: 'neil-tyson-id'
};
```

## Resources

- [Fish.Audio Homepage](https://fish.audio)
- [Fish.Audio Voice Library](https://fish.audio/app/discovery/)
- [Fish.Audio API Documentation](https://docs.fish.audio)
- [Voice Cloning Guide](https://docs.fish.audio/voice-cloning)

## Example Voice Configuration

Here's a complete example with real voice IDs (replace with actual IDs from Fish.Audio):

```typescript
const voiceOptions = [
  { value: '', label: 'Default Voice' },
  { value: 'e8d9f7a2b3c4', label: 'Narrator - Deep Male' },
  { value: 'f1e2d3c4b5a6', label: 'Narrator - Warm Female' },
  { value: 'a1b2c3d4e5f6', label: 'Educational - Clear' },
  { value: 'g7h8i9j0k1l2', label: 'Documentary Style' },
  { value: 'm3n4o5p6q7r8', label: 'Tech Enthusiast' }
];
```

## Next Steps

1. **Get Fish.Audio API Key**: Sign up at [fish.audio](https://fish.audio)
2. **Browse Voice Library**: Find voices that match your use case
3. **Copy Voice IDs**: Replace placeholder IDs in `voiceOptions`
4. **Test Voices**: Generate tutorials with different voices
5. **Optimize**: Choose best voices for each explanation style
