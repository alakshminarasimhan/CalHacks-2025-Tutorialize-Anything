#!/usr/bin/env node

/**
 * Script to create DynamoDB tables with the correct schema
 *
 * This script will:
 * 1. Check if the old table exists and offer to delete it
 * 2. Create a new table with url as the primary key
 * 3. Create the users table if it doesn't exist
 *
 * Run with: node setup-dynamodb-table.js
 */

require('dotenv').config({ path: '.env' });
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  DeleteTableCommand,
  ListTablesCommand
} = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const STORYBOARDS_TABLE = process.env.AWS_DYNAMODB_STORYBOARDS_TABLE || 'Calhacks-Skywalkr';
const USERS_TABLE = process.env.AWS_DYNAMODB_USERS_TABLE || 'tutorialize-users';

async function tableExists(tableName) {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function deleteTable(tableName) {
  console.log(`Deleting table: ${tableName}...`);
  const command = new DeleteTableCommand({ TableName: tableName });
  await client.send(command);
  console.log(`✓ Table ${tableName} deleted`);

  // Wait for table to be deleted
  console.log('Waiting for table to be fully deleted...');
  await new Promise(resolve => setTimeout(resolve, 10000));
}

async function createStoryboardsTable() {
  console.log(`\nCreating storyboards table: ${STORYBOARDS_TABLE}`);
  console.log('Schema:');
  console.log('  - Partition Key: url (String)');
  console.log('  - Attributes: userId, sessionId, savedBy (array), frames, steps, etc.');

  const command = new CreateTableCommand({
    TableName: STORYBOARDS_TABLE,
    KeySchema: [
      { AttributeName: 'url', KeyType: 'HASH' },  // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'url', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',  // On-demand pricing (simpler, no capacity planning)
    Tags: [
      { Key: 'Project', Value: 'TutorialMaker' },
      { Key: 'Environment', Value: 'Development' },
    ],
  });

  try {
    const response = await client.send(command);
    console.log(`✓ Table ${STORYBOARDS_TABLE} created successfully!`);
    console.log(`  Status: ${response.TableDescription.TableStatus}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create table:`, error.message);
    return false;
  }
}

async function createUsersTable() {
  console.log(`\nCreating users table: ${USERS_TABLE}`);
  console.log('Schema:');
  console.log('  - Partition Key: userId (String)');

  const command = new CreateTableCommand({
    TableName: USERS_TABLE,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },  // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    Tags: [
      { Key: 'Project', Value: 'TutorialMaker' },
      { Key: 'Environment', Value: 'Development' },
    ],
  });

  try {
    const response = await client.send(command);
    console.log(`✓ Table ${USERS_TABLE} created successfully!`);
    console.log(`  Status: ${response.TableDescription.TableStatus}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create table:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('DynamoDB Table Setup for Tutorial Maker');
  console.log('='.repeat(60));
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-2'}`);
  console.log(`Storyboards Table: ${STORYBOARDS_TABLE}`);
  console.log(`Users Table: ${USERS_TABLE}`);
  console.log('='.repeat(60));

  try {
    // Check if storyboards table exists
    const storyboardsExists = await tableExists(STORYBOARDS_TABLE);

    if (storyboardsExists) {
      console.log(`\n⚠️  Table ${STORYBOARDS_TABLE} already exists!`);
      console.log('\nOptions:');
      console.log('1. Delete and recreate (will lose all data)');
      console.log('2. Keep existing table (may have wrong schema)');
      console.log('3. Exit');

      // For automation, let's check the table structure
      const describeCommand = new DescribeTableCommand({ TableName: STORYBOARDS_TABLE });
      const tableInfo = await client.send(describeCommand);
      const keySchema = tableInfo.Table.KeySchema;

      console.log('\nCurrent table key schema:');
      keySchema.forEach(key => {
        console.log(`  - ${key.AttributeName} (${key.KeyType === 'HASH' ? 'Partition Key' : 'Sort Key'})`);
      });

      const hasUrlKey = keySchema.some(key => key.AttributeName === 'url' && key.KeyType === 'HASH');

      if (hasUrlKey) {
        console.log('\n✓ Table already has correct schema (url as partition key)!');
        console.log('No changes needed.');
      } else {
        console.log('\n✗ Table has WRONG schema!');
        console.log('Expected: url (Partition Key)');
        console.log('\n⚠️  YOU NEED TO DELETE AND RECREATE THIS TABLE');
        console.log('\nTo delete and recreate, run:');
        console.log(`  node setup-dynamodb-table.js --force-recreate`);
      }
    } else {
      console.log(`\nTable ${STORYBOARDS_TABLE} does not exist. Creating...`);
      await createStoryboardsTable();
    }

    // Check users table
    const usersExists = await tableExists(USERS_TABLE);
    if (!usersExists) {
      console.log(`\nTable ${USERS_TABLE} does not exist. Creating...`);
      await createUsersTable();
    } else {
      console.log(`\n✓ Table ${USERS_TABLE} already exists`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Setup complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

// Check for --force-recreate flag
const forceRecreate = process.argv.includes('--force-recreate');

if (forceRecreate) {
  (async () => {
    console.log('='.repeat(60));
    console.log('FORCE RECREATE MODE - DELETING EXISTING TABLE');
    console.log('='.repeat(60));

    try {
      const storyboardsExists = await tableExists(STORYBOARDS_TABLE);
      if (storyboardsExists) {
        await deleteTable(STORYBOARDS_TABLE);
      }

      await createStoryboardsTable();

      const usersExists = await tableExists(USERS_TABLE);
      if (!usersExists) {
        await createUsersTable();
      }

      console.log('\n✓ Tables recreated successfully!');
      console.log('\nNote: Wait 30-60 seconds before using the tables.');
    } catch (error) {
      console.error('✗ Error:', error);
      process.exit(1);
    }
  })();
} else {
  main();
}
