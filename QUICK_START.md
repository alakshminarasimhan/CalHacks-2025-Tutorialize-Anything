# Quick Start Guide - AWS Authentication

You've successfully migrated from Echo/Supabase to AWS Cognito + DynamoDB! Here's everything you need to know to get started.

## ✅ What's Already Done

- ✅ All code is implemented and ready to use
- ✅ Dependencies are installed
- ✅ Authentication flow is complete (signup, login, logout)
- ✅ Persistent storyboard storage with DynamoDB
- ✅ API authentication with JWT tokens
- ✅ Protected routes and pages

## 🚀 3-Step Setup

### Step 1: Create AWS Resources (5 minutes)

You need to create these in AWS Console:

#### A. AWS Cognito User Pool
1. Go to: https://console.aws.amazon.com/cognito
2. Click "Create user pool"
3. **Important settings:**
   - Sign-in: Email only
   - Self-service signup: Enabled
   - App client: **NO client secret** (critical!)
4. Copy these values:
   - User Pool ID (e.g., `us-west-2_abc123XYZ`)
   - App Client ID (e.g., `7abcdefg12345678`)

#### B. DynamoDB Tables
1. Go to: https://console.aws.amazon.com/dynamodb
2. Create **two tables**:

   **Table 1:**
   - Name: `tutorialize-users`
   - Partition key: `userId` (String)

   **Table 2:**
   - Name: `tutorialize-storyboards`
   - Partition key: `userId` (String)
   - Sort key: `sessionId` (String) ← Don't forget!

### Step 2: Configure Environment Variables (2 minutes)

Update your `.env.local` file:

```bash
# Copy the example file first
cp .env.example .env.local
```

Then edit `.env.local` with your values:

```bash
# AWS Cognito (from Step 1A)
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-west-2_abc123XYZ
NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=7abcdefg12345678

# AWS DynamoDB (exact names from Step 1B)
AWS_DYNAMODB_STORYBOARDS_TABLE=tutorialize-storyboards
AWS_DYNAMODB_USERS_TABLE=tutorialize-users

# AWS Credentials (your existing AWS credentials)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2  # ← Must match Cognito region!

# AWS S3 (keep your existing bucket)
AWS_S3_BUCKET=your-existing-bucket

# Other API keys (keep existing)
BRIGHTDATA_API_KEY=...
ANTHROPIC_API_KEY=...
FISHAUDIO_API_KEY=...
```

### Step 3: Verify & Test (3 minutes)

```bash
# 1. Verify your configuration
npm run verify-auth

# 2. Start the dev server
npm run dev

# 3. Test authentication flow
```

Open http://localhost:3000 and you'll be redirected to login.

## 🧪 Testing Authentication

### Test 1: Sign Up
1. Go to: http://localhost:3000/signup
2. Enter:
   - Username: `testuser`
   - Email: your real email
   - Password: `Test1234!` (min 8 chars, must have uppercase, lowercase, number, symbol)
3. Submit → Check email for verification code
4. Enter code → Should redirect to login

### Test 2: Sign In
1. Go to: http://localhost:3000/login
2. Enter your email and password
3. Should redirect to homepage

### Test 3: Save a Storyboard
1. Generate a tutorial (enter any GitHub URL)
2. Click "Save Tutorial" button
3. Go to "Saved Storyboards" page
4. Should see your saved tutorial!

### Test 4: Check DynamoDB
1. Go to AWS Console → DynamoDB
2. Open `tutorialize-storyboards` table
3. Click "Explore table items"
4. You should see your saved storyboard!

## 🎯 Key Features

### User Authentication
- **Sign up** with email verification
- **Sign in** with email/password
- **Automatic session management** (stays logged in)
- **Protected routes** (redirects to login if not authenticated)
- **Logout** functionality

### Storyboard Storage
- **Save storyboards** to DynamoDB (persistent!)
- **List all your storyboards** on the Saved page
- **View saved storyboards** anytime
- **Delete storyboards** from your library
- **No more data loss** on server restart!

### API Security
- All API routes protected with JWT tokens
- Automatic token refresh
- Token expiration handling

## 📂 New Pages & Features

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Email/password authentication |
| Sign Up | `/signup` | New user registration + email verification |
| Saved Storyboards | `/saved` | Browse and manage your saved tutorials |
| Homepage | `/` | Updated with Cognito auth + "Saved" link |
| Tutorial Viewer | `/tutorial/[id]` | Added "Save" button |

## 🔧 Troubleshooting

### Issue: "Client secret not supported"
**Fix:** Your Cognito app client has a client secret. You need to create a new app client **without** a secret.

### Issue: "User is not confirmed"
**Fix:** Check your email for the verification code and confirm your account via `/signup`.

### Issue: Verification script fails
```bash
npm run verify-auth
```
This will tell you exactly what's missing in your configuration.

### Issue: "Invalid credentials" on AWS operations
**Fix:** Make sure your AWS credentials have these permissions:
- `cognito-idp:*`
- `dynamodb:PutItem`, `GetItem`, `Query`, `DeleteItem`
- `s3:PutObject`, `GetObject`

### Still having issues?
See [AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md) for detailed debugging steps.

## 📚 Documentation

- **[AWS_SETUP_GUIDE.md](AWS_SETUP_GUIDE.md)** - Detailed AWS setup instructions
- **[AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md)** - Complete testing checklist
- **[.env.example](.env.example)** - All required environment variables

## 🔐 Security Notes

### In Development:
- JWT tokens stored in browser localStorage
- Session persists across page refreshes
- Tokens expire after 1 hour (Cognito default)

### For Production:
- Enable MFA in Cognito
- Add rate limiting on auth endpoints
- Set up CloudWatch logging
- Use IAM roles instead of access keys (on AWS Lambda/Vercel)

## 💡 Common Commands

```bash
# Verify configuration
npm run verify-auth

# Start development server
npm run dev

# Check if user pools exist
aws cognito-idp list-user-pools --max-results 10

# Check DynamoDB tables
aws dynamodb list-tables

# View saved storyboards
aws dynamodb scan --table-name tutorialize-storyboards
```

## 🎉 That's It!

Your authentication is now powered by AWS Cognito with persistent DynamoDB storage. Everything is configured and ready to use!

**Next Steps:**
1. Run `npm run verify-auth` to confirm setup
2. Start the dev server with `npm run dev`
3. Create a test account and try saving a storyboard
4. Check DynamoDB to see your data persisted!

---

**Need Help?** Check the detailed guides:
- Setup issues → [AWS_SETUP_GUIDE.md](AWS_SETUP_GUIDE.md)
- Testing → [AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md)
