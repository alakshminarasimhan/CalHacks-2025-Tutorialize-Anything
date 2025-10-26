# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for Tutorial Maker.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: tutorial-maker (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup to complete (~2 minutes)

## Step 2: Get API Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (long string)
3. Add them to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your_key_here
```

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the following SQL:

```sql
-- User preferences table
create table user_preferences (
  user_id uuid references auth.users(id) primary key,
  preferred_style text default 'explain5',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Saved tutorials table
create table saved_tutorials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  session_id text not null,
  title text,
  url text not null,
  style text not null,
  frames jsonb not null,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_saved_tutorials_user_id on saved_tutorials(user_id);
create index idx_saved_tutorials_created_at on saved_tutorials(created_at desc);

-- Row Level Security (RLS)
alter table user_preferences enable row level security;
alter table saved_tutorials enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own preferences" on user_preferences
  for select using (auth.uid() = user_id);
create policy "Users can update own preferences" on user_preferences
  for update using (auth.uid() = user_id);
create policy "Users can insert own preferences" on user_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can view own tutorials" on saved_tutorials
  for select using (auth.uid() = user_id);
create policy "Users can insert own tutorials" on saved_tutorials
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own tutorials" on saved_tutorials
  for delete using (auth.uid() = user_id);
```

4. Click "Run" to execute the SQL
5. Verify tables were created by going to **Table Editor** and checking for `user_preferences` and `saved_tutorials`

## Step 4: Configure Authentication

### Email/Password (Default)

1. Go to **Authentication** > **Providers**
2. **Email** should be enabled by default
3. Configure email settings:
   - **Confirm email**: Toggle ON if you want email verification (recommended for production)
   - **Disable signup**: Keep OFF to allow new users
   - **Secure email change**: Toggle ON (recommended)

### Optional: Google OAuth

1. In **Authentication** > **Providers**, click **Google**
2. Toggle "Enable Sign in with Google"
3. You'll need:
   - **Client ID** from Google Cloud Console
   - **Client Secret** from Google Cloud Console
4. Follow [Supabase Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Optional: GitHub OAuth

1. In **Authentication** > **Providers**, click **GitHub**
2. Toggle "Enable Sign in with GitHub"
3. You'll need:
   - **Client ID** from GitHub OAuth Apps
   - **Client Secret** from GitHub OAuth Apps
4. Follow [Supabase GitHub OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-github)

## Step 5: Configure Email Templates (Optional)

1. Go to **Authentication** > **Email Templates**
2. Customize templates for:
   - **Confirm signup**: Email sent to verify new accounts
   - **Magic Link**: Passwordless login email
   - **Reset password**: Password reset email
   - **Change Email Address**: Email change confirmation

## Step 6: Test Your Setup

1. Make sure you've installed dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

2. Start your development server:
   ```bash
   npm run dev
   ```

3. Navigate to `http://localhost:3000`
4. You should see the login page
5. Try signing up with an email/password
6. If email confirmation is enabled, check your inbox
7. Login and verify you can access the homepage

## Step 7: Verify Database Access

1. Create a test tutorial and click "Save Tutorial"
2. Go to your dashboard
3. Verify the tutorial appears in your saved list
4. In Supabase dashboard, go to **Table Editor** > **saved_tutorials**
5. You should see your saved tutorial record

## Troubleshooting

### "Invalid API key" error
- Double-check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Make sure there are no extra spaces or quotes
- Restart your dev server after updating `.env.local`

### "Permission denied" when saving tutorials
- Verify Row Level Security policies were created correctly
- Check the SQL Editor for any errors when running the schema
- Try re-running the policy creation SQL

### Email confirmation not working
- Check **Authentication** > **Email Templates** for correct SMTP settings
- For development, you can disable email confirmation in **Authentication** > **Providers** > **Email**

### "Failed to fetch" errors
- Verify your Supabase project is running (check dashboard)
- Check browser console for CORS errors
- Ensure your project URL is correct

## Production Considerations

1. **Email Confirmation**: Enable in production to prevent spam accounts
2. **Rate Limiting**: Configure in Supabase dashboard under **Settings** > **API**
3. **Custom Domain**: Set up custom domain for auth emails (looks more professional)
4. **Backup**: Enable automatic backups in **Settings** > **Database**
5. **Monitoring**: Set up error notifications in **Settings** > **Notifications**

## Migration from Echo

If you previously used Echo authentication:

1. Remove Echo SDK:
   ```bash
   npm uninstall @merit-systems/echo-react-sdk
   ```

2. Remove Echo env vars from `.env.local`:
   ```
   NEXT_PUBLIC_ECHO_API_URL
   NEXT_PUBLIC_ECHO_APP_ID
   ```

3. All user accounts will need to be recreated with Supabase
4. Existing tutorial sessions (in-memory) will be lost on migration
