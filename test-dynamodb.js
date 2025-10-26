// Test script to verify DynamoDB connection and table existence
require('dotenv').config({ path: '.env.local' });
const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function testDynamoDB() {
  console.log('\n=== Testing DynamoDB Connection ===');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Table Name:', process.env.AWS_DYNAMODB_STORYBOARDS_TABLE);
  console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...');

  try {
    // Test 1: List all tables
    console.log('\n--- Test 1: Listing all tables ---');
    const listCommand = new ListTablesCommand({});
    const listResponse = await client.send(listCommand);
    console.log('Available tables:', listResponse.TableNames);

    // Test 2: Describe the specific table
    const tableName = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE || 'Calhacks-Skywalkr';
    console.log('\n--- Test 2: Describing table:', tableName, '---');
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    const describeResponse = await client.send(describeCommand);
    console.log('Table status:', describeResponse.Table.TableStatus);
    console.log('Partition key:', describeResponse.Table.KeySchema);
    console.log('Attributes:', describeResponse.Table.AttributeDefinitions);

    console.log('\n✅ SUCCESS: DynamoDB connection is working!');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Error type:', error.name);
    if (error.name === 'ResourceNotFoundException') {
      console.error('\nThe table does not exist or the IAM user does not have permission to access it.');
      console.error('Please check:');
      console.error('1. The table name is correct');
      console.error('2. The table exists in the region:', process.env.AWS_REGION);
      console.error('3. The IAM user has DynamoDB permissions');
    }
  }
}

testDynamoDB();
