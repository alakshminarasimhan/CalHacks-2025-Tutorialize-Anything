#!/usr/bin/env node
/**
 * Verification script to check AWS authentication configuration
 * Run this after setting up your .env.local file
 *
 * Usage: node verify-auth-config.js
 */

require('dotenv').config({ path: '.env.local' });

const checks = {
  pass: [],
  fail: [],
  warn: []
};

function check(name, condition, message, severity = 'fail') {
  if (condition) {
    checks.pass.push(`✅ ${name}`);
    return true;
  } else {
    checks[severity].push(`${severity === 'fail' ? '❌' : '⚠️'} ${name}: ${message}`);
    return false;
  }
}

console.log('\n🔍 Verifying AWS Authentication Configuration...\n');

// Check Cognito Configuration
console.log('📝 Cognito Configuration:');
const userPoolId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID;
const clientId = process.env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID;
const region = process.env.AWS_REGION;

check(
  'User Pool ID exists',
  userPoolId && userPoolId !== 'your_cognito_user_pool_id_here',
  'NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID not set in .env.local'
);

check(
  'User Pool ID format',
  userPoolId && /^[a-z]{2}-[a-z]+-\d_[a-zA-Z0-9]+$/.test(userPoolId),
  'User Pool ID should be in format: us-west-2_XXXXXXXXX',
  'warn'
);

check(
  'App Client ID exists',
  clientId && clientId !== 'your_cognito_app_client_id_here',
  'NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID not set in .env.local'
);

check(
  'App Client ID format',
  clientId && clientId.length > 20,
  'App Client ID seems too short',
  'warn'
);

check(
  'AWS Region set',
  region && region !== 'us-west-2',
  'AWS_REGION not set (defaulting to us-west-2)',
  'warn'
);

// Extract region from User Pool ID and compare
if (userPoolId && region) {
  const poolRegion = userPoolId.split('_')[0];
  check(
    'Region matches User Pool',
    poolRegion === region,
    `User Pool region (${poolRegion}) doesn't match AWS_REGION (${region})`
  );
}

console.log('');

// Check DynamoDB Configuration
console.log('📊 DynamoDB Configuration:');
const storyboardsTable = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE;
const usersTable = process.env.AWS_DYNAMODB_USERS_TABLE;

check(
  'Storyboards table name set',
  storyboardsTable === 'tutorialize-storyboards',
  'AWS_DYNAMODB_STORYBOARDS_TABLE should be "tutorialize-storyboards"'
);

check(
  'Users table name set',
  usersTable === 'tutorialize-users',
  'AWS_DYNAMODB_USERS_TABLE should be "tutorialize-users"'
);

console.log('');

// Check AWS Credentials
console.log('🔑 AWS Credentials:');
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

check(
  'Access Key ID exists',
  accessKeyId && accessKeyId !== 'your_access_key_id_here',
  'AWS_ACCESS_KEY_ID not set in .env.local'
);

check(
  'Secret Access Key exists',
  secretAccessKey && secretAccessKey !== 'your_aws_secret_access_key_here',
  'AWS_SECRET_ACCESS_KEY not set in .env.local'
);

console.log('');

// Check S3 Configuration
console.log('🪣 S3 Configuration:');
const s3Bucket = process.env.AWS_S3_BUCKET;

check(
  'S3 Bucket name set',
  s3Bucket && s3Bucket !== 'your_s3_bucket_name_here',
  'AWS_S3_BUCKET not set in .env.local'
);

console.log('');

// Check Other Required APIs
console.log('🔌 Other API Keys:');
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const brightDataKey = process.env.BRIGHTDATA_API_KEY;
const fishAudioKey = process.env.FISHAUDIO_API_KEY;

check(
  'Anthropic API Key',
  anthropicKey && anthropicKey !== 'your_anthropic_api_key_here',
  'ANTHROPIC_API_KEY not set',
  'warn'
);

check(
  'BrightData API Key',
  brightDataKey && brightDataKey !== 'your_brightdata_api_key_here',
  'BRIGHTDATA_API_KEY not set',
  'warn'
);

check(
  'Fish Audio API Key',
  fishAudioKey && fishAudioKey !== 'your_fishaudio_api_key_here',
  'FISHAUDIO_API_KEY not set',
  'warn'
);

console.log('');

// Print results
console.log('═══════════════════════════════════════════');
console.log('📊 RESULTS:');
console.log('═══════════════════════════════════════════\n');

if (checks.pass.length > 0) {
  console.log('✅ Passed Checks:');
  checks.pass.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (checks.warn.length > 0) {
  console.log('⚠️  Warnings:');
  checks.warn.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (checks.fail.length > 0) {
  console.log('❌ Failed Checks:');
  checks.fail.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

// Final verdict
const criticalFailures = checks.fail.length;
const warnings = checks.warn.length;

console.log('═══════════════════════════════════════════\n');

if (criticalFailures === 0 && warnings === 0) {
  console.log('🎉 All checks passed! Your authentication is configured correctly.\n');
  console.log('Next steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Navigate to: http://localhost:3000/signup');
  console.log('3. Create a test account and verify authentication works\n');
  process.exit(0);
} else if (criticalFailures === 0) {
  console.log('✅ Critical checks passed, but there are some warnings.\n');
  console.log('The app should work, but you may want to address the warnings above.\n');
  console.log('Next steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Test authentication at: http://localhost:3000\n');
  process.exit(0);
} else {
  console.log('❌ Configuration incomplete. Please fix the failed checks above.\n');
  console.log('See AUTHENTICATION_CHECKLIST.md for detailed setup instructions.\n');
  process.exit(1);
}
