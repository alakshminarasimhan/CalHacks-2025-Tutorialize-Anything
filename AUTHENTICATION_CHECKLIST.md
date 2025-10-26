# Authentication Setup Checklist

This checklist ensures your AWS Cognito authentication is properly configured and will work correctly.

## ✅ Pre-Flight Checklist

### 1. AWS Cognito User Pool Configuration

- [ ] **User Pool Created** in AWS Console
  - Region: `us-west-2` (or your preferred region)
  - Name: `tutorialize-user-pool`

- [ ] **User Pool Settings:**
  - [ ] Sign-in options: **Email** enabled
  - [ ] Self-service sign-up: **Enabled**
  - [ ] Required attributes: **email**
  - [ ] Email verification: **Enabled**
  - [ ] MFA: Optional (can be disabled for testing)

- [ ] **App Client Created:**
  - [ ] Name: `tutorialize-web-client`
  - [ ] **Client secret: DISABLED** ⚠️ **CRITICAL** - Web apps cannot use client secrets
  - [ ] Auth flows enabled:
    - `ALLOW_USER_PASSWORD_AUTH`
    - `ALLOW_REFRESH_TOKEN_AUTH`

- [ ] **Environment Variables Set:**
  ```bash
  # In .env.local file:
  NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX
  NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
  AWS_REGION=us-west-2  # Must match User Pool region
  ```

### 2. DynamoDB Tables Configuration

- [ ] **Table 1: `tutorialize-users`**
  - Partition key: `userId` (String)
  - Billing mode: On-demand or Provisioned

- [ ] **Table 2: `tutorialize-storyboards`**
  - Partition key: `userId` (String)
  - Sort key: `sessionId` (String)
  - Billing mode: On-demand or Provisioned

- [ ] **Environment Variables Set:**
  ```bash
  AWS_DYNAMODB_STORYBOARDS_TABLE=tutorialize-storyboards
  AWS_DYNAMODB_USERS_TABLE=tutorialize-users
  ```

### 3. AWS Credentials & Permissions

- [ ] **IAM User/Role has permissions for:**
  - [ ] `cognito-idp:*` (or specific Cognito operations)
  - [ ] `dynamodb:PutItem`, `GetItem`, `Query`, `DeleteItem` on both tables
  - [ ] `s3:PutObject`, `GetObject` on S3 bucket

- [ ] **Environment Variables Set:**
  ```bash
  AWS_ACCESS_KEY_ID=your_access_key_here
  AWS_SECRET_ACCESS_KEY=your_secret_key_here
  AWS_REGION=us-west-2  # Same as Cognito region
  ```

### 4. Dependencies Installed

- [ ] Run `npm install` to ensure all packages are installed:
  - `amazon-cognito-identity-js`
  - `aws-jwt-verify`
  - `@aws-sdk/client-dynamodb`
  - `@aws-sdk/lib-dynamodb`

## 🔍 Common Configuration Issues

### Issue 1: "Client secret is not supported for public clients"
**Cause:** App client was created with a client secret
**Fix:** In Cognito console → App clients → Delete old client → Create new client with **NO client secret**

### Issue 2: "User Pool ID or App Client ID is invalid"
**Cause:** Environment variables not set correctly
**Fix:**
- Verify `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID` starts with region (e.g., `us-west-2_`)
- Verify `NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID` is from the correct app client
- Ensure variables are in `.env.local` (NOT `.env.example`)
- Restart dev server after changing environment variables

### Issue 3: "User is not confirmed"
**Cause:** User signed up but hasn't verified email
**Fix:**
- Check email for verification code
- Use the signup page's confirmation step
- Or manually confirm user in Cognito console → Users → Confirm user

### Issue 4: JWT verification fails on API routes
**Cause:** Token expired or wrong User Pool ID
**Fix:**
- Verify `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID` in backend matches frontend
- Refresh the page to get new token
- Check token expiration (default 1 hour)

### Issue 5: "Cannot read properties of undefined (reading 'userId')"
**Cause:** User not authenticated or token missing
**Fix:**
- Ensure user is logged in
- Check browser console for auth errors
- Verify AuthProvider wraps the app in `_app.tsx`

## 🧪 Testing Authentication Flow

### Test 1: Sign Up Flow

1. **Navigate to signup page:**
   ```
   http://localhost:3000/signup
   ```

2. **Fill in form:**
   - Username: `testuser`
   - Email: `your-email@example.com` (use real email)
   - Password: `Test1234!` (min 8 chars, uppercase, lowercase, number, symbol)

3. **Submit form**
   - Should show confirmation code screen
   - Check email for 6-digit code

4. **Enter confirmation code**
   - Should redirect to login page
   - Should show success message

**Expected Result:** ✅ User created in Cognito User Pool

### Test 2: Sign In Flow

1. **Navigate to login page:**
   ```
   http://localhost:3000/login
   ```

2. **Enter credentials:**
   - Email: `your-email@example.com`
   - Password: `Test1234!`

3. **Click Sign In**
   - Should redirect to homepage (/)
   - Should see user email in top-right corner

**Expected Result:** ✅ User authenticated, JWT token stored in browser

### Test 3: Protected Routes

1. **While logged in, navigate to:**
   - Homepage: `http://localhost:3000/` ✅ Should work
   - Saved page: `http://localhost:3000/saved` ✅ Should work
   - Tutorial viewer: `http://localhost:3000/tutorial/[sessionId]` ✅ Should work

2. **Log out, then try accessing:**
   - Any protected page → Should redirect to `/login`

**Expected Result:** ✅ Protected routes require authentication

### Test 4: Save Storyboard Flow

1. **Log in and generate a tutorial:**
   - Enter URL: `https://github.com/facebook/react`
   - Click "Generate Tutorial"
   - Wait for tutorial to complete

2. **Click "Save Tutorial" button**
   - Should show "Tutorial saved successfully!" alert
   - Button should change to "Saved!"

3. **Navigate to Saved Storyboards:**
   - Click "Saved Storyboards" link
   - Should see your saved tutorial in the list

4. **Check DynamoDB:**
   - Go to AWS Console → DynamoDB → `tutorialize-storyboards`
   - Click "Explore table items"
   - Should see a record with your `userId` and `sessionId`

**Expected Result:** ✅ Storyboard saved to DynamoDB and appears in saved list

### Test 5: API Authentication

1. **Open browser DevTools (F12) → Network tab**

2. **Generate and save a tutorial**

3. **Look at the `/api/storyboards/save` request:**
   - Headers should include: `Authorization: Bearer eyJ...` (JWT token)
   - Response should be: `{ "success": true, "sessionId": "..." }`

4. **Try accessing `/api/storyboards/list`:**
   - Should return list of your storyboards
   - Should include `Authorization` header

**Expected Result:** ✅ API routes verify JWT tokens correctly

## 🔧 Debugging Commands

### Check if environment variables are loaded:

```bash
# In your terminal (with dev server running):
node -e "console.log({
  userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID,
  clientId: process.env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID,
  region: process.env.AWS_REGION,
  storyboardsTable: process.env.AWS_DYNAMODB_STORYBOARDS_TABLE
})"
```

### Check Cognito User Pool from CLI:

```bash
# List user pools
aws cognito-idp list-user-pools --max-results 10

# Describe specific pool
aws cognito-idp describe-user-pool --user-pool-id us-west-2_XXXXXXXXX

# List app clients
aws cognito-idp list-user-pool-clients --user-pool-id us-west-2_XXXXXXXXX
```

### Check DynamoDB tables:

```bash
# List tables
aws dynamodb list-tables

# Describe table
aws dynamodb describe-table --table-name tutorialize-storyboards

# Scan table (see all items)
aws dynamodb scan --table-name tutorialize-storyboards --max-items 10
```

### Browser Console Debugging:

```javascript
// In browser console (while on your app):

// Check if user is logged in
localStorage.getItem('CognitoIdentityServiceProvider.XXXXX.LastAuthUser')

// Check stored tokens (look for keys with "idToken", "accessToken")
Object.keys(localStorage).filter(k => k.includes('CognitoIdentityServiceProvider'))

// Check auth context
// (The AuthProvider should expose user state via useAuth hook)
```

## ✅ Final Verification

Before deploying to production:

- [ ] All test flows pass (signup, login, save, list, delete)
- [ ] Protected routes redirect to login when not authenticated
- [ ] JWT tokens are verified on API routes
- [ ] DynamoDB tables contain data after saving storyboards
- [ ] No console errors related to authentication
- [ ] Logout functionality works correctly
- [ ] User can sign up with email verification
- [ ] Password requirements are enforced
- [ ] API endpoints return proper error codes (401 for unauthorized)

## 🚀 Production Considerations

### Security:
- [ ] Enable MFA in Cognito for production users
- [ ] Set up custom email templates in Cognito
- [ ] Configure password policies (complexity, expiration)
- [ ] Add rate limiting on signup/login endpoints
- [ ] Enable CloudWatch logging for Cognito events

### Performance:
- [ ] Consider adding DynamoDB indexes for common queries
- [ ] Implement token refresh logic before expiration
- [ ] Add caching for frequently accessed storyboards
- [ ] Monitor DynamoDB read/write capacity

### Compliance:
- [ ] Add privacy policy and terms of service
- [ ] Implement account deletion functionality
- [ ] Add email unsubscribe options
- [ ] Log authentication events for audit trail

## 📚 Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [amazon-cognito-identity-js Library](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [JWT Token Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

## Quick Start (TL;DR)

1. **Create Cognito User Pool** (no client secret!)
2. **Create 2 DynamoDB tables** (`tutorialize-users`, `tutorialize-storyboards`)
3. **Update `.env.local`** with Cognito IDs and AWS credentials
4. **Run `npm install` and `npm run dev`**
5. **Test signup** at `/signup`
6. **Test login** at `/login`
7. **Generate and save** a tutorial
8. **Check DynamoDB** to verify data is saved

If all steps work, you're good to go! 🎉
