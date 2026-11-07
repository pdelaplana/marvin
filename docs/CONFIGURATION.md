# Email Configuration Guide

## GitHub Secrets Setup

Navigate to your GitHub repository → Settings → Secrets and Variables → Actions, then add these secrets:

### Required Email Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `MAILGUN_API_KEY` | Your Mailgun private API key | `key-1234567890abcdef1234567890abcdef` |
| `MAILGUN_DOMAIN` | Your verified Mailgun domain | `mg.yourdomain.com` |
| `FROM_EMAIL` | Email address for sending | `hello@yourdomain.com` |
| `FROM_NAME` | Display name for emails | `Your App Name` |
| `SITE_URL` | Your website URL | `https://yourdomain.com` |
| `ENABLE_WELCOME_EMAILS` | Enable/disable emails | `true` or `false` |

### Existing Supabase Secrets (already configured)
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` 
- `SUPABASE_DB_PASSWORD`

## Local Development Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update .env with your actual values:**
   ```bash
   # Email Configuration (Mailgun)
   MAILGUN_API_KEY=key-your-actual-api-key
   MAILGUN_DOMAIN=your-actual-domain.com
   FROM_EMAIL=hello@yourdomain.com
   FROM_NAME=Your App
   SITE_URL=http://localhost:3000
   ENABLE_WELCOME_EMAILS=true
   ```

## Mailgun Setup Requirements

1. **Account Setup:**
   - Create Mailgun account at https://mailgun.com
   - Add and verify your domain
   - Get your API key from Dashboard → API Keys

2. **Domain Verification:**
   - Add DNS records (SPF, DKIM, DMARC) 
   - Verify domain in Mailgun dashboard
   - Wait for propagation (up to 24 hours)

3. **API Key Permissions:**
   - Ensure API key has "Send" permissions
   - Test key with Mailgun API

## Testing Configuration

### Test Email Service Locally
```bash
curl -X POST "http://localhost:54321/functions/v1/test-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","applicationName":"Test App"}'
```

### Disable Emails for Testing
Set `ENABLE_WELCOME_EMAILS=false` in your environment to disable email sending during testing.

## Environment-Specific Configuration

### Development
- Use sandbox Mailgun domain
- Set `SITE_URL=http://localhost:3000`
- Enable emails for testing: `ENABLE_WELCOME_EMAILS=true`

### Production  
- Use verified production domain
- Set production `SITE_URL`
- Enable emails: `ENABLE_WELCOME_EMAILS=true`

### Staging
- Use staging subdomain or test domain
- Set staging `SITE_URL`  
- Enable emails for testing: `ENABLE_WELCOME_EMAILS=true`

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Mailgun API key permissions
   - Verify domain is confirmed in Mailgun
   - Check environment variables are set

2. **Authentication errors**
   - Verify API key format (starts with `key-`)
   - Check domain matches exactly

3. **DNS issues**
   - Wait 24 hours for DNS propagation
   - Use DNS checker tools
   - Verify all required DNS records

### Logs and Monitoring
- Check Supabase Function logs for errors
- Monitor Mailgun dashboard for delivery stats
- Use monitoring queries in `monitoring-queries.sql`