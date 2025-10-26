# DynamoDB Table Setup Instructions

Your IAM user doesn't have permissions to create/modify DynamoDB tables. Follow these steps to set up the table manually through AWS Console.

## Option 1: Quick Fix - Use AWS Console

### Step 1: Open AWS DynamoDB Console

1. Go to https://console.aws.amazon.com/dynamodb
2. Make sure you're in the **us-east-2** region (check top-right corner)

### Step 2: Check Existing Table

1. Click "Tables" in the left sidebar
2. Look for `tutorialize-storyboards` table

#### If table exists:

1. Click on the table name
2. Go to "Overview" tab
3. Scroll down to "Table details"
4. Check the "Partition key" - it should show **"url"**

**If Partition key is NOT "url":**
- The table has the old schema and needs to be recreated
- Click "Delete table" button (top right)
- Type the table name to confirm deletion
- Wait 1-2 minutes for deletion to complete
- Continue to Step 3

**If Partition key IS "url":**
- ✅ Your table is correct! No changes needed.
- Skip to "Troubleshooting" section below

### Step 3: Create New Table

1. Click "Create table" button
2. Fill in the form:

   **Table name:** `tutorialize-storyboards`

   **Partition key:** `url` (Type: String)

   **Sort key:** Leave empty (do NOT add a sort key)

   **Table settings:** Choose "Customize settings"

   **Table class:** DynamoDB Standard

   **Capacity mode:** On-demand

   **Encryption:** Use AWS owned key (default)

3. Click "Create table" button
4. Wait 1-2 minutes for table to become Active

### Step 4: Verify Users Table

1. Check if `tutorialize-users` table exists
2. If it exists with `userId` as partition key, you're good
3. If it doesn't exist, create it:

   **Table name:** `tutorialize-users`

   **Partition key:** `userId` (Type: String)

   **Settings:** Same as above (On-demand, AWS owned key)

### Step 5: Test the Save Functionality

1. Go back to your app: http://localhost:3000
2. Generate a tutorial for any URL
3. Click "Save Tutorial"
4. Should now save successfully!

---

## Option 2: Grant IAM Permissions (For Future Scripts)

If you want to run automated scripts, your IAM user needs these permissions:

### Required IAM Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:DeleteTable",
        "dynamodb:ListTables",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:344957165162:table/tutorialize-*"
      ]
    }
  ]
}
```

### How to Add Policy:

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam
2. Click "Users" → Find user "tutorial"
3. Click "Add permissions" → "Attach policies directly"
4. Click "Create policy"
5. Switch to JSON tab
6. Paste the policy above
7. Name it: `TutorialMaker-DynamoDB-Access`
8. Attach to your user

---

## Troubleshooting

### Error: "ResourceNotFoundException"

**Cause:** Table doesn't exist or has wrong name

**Fix:**
- Double-check table name is exactly: `tutorialize-storyboards`
- Make sure it's in `us-east-2` region
- Verify `.env` has: `AWS_DYNAMODB_STORYBOARDS_TABLE=tutorialize-storyboards`

### Error: "AccessDeniedException"

**Cause:** IAM user lacks permissions

**Fix:**
- Create table manually through console (Option 1 above)
- OR grant IAM permissions (Option 2 above)

### Error: "ValidationException: One or more parameter values were invalid"

**Cause:** Table has wrong schema (old userId+sessionId keys)

**Fix:**
- Delete the old table
- Recreate with `url` as the only key (no sort key)

### Save button says "Saved!" but data not in DynamoDB

**Possible causes:**
1. Table schema is wrong (check partition key is `url`)
2. Wrong table name in `.env`
3. IAM user lacks write permissions

**Debug:**
- Check browser console for errors
- Check server logs: `npm run dev` output
- Try querying table in AWS Console

### Multiple users save same URL but creates duplicates

**Cause:** Code logic issue

**Fix:**
- Make sure you're using the updated code from this session
- The `saveStoryboard` function should check `getStoryboardByUrl` first

---

## Quick Verification

After creating the table, you can test if it's working:

1. **Create a simple test:**

```bash
# In your project directory
node -e "
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config({ path: '.env' });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  const command = new PutCommand({
    TableName: 'tutorialize-storyboards',
    Item: {
      url: 'https://test.com',
      userId: 'test-user',
      sessionId: 'test-123',
      savedBy: ['test-user'],
      frames: [],
      steps: {},
      title: 'Test',
      style: 'explain5',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  });

  try {
    await docClient.send(command);
    console.log('✓ Test write successful!');
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  }
})();
"
```

2. If successful, go to AWS Console and verify the test item was created
3. Delete the test item from the console

---

## Table Schema Reference

### tutorialize-storyboards

**Primary Key:**
- Partition Key: `url` (String)

**Attributes:**
- `userId` (String) - Creator of tutorial
- `sessionId` (String) - Session ID from creation
- `savedBy` (List) - Array of userIds who saved this
- `frames` (List) - Frame data with images/audio/text
- `steps` (Map) - Storyboard steps object
- `title` (String)
- `style` (String)
- `voiceId` (String)
- `createdAt` (Number)
- `updatedAt` (Number)

**Important Notes:**
- NO sort key
- Uses `url` as unique identifier to prevent duplicates
- Multiple users can save same URL (added to `savedBy` array)

---

## Need Help?

If you're still having issues:
1. Check all table names match in `.env`
2. Verify AWS region is `us-east-2`
3. Make sure IAM user has at least read/write permissions for DynamoDB
4. Check server logs for detailed error messages
