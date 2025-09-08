# Production Deployment Guide

## Overview
This guide covers deploying the MVP waitlist backend to production and verifying it works correctly.

## Pre-Deployment Checklist

### Local Development Verification
- [ ] Local Supabase stack running without errors
- [ ] Database migrations applied successfully
- [ ] Edge Function tested and working locally
- [ ] Test data created (1 application, sample waitlist entries)
- [ ] Analytics queries functional
- [ ] Frontend integration tested with test form

### Production Environment Setup
- [ ] Supabase production project created
- [ ] Project URL and anon key obtained
- [ ] Database properly configured
- [ ] CORS settings configured for your domains

## Step-by-Step Deployment

### Step 1: Prepare Production Database

1. **Link to Production Project**:
```bash
supabase link --project-ref [YOUR_PRODUCTION_PROJECT_ID]
```

2. **Deploy Database Schema**:
```bash
supabase db push
```

3. **Verify Database Structure**:
   - Open Supabase Dashboard → Database → Tables
   - Confirm `applications` and `waitlist_entries` tables exist
   - Verify indexes and constraints are in place

### Step 2: Deploy Edge Functions

1. **Deploy join-waitlist Function**:
```bash
supabase functions deploy join-waitlist
```

2. **Verify Function Deployment**:
   - Supabase Dashboard → Edge Functions
   - Confirm `join-waitlist` function is listed and active

### Step 3: Create Production Application Record

1. **Using Supabase Dashboard**:
   - Go to Database → Table Editor
   - Select `applications` table
   - Click "Insert row"
   - Add your production application:
     ```sql
     application_name: "Your App Name"
     ```
   - Copy the generated `application_id` for frontend use

2. **Using SQL Editor** (alternative):
```sql
INSERT INTO applications (application_name) 
VALUES ('Your Production App Name')
RETURNING application_id;
```

### Step 4: Test Production Deployment

1. **Test Valid Request**:
```bash
curl -X POST https://[your-project].supabase.co/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "applicationId": "[your-production-app-id]",
    "email": "test@example.com",
    "sourceUrl": "https://yoursite.com",
    "country": "US"
  }'
```

Expected response:
```json
{"success":true,"id":"[uuid]","message":"Successfully joined waitlist"}
```

2. **Test Duplicate Prevention**:
Run the same curl command again. Expected response:
```json
{"success":false,"message":"Email already registered"}
```

3. **Test Invalid Application ID**:
```bash
curl -X POST https://[your-project].supabase.co/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "applicationId": "invalid-id",
    "email": "test2@example.com",
    "sourceUrl": "https://yoursite.com",
    "country": "US"
  }'
```

Expected response:
```json
{"success":false,"message":"Invalid application ID"}
```

### Step 5: Configure Frontend for Production

Update your frontend configuration:

```javascript
const WAITLIST_CONFIG = {
  SUPABASE_URL: 'https://[your-project].supabase.co',
  SUPABASE_ANON_KEY: '[your-production-anon-key]',
  APPLICATION_ID: '[your-production-application-id]'
};
```

Or using environment variables:
```bash
REACT_APP_SUPABASE_URL=https://[your-project].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-production-anon-key]
REACT_APP_APPLICATION_ID=[your-production-application-id]
```

## Production Environment Configuration

### Database Settings
- **Connection pooling**: Enable for better performance
- **Row Level Security**: Consider enabling for enhanced security
- **Backups**: Ensure automated backups are configured
- **Monitoring**: Enable database monitoring and alerts

### Edge Function Settings
- **Memory allocation**: Default 256MB should be sufficient
- **Timeout**: Default 60s timeout is appropriate
- **Environment variables**: Set any required production configs
- **Logging**: Enable function logs for debugging

### Security Configuration

1. **API Keys**:
   - Use anon key for public frontend access
   - Rotate keys regularly
   - Never expose service role key

2. **CORS Settings**:
   - Configure allowed origins in Supabase Dashboard
   - Settings → API → CORS Origins
   - Add your production domain(s)

3. **Database Security**:
   - Review and enable RLS policies if needed
   - Limit database access to necessary operations
   - Monitor for suspicious activity

## Monitoring and Maintenance

### Health Checks

Create a simple health check endpoint by modifying the Edge Function:

```typescript
// Add to join-waitlist/index.ts
if (req.method === 'GET') {
  return new Response(
    JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}
```

Test health check:
```bash
curl https://[your-project].supabase.co/functions/v1/join-waitlist
```

### Analytics and Monitoring

1. **Supabase Dashboard Monitoring**:
   - Database → Logs (monitor query performance)
   - Edge Functions → Logs (monitor function execution)
   - API → Statistics (monitor API usage)

2. **Custom Analytics Queries**:
   Run the analytics queries from `analytics-queries.sql` regularly to monitor:
   - Daily signup trends
   - Country distribution
   - Email domain analysis
   - Data quality metrics

3. **Alert Setup** (recommended):
   - Set up alerts for function errors
   - Monitor database performance
   - Track unusual signup patterns

### Performance Optimization

1. **Database Performance**:
   - Monitor query performance in Dashboard
   - Add additional indexes if needed
   - Consider archiving old data

2. **Function Performance**:
   - Monitor function execution time
   - Optimize for cold starts if needed
   - Consider function caching strategies

3. **Frontend Performance**:
   - Implement proper error handling
   - Add loading states for better UX
   - Consider implementing retry logic

## Backup and Recovery

### Database Backups
- Supabase automatically creates daily backups
- Test backup restoration process
- Consider additional backup strategies for critical data

### Function Backups
- Edge Functions are version controlled in Git
- Consider keeping deployment logs
- Document any manual configuration changes

## Scaling Considerations

### Traffic Growth
- Monitor function execution counts
- Plan for database connection scaling
- Consider rate limiting implementation

### Feature Expansion
- Plan database schema changes carefully
- Use migrations for all schema updates
- Test changes in staging environment

## Troubleshooting Production Issues

### Common Production Issues

1. **CORS Errors**:
   ```
   Error: Access to fetch blocked by CORS policy
   ```
   Solution: Add your domain to CORS settings in Supabase Dashboard

2. **Database Connection Errors**:
   ```
   Error: Database connection failed
   ```
   Solution: Check database status and connection limits

3. **Function Timeout Errors**:
   ```
   Error: Function execution timeout
   ```
   Solution: Optimize function code or increase timeout settings

4. **Invalid Application ID**:
   ```
   {"success":false,"message":"Invalid application ID"}
   ```
   Solution: Verify application_id exists in production database

### Debugging Steps

1. **Check Function Logs**:
   - Supabase Dashboard → Edge Functions → join-waitlist → Logs
   - Look for error messages and execution details

2. **Monitor Database Performance**:
   - Dashboard → Database → Logs
   - Check for slow queries or connection issues

3. **Verify Data Integrity**:
   ```sql
   -- Check application exists
   SELECT * FROM applications WHERE application_id = '[your-id]';
   
   -- Check recent entries
   SELECT * FROM waitlist_entries ORDER BY created_at DESC LIMIT 10;
   
   -- Verify constraints
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'waitlist_entries';
   ```

## Post-Deployment Tasks

### Immediate (within 24 hours)
- [ ] Verify all endpoints working correctly
- [ ] Test from actual frontend application
- [ ] Monitor initial user signups
- [ ] Check error logs for any issues

### Week 1
- [ ] Analyze signup patterns and data quality
- [ ] Review analytics queries with real data
- [ ] Monitor performance metrics
- [ ] Gather user feedback if available

### Ongoing
- [ ] Weekly backup verification
- [ ] Monthly performance review
- [ ] Quarterly security audit
- [ ] Regular dependency updates

## Success Metrics

Track these metrics to measure deployment success:

- **Uptime**: Function availability > 99.9%
- **Response Time**: API responses < 500ms average
- **Error Rate**: < 1% of requests result in errors
- **Data Quality**: All required fields captured correctly
- **User Experience**: Successful signup conversion

## Contact and Support

For production issues:
1. Check Supabase status page: https://status.supabase.com/
2. Review troubleshooting steps above
3. Consult Supabase documentation
4. Contact Supabase support if needed

## Production URLs and Configuration

After deployment, document these production values:

```
Production API Endpoint: https://[your-project].supabase.co/functions/v1/join-waitlist
Production Application ID: [your-production-application-id]
Production Supabase URL: https://[your-project].supabase.co
Dashboard URL: https://supabase.com/dashboard/project/[your-project-id]
```

Keep these values secure and accessible to your development team.