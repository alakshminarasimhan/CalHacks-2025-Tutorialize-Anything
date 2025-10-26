# How to Get Correct Fish.Audio Voice IDs

Your voice options currently have **placeholder IDs** that need to be replaced with real Fish.Audio voice IDs.

## Problem Fixed:
✅ Voice selection now properly saved to session
✅ Same voice used for ALL slides
❌ Need real Fish.Audio voice IDs for characters

---

## Current Status:

```typescript
'Default Male': '',              // ✅ Works (uses Fish.Audio default)
'Default Female': '',            // ✅ Works (uses Fish.Audio default)
'Darth Vader': '7f92...',       // ❓ Verify this is correct
'Spongebob': '54a5...',         // ⚠️  Placeholder - needs real ID
'Minnie Mouse': 'b3c4...',      // ⚠️  Placeholder - needs real ID
'Jake Paul': 'c5d6...',         // ⚠️  Placeholder - needs real ID
'Kim Kardashian': 'd7e8...',    // ⚠️  Placeholder - needs real ID
```

---

## How to Get Real Voice IDs:

### Option 1: Fish.Audio Website
1. Go to: https://fish.audio/
2. Browse the **voice library** or **character voices**
3. When you find a voice you like, click on it
4. Copy the **Voice ID** (usually visible in the URL or voice details)
5. Replace the placeholder in `pages/api/tutorial.ts`

### Option 2: Fish.Audio API
You can query available voices using the Fish.Audio API:

```bash
curl -X GET "https://api.fish.audio/v1/voices" \
  -H "Authorization: Bearer YOUR_FISHAUDIO_API_KEY"
```

This returns a list of all available voices with their IDs.

### Option 3: Check Fish.Audio Documentation
- Visit: https://docs.fish.audio/
- Look for voice reference or voice catalog
- Find character/celebrity voices and their IDs

---

## How to Update Voice IDs:

Once you have the real voice IDs, update them in:

**File:** `pages/api/tutorial.ts` (around line 287)

```typescript
const voiceMapping: Record<string, string> = {
  'Default Male': '',
  'Default Female': '',
  'Darth Vader': 'REAL_DARTH_VADER_ID_HERE',
  'Spongebob Squarepants': 'REAL_SPONGEBOB_ID_HERE',
  'Minnie Mouse': 'REAL_MINNIE_ID_HERE',
  'Jake Paul': 'REAL_JAKE_PAUL_ID_HERE',
  'Kim Kardashian': 'REAL_KIM_K_ID_HERE',
};
```

---

## Testing:

After updating voice IDs:

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Generate a tutorial** with different voices

3. **Check the terminal logs:**
   ```
   Session created with voice: Jake Paul -> voiceId: c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
   Using voice ID: c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
   ```

4. **Verify audio:** All slides should use the same voice (Jake Paul)

---

## Alternative: Use Default Voices Only

If you don't need celebrity voices, you can simplify:

**Update `pages/index.tsx` (line 551):**

```typescript
const voiceOptions = [
  'Default Male',
  'Default Female',
]
```

Then all voices will use Fish.Audio's default male/female voices, which work without special IDs.

---

## Important Notes:

- **Default Male/Female work immediately** (empty string = default)
- **Celebrity voices require specific IDs** from Fish.Audio
- **Each voice ID must be valid** or audio generation will fail
- **Same voice ID is used for all slides** in a tutorial

---

## Current Behavior (After Fix):

✅ **Before:** Each slide used random/default voice
✅ **Now:** All slides use the voice you selected
⚠️  **Next:** Replace placeholder IDs with real Fish.Audio voice IDs

Once you get real voice IDs from Fish.Audio, update `tutorial.ts` and your app will be fully functional! 🎤
