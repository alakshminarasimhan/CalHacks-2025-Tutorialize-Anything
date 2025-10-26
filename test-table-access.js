#!/usr/bin/env node

/**
 * Test DynamoDB table access with current credentials
 */

require('dotenv').config({ path: '.env' });
const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE || 'Calhacks-Skywalkr';
const REGION = process.env.AWS_REGION || 'us-east-2';
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;

console.log('='.repeat(60));
console.log('DynamoDB Table Access Test');
console.log('='.repeat(60));
console.log(`Table Name: ${TABLE_NAME}`);
console.log(`Region: ${REGION}`);
console.log(`Access Key: ${ACCESS_KEY?.substring(0, 8)}...`);
console.log('='.repeat(60));
console.log('');

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function testTableAccess() {
  // Test 1: Describe Table
  console.log('Test 1: Checking if table exists and is accessible...');
  try {
    const command = new DescribeTableCommand({ TableName: TABLE_NAME });
    const response = await client.send(command);

    console.log('✓ Table found!');
    console.log(`  Status: ${response.Table.TableStatus}`);
    console.log(`  Primary Key:`);
    response.Table.KeySchema.forEach(key => {
      const attr = response.Table.AttributeDefinitions.find(a => a.AttributeName === key.AttributeName);
      console.log(`    - ${key.AttributeName} (${attr?.AttributeType}) [${key.KeyType === 'HASH' ? 'Partition Key' : 'Sort Key'}]`);
    });

    // Check if schema is correct
    const hasUrlKey = response.Table.KeySchema.some(
      key => key.AttributeName === 'url' && key.KeyType === 'HASH'
    );

    if (!hasUrlKey) {
      console.log('\n✗ ERROR: Table does NOT have "url" as partition key!');
      console.log('  Expected: url (String) as Partition Key');
      console.log('  Fix: Delete table and recreate with correct schema\n');
      process.exit(1);
    }

    console.log('✓ Schema is correct (url as partition key)\n');

  } catch (error) {
    console.log('✗ Failed to access table');
    console.log(`  Error: ${error.message}`);
    console.log(`  Code: ${error.name}\n`);

    if (error.name === 'ResourceNotFoundException') {
      console.log('Possible causes:');
      console.log('  1. Table name is wrong');
      console.log('  2. Table is in a different region');
      console.log('  3. Table does not exist\n');
    } else if (error.name === 'AccessDeniedException') {
      console.log('Possible causes:');
      console.log('  1. IAM user lacks dynamodb:DescribeTable permission');
      console.log('  2. Wrong AWS credentials\n');
    }

    return false;
  }

  // Test 2: Write Test Item
  console.log('Test 2: Writing test item...');
  try {
    const testItem = {
      url: 'https://test-' + Date.now() + '.com',
      userId: 'test-user-' + Date.now(),
      sessionId: 'test-session-' + Date.now(),
      savedBy: ['test-user'],
      frames: [],
      steps: {},
      title: 'Test Tutorial',
      style: 'explain5',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: testItem,
    });

    await docClient.send(putCommand);
    console.log('✓ Test item written successfully');
    console.log(`  Test URL: ${testItem.url}\n`);

    // Test 3: Read Test Item
    console.log('Test 3: Reading test item back...');
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { url: testItem.url },
    });

    const getResponse = await docClient.send(getCommand);

    if (getResponse.Item) {
      console.log('✓ Test item read successfully');
      console.log(`  Retrieved URL: ${getResponse.Item.url}`);
      console.log(`  Retrieved userId: ${getResponse.Item.userId}\n`);
    } else {
      console.log('✗ Test item not found after writing\n');
      return false;
    }

    console.log('='.repeat(60));
    console.log('✓ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('Your DynamoDB table is configured correctly.');
    console.log('The save functionality should work now.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your Next.js dev server (npm run dev)');
    console.log('  2. Generate a tutorial');
    console.log('  3. Click "Save Tutorial"');
    console.log('');
    console.log('Note: You can delete the test item from AWS Console if desired.');
    console.log(`Test item URL: ${testItem.url}`);
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.log('✗ Failed to write/read test item');
    console.log(`  Error: ${error.message}`);
    console.log(`  Code: ${error.name}\n`);

    if (error.name === 'AccessDeniedException') {
      console.log('Possible causes:');
      console.log('  1. IAM user lacks dynamodb:PutItem permission');
      console.log('  2. IAM user lacks dynamodb:GetItem permission\n');
    }

    return false;
  }
}

testTableAccess().then(success => {
  process.exit(success ? 0 : 1);
});
