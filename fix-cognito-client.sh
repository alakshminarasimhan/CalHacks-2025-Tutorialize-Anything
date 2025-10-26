#!/bin/bash
# Script to create a new Cognito App Client without client secret

echo "🔧 Creating new Cognito App Client without secret..."
echo ""

# Read your User Pool ID from .env.local
if [ -f .env.local ]; then
  source .env.local
else
  echo "❌ .env.local not found!"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID" ]; then
  echo "❌ NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID not set in .env.local"
  exit 1
fi

echo "User Pool ID: $NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID"
echo ""

# Create new app client without secret
echo "Creating app client..."
RESULT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID" \
  --client-name "tutorialize-web-client-nosecret" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --output json)

if [ $? -eq 0 ]; then
  # Extract Client ID from result
  NEW_CLIENT_ID=$(echo "$RESULT" | grep -o '"ClientId": "[^"]*' | grep -o '[^"]*$')

  echo ""
  echo "✅ Success! New app client created."
  echo ""
  echo "📋 NEW CLIENT ID: $NEW_CLIENT_ID"
  echo ""
  echo "Next steps:"
  echo "1. Update your .env.local file:"
  echo "   NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=$NEW_CLIENT_ID"
  echo ""
  echo "2. Restart your dev server: npm run dev"
  echo ""
else
  echo "❌ Failed to create app client. Check AWS credentials and permissions."
  exit 1
fi
