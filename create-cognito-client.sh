#!/bin/bash
# Create Cognito App Client WITHOUT client secret

set -e

# Load env vars
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "❌ .env.local not found!"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID" ]; then
  echo "❌ NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID not set in .env.local"
  exit 1
fi

echo "🔧 Creating Cognito App Client (no secret)..."
echo "User Pool ID: $NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID"
echo ""

# Create app client
aws cognito-idp create-user-pool-client \
  --user-pool-id "$NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID" \
  --client-name "tutorialize-web-client-public" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --prevent-user-existence-errors ENABLED \
  --query 'UserPoolClient.ClientId' \
  --output text > /tmp/cognito_client_id.txt

NEW_CLIENT_ID=$(cat /tmp/cognito_client_id.txt)

echo "✅ Success! App client created WITHOUT secret."
echo ""
echo "📋 NEW CLIENT ID: $NEW_CLIENT_ID"
echo ""
echo "🔄 Updating .env.local..."

# Update .env.local
if grep -q "NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=" .env.local; then
  # Update existing line
  sed -i.bak "s/NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=.*/NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=$NEW_CLIENT_ID/" .env.local
  echo "✅ Updated NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID in .env.local"
else
  # Add new line
  echo "NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID=$NEW_CLIENT_ID" >> .env.local
  echo "✅ Added NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID to .env.local"
fi

echo ""
echo "✨ All done! Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Try signing up again at http://localhost:3000/signup"
echo ""

rm /tmp/cognito_client_id.txt
