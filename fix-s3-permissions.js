#!/usr/bin/env node

/**
 * Script to fix S3 bucket permissions for CalHacks project
 * Run this to enable public read access and fix upload permissions
 * 
 * NOTE: This script only sets the bucket policy (public read).
 * You also need to ensure your IAM user has upload permissions.
 */

const { S3Client, PutBucketPolicyCommand, PutPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const bucketName = process.env.AWS_S3_BUCKET || 'calhacks-tutorialmaker';
const region = process.env.AWS_REGION || 'us-east-2';

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function fixS3Permissions() {
  console.log(`\n🔧 Fixing S3 permissions for bucket: ${bucketName}\n`);

  try {
    // Step 1: Disable block public access
    console.log('1️⃣  Disabling block public access...');
    await s3Client.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }));
    console.log('✅ Block public access disabled\n');

    // Step 2: Set bucket policy for public read access
    console.log('2️⃣  Setting bucket policy for public read access...');
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
        {
          Sid: 'AllowUploadWithACL',
          Effect: 'Allow',
          Principal: {
            AWS: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID || '*'}:root`
          },
          Action: [
            's3:PutObject',
            's3:PutObjectAcl'
          ],
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy),
    }));
    console.log('✅ Bucket policy updated\n');

    console.log('🎉 SUCCESS! S3 permissions have been fixed.\n');
    console.log('You can now:');
    console.log('  - Upload images and audio files to the bucket');
    console.log('  - Access uploaded files publicly via their URLs\n');

  } catch (error) {
    console.error('❌ Error fixing S3 permissions:', error.message);
    console.error('\n💡 Manual fix required:');
    console.error('1. Go to AWS S3 Console: https://s3.console.aws.amazon.com/');
    console.error(`2. Select bucket: ${bucketName}`);
    console.error('3. Go to "Permissions" tab');
    console.error('4. Edit "Block public access" - uncheck all boxes');
    console.error('5. Add this bucket policy:\n');
    console.error(JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    }, null, 2));
    console.error('\n6. Ensure your IAM user has s3:PutObject and s3:PutObjectAcl permissions\n');
    process.exit(1);
  }
}

fixS3Permissions();
