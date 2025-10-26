#!/usr/bin/env node

/**
 * Simple script to test DynamoDB connection and check table schema
 * Requires only read permissions
 */

require('dotenv').config({ path: '.env' });
const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testConnection() {
  console.log('Testing DynamoDB connection...\n');
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-2'}`);
  console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 8)}...`);
  console.log('');

  try {
    const command = new ListTablesCommand({});
    const response = await client.send(command);

    console.log('✓ Connection successful!');
    console.log(`\nFound ${response.TableNames.length} tables in this region:\n`);

    response.TableNames.forEach((tableName, index) => {
      const isStoryboards = tableName === process.env.AWS_DYNAMODB_STORYBOARDS_TABLE;
      const isUsers = tableName === process.env.AWS_DYNAMODB_USERS_TABLE;

      const marker = isStoryboards || isUsers ? '  ✓ ' : '  - ';
      console.log(`${marker}${tableName}${isStoryboards ? ' (STORYBOARDS TABLE)' : ''}${isUsers ? ' (USERS TABLE)' : ''}`);
    });

    console.log('');

    // Check if required tables exist
    const storyboardsTable = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE || 'tutorialize-storyboards';
    const usersTable = process.env.AWS_DYNAMODB_USERS_TABLE || 'tutorialize-users';

    const hasStoryboards = response.TableNames.includes(storyboardsTable);
    const hasUsers = response.TableNames.includes(usersTable);

    if (!hasStoryboards) {
      console.log(`⚠️  MISSING: Table "${storyboardsTable}" not found!`);
      console.log('   You need to create this table. See DYNAMODB_SETUP_INSTRUCTIONS.md\n');
    }

    if (!hasUsers) {
      console.log(`⚠️  MISSING: Table "${usersTable}" not found!`);
      console.log('   You need to create this table. See DYNAMODB_SETUP_INSTRUCTIONS.md\n');
    }

    if (hasStoryboards && hasUsers) {
      console.log('✓ All required tables exist!');
      console.log('\nNote: This script cannot verify table schema (requires DescribeTable permission).');
      console.log('To verify schema, check AWS Console or see DYNAMODB_SETUP_INSTRUCTIONS.md\n');
    }

  } catch (error) {
    console.error('✗ Connection failed!');
    console.error('\nError:', error.message);
    console.error('\nPossible causes:');
    console.error('  1. Wrong AWS credentials');
    console.error('  2. Wrong region');
    console.error('  3. IAM user lacks dynamodb:ListTables permission');
    console.error('\nSolution: Create tables manually through AWS Console');
    console.error('See DYNAMODB_SETUP_INSTRUCTIONS.md for detailed steps\n');
    process.exit(1);
  }
}

testConnection();
