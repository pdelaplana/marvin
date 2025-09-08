# Local Development Setup Guide

## Overview
This guide explains how to set up and run the MVP waitlist backend locally for development and testing.

## Prerequisites

### Required Software
- **Node.js** (version 18 or higher)
- **Docker Desktop** (for local Supabase stack)
- **Git** (for version control)
- **Code editor** (VS Code recommended)

### Installation Verification
```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version

# Check Docker is running
docker --version
docker ps  # Should not error

# Check Git
git --version
```

## Initial Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository (or navigate to existing project)
cd your-project-directory

# Install dependencies (includes Supabase CLI)
npm install

# Verify Supabase CLI installation
npx supabase --version
```

### Step 2: Initialize Supabase (if not already done)

```bash
# If starting fresh, initialize Supabase
npx supabase init

# This creates the supabase/ directory structure
```

### Step 3: Start Local Development Environment

```bash
# Start all Supabase services (database, API, dashboard, etc.)
npx supabase start

# This will:
# - Download and start Docker containers
# - Set up PostgreSQL database
# - Start Edge Function runtime
# - Launch local Supabase dashboard
```

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

### Step 4: Apply Database Migrations

```bash
# Apply the database schema
npx supabase db reset

# This will:
# - Create applications table
# - Create waitlist_entries table
# - Apply all constraints and indexes
```

## Development Workflow

### Starting Development Session

```bash
# 1. Start Supabase services
npx supabase start

# 2. Start Edge Function development server (in separate terminal)
npx supabase functions serve join-waitlist --debug

# 3. Open Supabase Studio for database management
# Navigate to: http://127.0.0.1:54323
```

### Key Local URLs

- **API Endpoint**: `http://127.0.0.1:54321/functions/v1/join-waitlist`
- **Supabase Studio**: `http://127.0.0.1:54323` (database management)
- **API Documentation**: `http://127.0.0.1:54321` (auto-generated docs)
- **Email Testing**: `http://127.0.0.1:54324` (Inbucket - catches emails)

### Local Configuration

Your local development uses these default values:

```javascript
const LOCAL_CONFIG = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  APPLICATION_ID: '48bc5a4b-f8e4-4c4e-8832-1a766715641e' // Created during setup
};
```

## Database Management

### Using Supabase Studio (Recommended)

1. **Open Studio**: Navigate to `http://127.0.0.1:54323`
2. **Browse Tables**: Go to "Table Editor"
3. **Run Queries**: Use "SQL Editor"
4. **View Logs**: Check "Logs" section

### Using SQL Commands

```bash
# Connect to database directly
npx supabase db connect

# Or run SQL files
npx supabase db query < your-query.sql
```

### Creating Test Data

```sql
-- Insert a test application (if not exists)
INSERT INTO applications (application_id, application_name) 
VALUES ('48bc5a4b-f8e4-4c4e-8832-1a766715641e', 'Test Application')
ON CONFLICT (application_id) DO NOTHING;

-- Insert test waitlist entries
INSERT INTO waitlist_entries (application_id, email, source_url, country)
VALUES 
  ('48bc5a4b-f8e4-4c4e-8832-1a766715641e', 'test1@example.com', 'http://localhost:3000', 'US'),
  ('48bc5a4b-f8e4-4c4e-8832-1a766715641e', 'test2@example.com', 'http://localhost:3000/signup', 'CA');
```

## Testing Your Setup

### Test 1: API Health Check

```bash
curl http://127.0.0.1:54321/functions/v1/join-waitlist
```

Expected: Health check response or function info

### Test 2: Valid Signup Request

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{
    "applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e",
    "email": "developer-test@example.com",
    "sourceUrl": "http://localhost:3000",
    "country": "US"
  }'
```

Expected response:
```json
{"success":true,"id":"[uuid]","message":"Successfully joined waitlist"}
```

### Test 3: Frontend Integration

Open `test-form.html` in your browser:
```bash
# Open the test form (adjust path as needed)
open test-form.html  # macOS
start test-form.html # Windows
```

Fill out the form and verify it works with your local API.

### Test 4: Database Verification

1. Go to `http://127.0.0.1:54323`
2. Navigate to "Table Editor" → "waitlist_entries"
3. Verify your test entries appear

## Development Best Practices

### Code Changes

1. **Edge Function Changes**:
   - Edit `supabase/functions/join-waitlist/index.ts`
   - Function server auto-reloads on file changes
   - Check terminal for compilation errors

2. **Database Changes**:
   - Create new migration files: `npx supabase db diff -f new_migration`
   - Apply changes: `npx supabase db reset`
   - Never edit existing migration files

3. **Testing Changes**:
   - Always test locally before committing
   - Use the curl commands or test form
   - Check database state after changes

### Common Development Commands

```bash
# View Supabase status
npx supabase status

# Reset database (applies all migrations)
npx supabase db reset

# View function logs
npx supabase functions serve join-waitlist --debug

# Stop all services
npx supabase stop

# Generate TypeScript types from database
npx supabase gen types typescript --local > types/supabase.ts
```

## Troubleshooting

### Common Issues

**1. "Docker not running" error**
```bash
# Start Docker Desktop
# Then retry: npx supabase start
```

**2. "Port already in use" error**
```bash
# Stop existing services
npx supabase stop

# Kill any lingering processes
docker ps
docker stop [container-ids]

# Restart
npx supabase start
```

**3. "Migration failed" error**
```bash
# Check migration syntax
cat supabase/migrations/*.sql

# Reset and try again
npx supabase db reset
```

**4. "Function compilation error"**
```bash
# Check TypeScript errors in terminal
# Common issues:
# - Missing imports
# - Syntax errors
# - Type mismatches
```

**5. "Database connection refused"**
```bash
# Verify Supabase is running
npx supabase status

# Check Docker containers
docker ps | grep supabase
```

### Debug Mode

Enable detailed logging:
```bash
# Start with debug logging
npx supabase start --debug

# Function server with debug
npx supabase functions serve join-waitlist --debug
```

### Viewing Logs

```bash
# Function logs
npx supabase functions logs join-waitlist

# Database logs
npx supabase logs db

# All logs
npx supabase logs
```

## Environment Variables

For local development, create a `.env.local` file:

```bash
# .env.local (for your frontend)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
NEXT_PUBLIC_APPLICATION_ID=48bc5a4b-f8e4-4c4e-8832-1a766715641e
```

## Stopping Development

```bash
# Stop all Supabase services
npx supabase stop

# This preserves your data in Docker volumes
# Data will be restored when you run 'supabase start' again
```

## Data Persistence

Your local development data is stored in Docker volumes:
```bash
# View volumes
docker volume ls --filter label=com.supabase.cli.project=marvin

# Remove all data (fresh start)
npx supabase db reset
```

## IDE Setup (VS Code)

Recommended VS Code extensions:
- PostgreSQL (for database queries)
- Thunder Client (for API testing)
- GitLens (for Git integration)
- TypeScript and JavaScript Language Features

## Next Steps

After setting up local development:
1. Run through all the test cases in `testing-steps.md`
2. Try the frontend integration with `test-form.html`
3. Run some analytics queries from `analytics-queries.sql`
4. Make small changes to test the development workflow

## Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review Supabase CLI documentation: https://supabase.com/docs/guides/cli
3. Check Docker Desktop status and logs
4. Ensure all prerequisites are properly installed