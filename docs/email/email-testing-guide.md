# Email Testing Guide

## Local Development Testing

### 1. Run Unit Tests
```bash
# Run all email service unit tests
deno test supabase/functions/_shared/email-service.test.ts --allow-net

# Run with verbose output
deno test supabase/functions/_shared/email-service.test.ts --allow-net --verbose

# Run specific test
deno test supabase/functions/_shared/email-service.test.ts --allow-net --filter "Template Rendering"
```

### 2. Test Email Service Connection
```bash
# Test email configuration and connection
curl -X POST "http://localhost:54321/functions/v1/test-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","applicationName":"Test App"}'
```

Expected successful response:
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "mailgun-message-id",
  "config": {
    "fromEmail": "hello@yourdomain.com",
    "fromName": "Test App",
    "domain": "mg.yourdomain.com",
    "siteUrl": "http://localhost:3000"
  },
  "emailData": {
    "to": "test@example.com",
    "applicationName": "Test App",
    "joinDate": "December 10, 2024"
  }
}
```

### 3. Test Full Waitlist Flow
```bash
# Test complete signup with email
curl -X POST "http://localhost:54321/functions/v1/join-waitlist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "applicationId":"your-app-uuid",
    "email":"test@example.com",
    "sourceUrl":"https://test.com"
  }'
```

### 4. Start Local Supabase with Email Testing
```bash
# Start Supabase with all services
supabase start

# Deploy functions locally
supabase functions serve

# Run database migrations
supabase db reset
```

## Production Testing

### 1. Monitor Email Delivery
Use the queries in `monitoring-queries.sql`:

**Daily monitoring (run once per day):**
```sql
-- Email delivery success rate (last 24 hours)
SELECT 
  COUNT(*) as total_signups,
  COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
  ROUND(
    COUNT(CASE WHEN email_sent = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as success_rate_percent
FROM waitlist_entries 
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Weekly monitoring (run weekly):**
```sql
-- Email failures by application
SELECT 
  a.application_name,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN w.email_sent = false THEN 1 END) as emails_failed,
  ROUND(
    COUNT(CASE WHEN w.email_sent = false THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as failure_rate_percent
FROM applications a
LEFT JOIN waitlist_entries w ON a.application_id = w.application_id
WHERE w.created_at >= NOW() - INTERVAL '7 days'
GROUP BY a.application_id, a.application_name
ORDER BY emails_failed DESC;
```

### 2. Test with Real Email
Use the test-email endpoint with your actual email address:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/test-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"your-email@example.com","applicationName":"Your App"}'
```

Verify:
- ✅ Email delivered to inbox (not spam)
- ✅ Template renders correctly
- ✅ Unsubscribe link works
- ✅ All variables replaced properly

### 3. Load Testing
Test email system under load:
```bash
# Test 100 signups rapidly
for i in {1..100}; do
  curl -X POST "https://your-project.supabase.co/functions/v1/join-waitlist" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -d "{\"applicationId\":\"your-app-uuid\",\"email\":\"test${i}@example.com\",\"sourceUrl\":\"https://test.com\"}" &
done
wait

echo "Load test completed. Check delivery rates with monitoring queries."
```

Then check results:
```sql
-- Check delivery rates for recent signups
SELECT 
  COUNT(*) as total_signups,
  COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
  COUNT(CASE WHEN email_sent = false THEN 1 END) as emails_failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (email_sent_at - created_at))), 2) as avg_send_delay_seconds
FROM waitlist_entries 
WHERE created_at >= NOW() - INTERVAL '10 minutes';
```

## Testing Scenarios

### 1. Normal Operation
- Single user signup
- Bulk signups (10-50)
- Different application IDs
- Various email domains

### 2. Error Conditions
- Invalid Mailgun credentials
- Network timeouts
- Malformed email addresses
- Missing environment variables

### 3. Edge Cases
- Very long application names
- Special characters in emails
- International email domains
- Duplicate signups

### 4. Performance Testing
- High-volume signups (100+ simultaneous)
- Email delivery timing
- Database performance under load
- Rate limiting behavior

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending
**Symptoms:** `email_sent = false` in database

**Check:**
```sql
-- Recent email failures
SELECT email, email_error, created_at 
FROM waitlist_entries 
WHERE email_sent = false 
  AND email_error IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

**Solutions:**
- Verify Mailgun API key permissions
- Check domain verification in Mailgun
- Confirm environment variables are set
- Review Supabase function logs

#### 2. Template Rendering Issues
**Test template rendering:**
```bash
deno test supabase/functions/_shared/email-service.test.ts --allow-net --filter "Template"
```

**Common fixes:**
- Check variable names match template
- Verify special character handling
- Test with various application names

#### 3. Authentication Errors
**Symptoms:** "Authentication failed" or 401 errors

**Check:**
- API key format (starts with `key-`)
- Domain matches Mailgun settings exactly
- API key has send permissions

#### 4. Low Delivery Rates
**Investigation queries:**
```sql
-- Most common errors
SELECT email_error, COUNT(*) as count 
FROM waitlist_entries 
WHERE email_sent = false 
GROUP BY email_error 
ORDER BY count DESC;

-- Performance by hour
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as signups,
  AVG(CASE WHEN email_sent THEN 1.0 ELSE 0.0 END) as success_rate
FROM waitlist_entries 
WHERE created_at >= CURRENT_DATE 
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;
```

### Monitoring Alerts

Set up alerts for:
- Email success rate < 95%
- No emails sent in last hour (during active periods)
- High error rates for specific applications
- Unusual delivery delays (> 30 seconds average)

### Recovery Procedures

#### Resend Failed Emails
```sql
-- Identify failed emails from last 24 hours
SELECT id, email, application_id 
FROM waitlist_entries 
WHERE email_sent = false 
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND created_at >= NOW() - INTERVAL '1 hour'; -- not too recent
```

**Note:** Manual email resending requires custom tooling or manual Mailgun API calls.

#### Email Service Recovery
1. Check environment variables
2. Verify Mailgun account status  
3. Test with test-email endpoint
4. Review recent code deployments
5. Check database migration status

## Testing Checklist

### Pre-deployment Testing
- [ ] Unit tests pass
- [ ] Test email endpoint works
- [ ] Template rendering correct
- [ ] Environment variables set
- [ ] Database migration applied

### Post-deployment Testing
- [ ] Production email delivery works
- [ ] Monitoring queries return expected results
- [ ] Load testing acceptable performance
- [ ] Error handling works correctly
- [ ] Unsubscribe functionality planned

### Regular Monitoring
- [ ] Daily success rate check
- [ ] Weekly error analysis
- [ ] Monthly performance review
- [ ] Quarterly template updates