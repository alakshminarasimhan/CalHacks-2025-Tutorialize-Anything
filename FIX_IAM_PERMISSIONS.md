# Fix IAM User Permissions for S3 Uploads

Your app is getting `AccessDenied` errors because your IAM user doesn't have permission to upload files to S3.

## Quick Fix (AWS Console)

### Step 1: Go to IAM Users
1. Open AWS Console: https://console.aws.amazon.com/iam/
2. Click **"Users"** in the left sidebar
3. Find and click on the IAM user whose credentials are in your `.env.local`
   - This is the user for the `AWS_ACCESS_KEY_ID` you're using

### Step 2: Add S3 Upload Policy
1. Click the **"Permissions"** tab
2. Click **"Add permissions"** → **"Attach policies directly"**
3. Search for: **`AmazonS3FullAccess`**
4. Check the box next to it
5. Click **"Next"** → **"Add permissions"**

> **Note:** `AmazonS3FullAccess` gives full S3 access. For production, use a more restrictive policy (see below).

---

## Better Fix (More Secure - Recommended for Production)

Instead of `AmazonS3FullAccess`, create a custom policy that only allows access to your specific bucket:

### Step 1: Create Custom Policy
1. Go to: https://console.aws.amazon.com/iam/
2. Click **"Policies"** in the left sidebar
3. Click **"Create policy"**
4. Click **"JSON"** tab
5. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3UploadToTutorialBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::calhacks-tutorialmaker",
        "arn:aws:s3:::calhacks-tutorialmaker/*"
      ]
    }
  ]
}
```

6. Click **"Next"**
7. Name it: `TutorializerS3Access`
8. Click **"Create policy"**

### Step 2: Attach Policy to Your IAM User
1. Go to **IAM → Users** → your user
2. Click **"Add permissions"** → **"Attach policies directly"**
3. Search for: `TutorializerS3Access`
4. Check the box
5. Click **"Next"** → **"Add permissions"**

---

## Verify It's Fixed

After adding permissions:

1. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Test tutorial generation** - you should see:
   ```
   ✅ Successfully generated and uploaded audio 1/8
   ✅ Successfully generated and uploaded image 1/8
   ```

Instead of:
   ```
   ❌ Failed to generate/upload audio for step1: AccessDenied
   ```

---

## What Each Permission Does

| Permission | What It Does | Why You Need It |
|------------|--------------|-----------------|
| `s3:PutObject` | Upload files to S3 | Required to save images & audio |
| `s3:PutObjectAcl` | Set file permissions | Required to make files public |
| `s3:GetObject` | Read/download files | Useful for debugging |
| `s3:DeleteObject` | Delete files | Clean up old tutorials |
| `s3:ListBucket` | List bucket contents | Useful for management |

---

## Quick Check: What You Have Now

✅ **Bucket Policy** (public read access)
- Allows anyone to **view/download** uploaded files
- This is what we just set up

❌ **IAM User Policy** (upload permissions) 
- Allows your **server** to **upload** files
- **This is what's missing!** ← You need to fix this

---

## After You Fix IAM Permissions

Your complete S3 setup will be:

1. **Bucket Policy**: Public can read files ✅
2. **IAM User Policy**: Your server can upload files ✅
3. **Block Public Access**: Disabled ✅
4. **Files**: Upload with `ACL: 'public-read'` ✅

Then everything will work! 🚀
