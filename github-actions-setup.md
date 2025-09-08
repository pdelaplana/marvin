# GitHub Actions CI/CD Setup Guide

## Overview
This guide explains how to configure GitHub Actions for automated deployment of the waitlist backend to Supabase.

## Prerequisites
- GitHub repository created and code pushed
- Supabase project created and running
- Local development working successfully

## Required Secrets Configuration

### Step 1: Get Supabase Project Information

1. **Get Project ID**:
   - Go to your Supabase Dashboard: https://supabase.com/dashboard
   - Select your project
   - Go to Settings → General
   - Copy the "Reference ID" (this is your `SUPABASE_PROJECT_ID`)

2. **Get Database Password**:
   - In the same project, go to Settings → Database
   - Copy the database password (you set this when creating the project)
   - If you forgot it, you can reset it from the Database settings page

3. **Generate Access Token**:
   - Go to Supabase Dashboard
   - Click on your profile (top-right corner)
   - Go to "Access Tokens"
   - Click "Generate New Token"
   - Give it a name like "GitHub Actions Deployment"
   - Copy the generated token (this is your `SUPABASE_ACCESS_TOKEN`)

### Step 2: Configure GitHub Secrets

1. **Navigate to Repository Secrets**:
   - Go to your GitHub repository
   - Click "Settings" tab
   - Go to "Secrets and variables" → "Actions"

2. **Add Required Secrets**:
   Click "New repository secret" and add:

   **Secret 1:**
   - Name: `SUPABASE_PROJECT_ID`
   - Value: [Your project reference ID from Step 1]

   **Secret 2:**
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: [Your access token from Step 1]

   **Secret 3:**
   - Name: `SUPABASE_DB_PASSWORD`
   - Value: [Your database password from Supabase Dashboard → Settings → Database]

## Workflow Configuration

The workflow file (`.github/workflows/deploy.yml`) includes:

### Features
- **Automatic Deployment**: Deploys on push to `main` branch
- **Pull Request Testing**: Runs tests on PR creation
- **Database Migrations**: Automatically applies schema changes
- **Edge Function Deployment**: Deploys the join-waitlist function
- **Local Testing**: Tests functions in CI environment

### Workflow Jobs

#### 1. Deploy Job (main branch only)
- Links to Supabase project
- Runs database migrations (`supabase db push`)
- Deploys Edge Functions (`supabase functions deploy`)
- Verifies deployment success

#### 2. Test Job (pull requests only)
- Sets up local Supabase environment
- Runs database migrations locally
- Tests Edge Function compilation and basic functionality
- Cleans up resources

## Deployment Process

### Automatic Deployment (Push to main)
1. Push code to `main` branch
2. GitHub Actions automatically triggers
3. Workflow runs database migrations
4. Deploys Edge Functions to production
5. Provides deployment confirmation

### Manual Deployment (workflow_dispatch)
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Deploy to Supabase" workflow
4. Click "Run workflow" button
5. Configure deployment options:
   - **Environment**: Choose production or staging
   - **Deploy Edge Functions**: Enable/disable function deployment
   - **Run Database Migrations**: Enable/disable database updates
6. Click "Run workflow" to start deployment

### Manual Deployment (if needed)
```bash
# Link to production project
supabase link --project-ref [YOUR_PROJECT_ID]

# Deploy database changes
supabase db push

# Deploy functions
supabase functions deploy join-waitlist

# Verify deployment
supabase projects list
```

## Environment Variables in Workflow

The workflow uses these environment variables:
```yaml
env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

## Testing the CI/CD Pipeline

### Test Pull Request Flow
1. Create a feature branch: `git checkout -b test-deployment`
2. Make a small change (e.g., add comment to Edge Function)
3. Push branch: `git push origin test-deployment`
4. Create Pull Request on GitHub
5. Verify "Test" job runs and passes

### Test Production Deployment
1. Merge PR to main branch
2. Verify "Deploy" job runs automatically
3. Check Supabase Dashboard for deployed changes
4. Test production endpoint with curl

## Monitoring Deployments

### GitHub Actions Dashboard
- Go to "Actions" tab in your repository
- View workflow runs and their status
- Check logs for any deployment errors

### Supabase Dashboard
- Functions → join-waitlist (verify latest deployment)
- Database → Schema (verify migrations applied)
- Logs → Edge Functions (monitor runtime logs)

## Production Verification Commands

After deployment, verify everything works:

```bash
# Test production endpoint (replace with your project URL)
curl -X POST https://[your-project].supabase.co/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e",
    "email": "production-test@example.com",
    "sourceUrl": "https://your-site.com",
    "country": "US"
  }'

# Expected response
# {"success":true,"id":"[uuid]","message":"Successfully joined waitlist"}
```

## Troubleshooting

### Common Issues

**1. Secret Configuration Errors**
```
Error: Invalid credentials
```
- Verify `SUPABASE_ACCESS_TOKEN` is correct
- Check `SUPABASE_PROJECT_ID` matches your project

**2. Database Migration Failures**
```
Error: Migration failed
```
- Check if local schema differs from production
- Verify migration SQL syntax
- Run `supabase db reset` locally first

**3. Function Deployment Errors**
```
Error: Function deployment failed
```
- Check TypeScript compilation errors
- Verify function imports and dependencies
- Test function locally before deployment

**4. Workflow Permission Errors**
```
Error: Workflow run failed due to permissions
```
- Check repository has Actions enabled
- Verify secrets are accessible to workflow

### Debugging Steps

1. **Check Workflow Logs**:
   - Go to Actions tab → Failed workflow
   - Click on failed step to see detailed logs

2. **Verify Secrets**:
   - Go to Repository Settings → Secrets
   - Ensure both secrets are present (values are hidden)

3. **Test Locally First**:
   ```bash
   # Ensure local deployment works
   supabase link --project-ref [PROJECT_ID]
   supabase db push
   supabase functions deploy join-waitlist
   ```

4. **Check Supabase Dashboard**:
   - Verify project is accessible
   - Check recent activity logs
   - Confirm database schema is correct

## Security Best Practices

- Never commit secrets to repository
- Use repository secrets (not environment secrets)
- Regularly rotate access tokens
- Monitor deployment logs for sensitive data
- Use minimal permissions for access tokens

## Next Steps After Setup

1. Test the complete pipeline with a real deployment
2. Set up monitoring and alerting for failed deployments
3. Configure branch protection rules
4. Add automated tests for Edge Functions
5. Consider staging environment for additional testing

## Workflow File Location

The complete workflow is saved as: `.github/workflows/deploy.yml`

Review and customize the workflow based on your specific needs before using in production.