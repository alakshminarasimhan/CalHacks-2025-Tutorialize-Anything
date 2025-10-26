# AWS Setup Guide for Tutorial Maker

This guide will walk you through setting up AWS Cognito for authentication and DynamoDB for persistent storyboard storage.

## Prerequisites

- AWS Account with administrator access
- AWS CLI installed (optional but recommended)
- Node.js and npm installed locally

## Step 1: Create AWS Cognito User Pool

### Via AWS Console:

1. **Navigate to AWS Cognito**
   - Go to: https://console.aws.amazon.com/cognito
   - Select your region (e.g., `us-west-2`)

2. **Create User Pool**
   - Click "Create user pool"
   - **Step 1 - Configure sign-in experience:**
     - Provider types: Select "Cognito user pool"
     - Cognito user pool sign-in options: Check "Email"
     - Click "Next"

   - **Step 2 - Configure security requirements:**
     - Password policy: Choose "Cognito defaults" or customize
     - Multi-factor authentication: Choose "No MFA" (or configure as needed)
     - User account recovery: Enable "Email only"
     - Click "Next"

   - **Step 3 - Configure sign-up experience:**
     - Self-service sign-up: Enable "Allow users to sign themselves up"
     - Required attributes: Select "email"
     - Click "Next"

   - **Step 4 - Configure message delivery:**
     - Email provider: Choose "Send email with Cognito" (or configure SES)
     - Click "Next"

   - **Step 5 - Integrate your app:**
     - User pool name: `tutorialize-user-pool`
     - App client name: `tutorialize-web-client`
     - Client secret: Select "Don't generate a client secret" (required for web apps)
     - Click "Next"

   - **Step 6 - Review and create:**
     - Review settings and click "Create user pool"

3. **Get Configuration Values**
   - After creation, note down:
     - **User Pool ID**: Found on the "User pool overview" page (e.g., `us-west-2_XXXXXXXXX`)
     - **App Client ID**: Go to "App integration" tab → "App clients" → Copy the "Client ID"

### Via AWS CLI:

```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name tutorialize-user-pool \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}"

# Create app client (note the UserPoolId from previous command)
aws cognito-idp create-user-pool-client \
  --user-pool-id us-west-2_XXXXXXXXX \
  --client-name tutorialize-web-client \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

## Step 2: Create DynamoDB Tables

### Table 1: Users Table

#### Via AWS Console:

1. **Navigate to DynamoDB**
   - Go to: https://console.aws.amazon.com/dynamodb
   - Click "Create table"

2. **Configure Table**
   - Table name: `tutorialize-users`
   - Partition key: `userId` (String)
   - Table settings: Use "Default settings" (or customize)
   - Click "Create table"

#### Via AWS CLI:

```bash
aws dynamodb create-table \
  --table-name tutorialize-users \
  --attribute-definitions \
      AttributeName=userId,AttributeType=S \
  --key-schema \
      AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Table 2: Storyboards Table

#### Via AWS Console:

1. **Create Table**
   - Table name: `tutorialize-storyboards`
   - Partition key: `userId` (String)
   - Sort key: `sessionId` (String)
   - Click "Create table"

2. **(Optional) Create Global Secondary Index for Session Lookup**
   - After table creation, go to "Indexes" tab
   - Click "Create index"
   - Partition key: `sessionId` (String)
   - Index name: `sessionId-index`
   - Click "Create index"

#### Via AWS CLI:

```bash
aws dynamodb create-table \
  --table-name tutorialize-storyboards \
  --attribute-definitions \
      AttributeName=userId,AttributeType=S \
      AttributeName=sessionId,AttributeType=S \
  --key-schema \
      AttributeName=userId,KeyType=HASH \
      AttributeName=sessionId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
      "[{
        \"IndexName\": \"sessionId-index\",
        \"KeySchema\": [{\"AttributeName\":\"sessionId\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"}
      }]"
```

## Step 3: Configure IAM Permissions

Your AWS credentials need the following permissions:

### Option A: Create Custom IAM Policy

1. **Create Policy**
   - Go to IAM → Policies → Create policy
   - Use JSON editor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/tutorialize-users",
        "arn:aws:dynamodb:*:*:table/tutorialize-storyboards",
        "arn:aws:dynamodb:*:*:table/tutorialize-storyboards/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

2. **Attach to IAM User**
   - Name the policy: `TutorialMakerAppPolicy`
   - Create or select an IAM user
   - Attach the policy to the user
   - Generate access keys for the user

### Option B: Use Existing AWS Credentials

If you already have AWS credentials with appropriate permissions, ensure they include:
- `cognito-idp:*` for Cognito operations
- DynamoDB read/write for the two tables
- S3 read/write for your bucket

## Step 4: Configure S3 Bucket (Already Set Up)

If you haven't already configured S3 for image/audio storage, ensure:

1. **Bucket Permissions**
   - Public read access for objects
   - CORS configuration allows GET/HEAD from all origins

2. **CORS Configuration Example:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Step 5: Update Environment Variables

Create or update your `.env.local` file with the following:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Then edit `.env.local`:

```bash
# AWS Cognito Configuration
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX
NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=your_app_client_id_here

# AWS DynamoDB Configuration
AWS_DYNAMODB_STORYBOARDS_TABLE=tutorialize-storyboards
AWS_DYNAMODB_USERS_TABLE=tutorialize-users

# AWS Credentials & Region
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-west-2

# AWS S3 Configuration
AWS_S3_BUCKET=your_s3_bucket_name

# ... other API keys (BrightData, Anthropic, etc.)
```

## Step 6: Test the Setup

1. **Start the development server:**

```bash
npm install
npm run dev
```

2. **Test Authentication:**
   - Navigate to `http://localhost:3000/signup`
   - Create a new account
   - Check your email for verification code
   - Confirm your email
   - Sign in at `http://localhost:3000/login`

3. **Test Storyboard Storage:**
   - Generate a tutorial
   - Click "Save Tutorial" button
   - Navigate to "Saved Storyboards" page
   - Verify your storyboard appears in the list

4. **Verify DynamoDB:**
   - Go to AWS DynamoDB Console
   - Select `tutorialize-storyboards` table
   - Click "Explore table items"
   - You should see your saved storyboard

## Troubleshooting

### Issue: "No authentication token provided"
- **Solution:** Ensure the user is logged in and token is being sent in Authorization header

### Issue: "Token verification failed"
- **Solution:**
  - Verify `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID` and `NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID` are correct
  - Ensure the token hasn't expired (refresh the page)

### Issue: "Failed to save storyboard"
- **Solution:**
  - Check AWS credentials have DynamoDB permissions
  - Verify table names match environment variables
  - Check CloudWatch logs for detailed error messages

### Issue: DynamoDB "ResourceNotFoundException"
- **Solution:** Verify table names are correct and tables exist in the specified region

### Issue: Cognito "UserNotFoundException" on login
- **Solution:** User needs to sign up first and confirm their email

## Security Best Practices

1. **Never commit `.env.local` to git** - It's already in `.gitignore`

2. **Use IAM roles in production** - For deployed environments (Vercel, AWS Lambda), use IAM roles instead of access keys

3. **Enable MFA** - Consider enabling multi-factor authentication in Cognito for production

4. **Rotate credentials** - Regularly rotate AWS access keys and secrets

5. **Monitor usage** - Set up CloudWatch alarms for unusual DynamoDB or Cognito activity

## Production Deployment Notes

### Vercel Deployment:

1. **Add environment variables** in Vercel dashboard (Settings → Environment Variables)

2. **Use Vercel AWS integration** or provide AWS credentials as environment variables

3. **Consider using AWS Secrets Manager** for sensitive credentials

### AWS Lambda/Amplify Deployment:

1. **Use IAM roles** instead of access keys

2. **Attach execution role** with the custom policy created above

3. **Configure VPC** if DynamoDB is in a private subnet

## Cost Estimates

### AWS Cognito:
- **Free Tier:** 50,000 monthly active users
- **Beyond Free Tier:** $0.0055 per MAU

### DynamoDB:
- **Free Tier:** 25 GB storage, 25 read/write units
- **On-Demand Pricing:**
  - Writes: $1.25 per million write requests
  - Reads: $0.25 per million read requests

### S3:
- **Free Tier:** 5 GB storage, 20,000 GET requests
- **Standard Storage:** $0.023 per GB/month

**Estimated monthly cost for moderate usage:** $5-20/month (beyond free tier)

## Support

For issues specific to AWS setup:
- AWS Documentation: https://docs.aws.amazon.com
- AWS Support: https://console.aws.amazon.com/support

For application-specific issues:
- See project README.md
- Check GitHub issues
