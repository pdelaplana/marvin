# Email Feature Implementation Plan
## Waitlist Email Notifications with Mailgun Integration

---

## Overview

This document outlines the complete implementation plan for adding email notifications when users join the waitlist. The feature will integrate with Mailgun for email delivery and maintain the existing robust waitlist architecture.

**Estimated Implementation Time: 8-10 hours**

---

## **Phase 1: Email Service Infrastructure** (2-3 hours) ✅ COMPLETED

### **File 1: Create** `D:\Repos\marvin\supabase\functions\_shared\types.ts` ✅
```typescript
// Shared type definitions for email functionality
export interface EmailConfig {
  mailgunApiKey: string
  mailgunDomain: string
  fromEmail: string
  fromName: string
  siteUrl: string
}

export interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}

export interface WaitlistEmailData {
  email: string
  applicationName: string
  joinDate: string
  unsubscribeUrl: string
  siteUrl: string
}
```

### **File 2: Create** `D:\Repos\marvin\supabase\functions\_shared\email-templates.ts` ✅
```typescript
import { EmailTemplate } from './types.ts'

export const WELCOME_EMAIL_TEMPLATE: EmailTemplate = {
  subject: "Welcome to {{applicationName}} Waitlist! 🎉",
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to {{applicationName}} Waitlist!</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="background-color: #f8f9fa; padding: 40px 20px; text-align: center;">
    <h1 style="color: #333; margin: 0; font-size: 28px;">You're on the list! 🎉</h1>
  </div>
  
  <div style="padding: 30px 20px;">
    <p style="font-size: 16px; line-height: 1.5; color: #333;">Hi there,</p>
    
    <p style="font-size: 16px; line-height: 1.5; color: #333;">
      Thank you for joining the <strong>{{applicationName}}</strong> waitlist! 
      We're excited to have you aboard.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5; color: #333; margin-top: 20px;">
      <strong>What happens next?</strong>
    </p>
    <ul style="font-size: 16px; line-height: 1.6; color: #333;">
      <li>We'll keep you updated on our progress</li>
      <li>You'll be among the first to know when we launch</li>
      <li>Exclusive early access when available</li>
    </ul>
    
    <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 16px; color: #333;"><strong>Your registration details:</strong></p>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Email: {{email}}</p>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Joined: {{joinDate}}</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; color: #333;">Thanks again for your interest!</p>
    <p style="font-size: 16px; line-height: 1.5; color: #333;">The {{applicationName}} Team</p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e9ecef;">
    <p style="margin: 0;">
      <a href="{{unsubscribeUrl}}" style="color: #007bff; text-decoration: none;">Unsubscribe</a> | 
      <a href="{{siteUrl}}" style="color: #007bff; text-decoration: none;">Visit our website</a>
    </p>
  </div>
</body>
</html>`,
  textContent: `Welcome to {{applicationName}} Waitlist!

Hi there,

Thank you for joining the {{applicationName}} waitlist! We're excited to have you aboard.

What happens next?
- We'll keep you updated on our progress
- You'll be among the first to know when we launch
- Exclusive early access when available

Your registration details:
Email: {{email}}
Joined: {{joinDate}}

Thanks again for your interest!
The {{applicationName}} Team

Unsubscribe: {{unsubscribeUrl}}
Visit our website: {{siteUrl}}`
}

// Simple template variable replacement function
export function renderTemplate(template: EmailTemplate, data: Record<string, any>): EmailTemplate {
  const rendered: EmailTemplate = {
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent
  }

  // Replace variables in subject, HTML, and text content
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    rendered.subject = rendered.subject.replace(placeholder, String(value))
    rendered.htmlContent = rendered.htmlContent.replace(placeholder, String(value))
    if (rendered.textContent) {
      rendered.textContent = rendered.textContent.replace(placeholder, String(value))
    }
  }

  return rendered
}
```

### **File 3: Create** `D:\Repos\marvin\supabase\functions\_shared\email-service.ts` ✅
```typescript
import { EmailConfig, EmailResult, WaitlistEmailData } from './types.ts'
import { WELCOME_EMAIL_TEMPLATE, renderTemplate } from './email-templates.ts'

export class EmailService {
  constructor(private config: EmailConfig) {}

  async sendWelcomeEmail(data: WaitlistEmailData): Promise<EmailResult> {
    try {
      // Validate configuration
      if (!this.config.mailgunApiKey || !this.config.mailgunDomain) {
        return {
          success: false,
          error: 'Mailgun configuration missing'
        }
      }

      // Render template with data
      const renderedTemplate = renderTemplate(WELCOME_EMAIL_TEMPLATE, data)

      // Prepare Mailgun API request
      const formData = new FormData()
      formData.append('from', `${this.config.fromName} <${this.config.fromEmail}>`)
      formData.append('to', data.email)
      formData.append('subject', renderedTemplate.subject)
      formData.append('html', renderedTemplate.htmlContent)
      if (renderedTemplate.textContent) {
        formData.append('text', renderedTemplate.textContent)
      }

      // Add tracking and tags
      formData.append('o:tracking', 'yes')
      formData.append('o:tag', 'waitlist-welcome')
      formData.append('o:tag', 'automated')

      // Send email via Mailgun API
      const response = await fetch(
        `https://api.mailgun.net/v3/${this.config.mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${this.config.mailgunApiKey}`)}`
          },
          body: formData
        }
      )

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: `Mailgun API error: ${responseData.message || 'Unknown error'}`,
          statusCode: response.status
        }
      }

      return {
        success: true,
        messageId: responseData.id
      }

    } catch (error) {
      console.error('Email service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Helper method for testing configuration
  async testConnection(): Promise<EmailResult> {
    try {
      const response = await fetch(
        `https://api.mailgun.net/v3/${this.config.mailgunDomain}`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`api:${this.config.mailgunApiKey}`)}`
          }
        }
      )

      return {
        success: response.ok,
        error: response.ok ? undefined : 'Authentication failed'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}
```

---

## **Phase 2: Database Enhancements** (1 hour) ✅ COMPLETED

### **File 4: Create** `D:\Repos\marvin\supabase\migrations\20241001000000_add_email_tracking.sql` ✅
```sql
-- Add email tracking columns to waitlist_entries table
ALTER TABLE waitlist_entries 
ADD COLUMN email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN email_error TEXT NULL,
ADD COLUMN email_message_id VARCHAR(255) NULL;

-- Add indexes for email tracking queries
CREATE INDEX idx_waitlist_entries_email_sent ON waitlist_entries(email_sent);
CREATE INDEX idx_waitlist_entries_email_sent_at ON waitlist_entries(email_sent_at);

-- Add unsubscribe token support (for future unsubscribe functionality)
ALTER TABLE waitlist_entries
ADD COLUMN unsubscribe_token VARCHAR(64) NULL;

-- Create unique index on unsubscribe token (sparse index - only for non-null values)
CREATE UNIQUE INDEX idx_waitlist_entries_unsubscribe_token 
ON waitlist_entries(unsubscribe_token) 
WHERE unsubscribe_token IS NOT NULL;

-- Function to generate secure random tokens
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update existing records to have unsubscribe tokens
UPDATE waitlist_entries 
SET unsubscribe_token = generate_unsubscribe_token()
WHERE unsubscribe_token IS NULL;
```

**What this migration does:**
- Adds email tracking fields to track delivery status
- Adds indexes for efficient querying of email status
- Adds unsubscribe token system for future unsubscribe functionality
- Generates secure random tokens for existing records

---

## **Phase 3: Integration** (2-3 hours) ✅ COMPLETED

### **File 5: Modify** `D:\Repos\marvin\supabase\functions\join-waitlist\index.ts` ✅

**BEFORE (current lines 1-9):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface JoinWaitlistRequest {
  applicationId: string
  email: string
  sourceUrl: string
  country?: string
}
```

**AFTER (replace lines 1-9):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EmailService } from '../_shared/email-service.ts'
import { EmailConfig, WaitlistEmailData } from '../_shared/types.ts'

interface JoinWaitlistRequest {
  applicationId: string
  email: string
  sourceUrl: string
  country?: string
}
```

**BEFORE (current lines 46-58 - application validation):**
```typescript
    // Validate application exists
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('application_id')
      .eq('application_id', applicationId)
      .single()

    if (appError || !app) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid application ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
```

**AFTER (replace lines 46-58):**
```typescript
    // Validate application exists and get application name for email
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('application_id, application_name')
      .eq('application_id', applicationId)
      .single()

    if (appError || !app) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid application ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
```

**BEFORE (current lines 60-82 - insert and return):**
```typescript
    // Insert waitlist entry
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        application_id: applicationId,
        email: email.toLowerCase().trim(),
        source_url: sourceUrl,
        country: country || null,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new Response(
          JSON.stringify({ success: false, message: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, message: 'Successfully joined waitlist' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
```

**AFTER (replace lines 60-82):**
```typescript
    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, '')
    
    // Insert waitlist entry with unsubscribe token
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        application_id: applicationId,
        email: email.toLowerCase().trim(),
        source_url: sourceUrl,
        country: country || null,
        unsubscribe_token: unsubscribeToken,
        created_at: new Date().toISOString()
      })
      .select('id, email, unsubscribe_token')
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new Response(
          JSON.stringify({ success: false, message: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    // Send welcome email (async, don't block response)
    sendWelcomeEmailAsync(supabase, data, app, email.toLowerCase().trim())

    return new Response(
      JSON.stringify({ success: true, id: data.id, message: 'Successfully joined waitlist' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
```

**ADD new function at the end of the file (after line 95):**
```typescript

// Async function to send welcome email without blocking the response
async function sendWelcomeEmailAsync(
  supabase: any,
  waitlistEntry: { id: string; email: string; unsubscribe_token: string },
  application: { application_name: string },
  email: string
) {
  try {
    // Check if emails are enabled via environment variable
    const emailsEnabled = Deno.env.get('ENABLE_WELCOME_EMAILS') !== 'false'
    if (!emailsEnabled) {
      console.log('Welcome emails are disabled via ENABLE_WELCOME_EMAILS environment variable')
      return
    }

    // Initialize email service
    const emailConfig: EmailConfig = {
      mailgunApiKey: Deno.env.get('MAILGUN_API_KEY') ?? '',
      mailgunDomain: Deno.env.get('MAILGUN_DOMAIN') ?? '',
      fromEmail: Deno.env.get('FROM_EMAIL') ?? 'hello@yourdomain.com',
      fromName: Deno.env.get('FROM_NAME') ?? application.application_name,
      siteUrl: Deno.env.get('SITE_URL') ?? 'https://yourdomain.com'
    }

    const emailService = new EmailService(emailConfig)

    // Prepare email data
    const emailData: WaitlistEmailData = {
      email: email,
      applicationName: application.application_name,
      joinDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      unsubscribeUrl: `${emailConfig.siteUrl}/unsubscribe?token=${waitlistEntry.unsubscribe_token}`,
      siteUrl: emailConfig.siteUrl
    }

    // Send email
    const emailResult = await emailService.sendWelcomeEmail(emailData)

    // Update database with email status
    await supabase
      .from('waitlist_entries')
      .update({
        email_sent: emailResult.success,
        email_sent_at: emailResult.success ? new Date().toISOString() : null,
        email_error: emailResult.error || null,
        email_message_id: emailResult.messageId || null
      })
      .eq('id', waitlistEntry.id)

    if (emailResult.success) {
      console.log(`Welcome email sent successfully to ${email}, message ID: ${emailResult.messageId}`)
    } else {
      console.error(`Failed to send welcome email to ${email}: ${emailResult.error}`)
    }

  } catch (error) {
    console.error('Error in sendWelcomeEmailAsync:', error)
    
    // Update database with error
    try {
      await supabase
        .from('waitlist_entries')
        .update({
          email_sent: false,
          email_error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
        .eq('id', waitlistEntry.id)
    } catch (updateError) {
      console.error('Failed to update email error status:', updateError)
    }
  }
}
```

**What this integration does:**
- Imports the email service modules
- Fetches application name for personalized emails
- Generates secure unsubscribe tokens
- Sends welcome email asynchronously (doesn't block signup response)
- Updates database with email delivery status
- Includes comprehensive error handling
- Allows disabling emails via environment variable

---

## **Phase 4: Configuration** (30 minutes) ✅ COMPLETED

### **File 6: Modify** `D:\Repos\marvin\.github\workflows\deploy.yml` ✅

**Find the current env section (around line 67):**
```yaml
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

**REPLACE with expanded environment variables:**
```yaml
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
        MAILGUN_DOMAIN: ${{ secrets.MAILGUN_DOMAIN }}
        FROM_EMAIL: ${{ secrets.FROM_EMAIL }}
        FROM_NAME: ${{ secrets.FROM_NAME }}
        SITE_URL: ${{ secrets.SITE_URL }}
        ENABLE_WELCOME_EMAILS: ${{ secrets.ENABLE_WELCOME_EMAILS }}
```

### **GitHub Secrets to Add:**
Navigate to GitHub repository → Settings → Secrets and Variables → Actions, then add:

1. **`MAILGUN_API_KEY`** - Your Mailgun private API key (starts with `key-`)
2. **`MAILGUN_DOMAIN`** - Your Mailgun domain (e.g., `mg.yourdomain.com`)
3. **`FROM_EMAIL`** - Email address for sending (e.g., `hello@yourdomain.com`)
4. **`FROM_NAME`** - Display name for emails (e.g., `Your App Name`)  
5. **`SITE_URL`** - Your website URL (e.g., `https://yourdomain.com`)
6. **`ENABLE_WELCOME_EMAILS`** - Set to `true` to enable, `false` to disable

### **File 7: Create** `D:\Repos\marvin\.env.example` ✅
```env
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password

# Email Configuration (Mailgun)
MAILGUN_API_KEY=key-your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
FROM_EMAIL=hello@yourdomain.com
FROM_NAME=Your Application Name
SITE_URL=https://yourdomain.com
ENABLE_WELCOME_EMAILS=true

# Local Development
SUPABASE_ACCESS_TOKEN=your-access-token-for-cli
```

### **Local Development Environment:**
Create `D:\Repos\marvin\.env` (not committed to git) with your actual values:
```env
MAILGUN_API_KEY=key-your-actual-api-key
MAILGUN_DOMAIN=your-actual-domain.com
FROM_EMAIL=hello@yourdomain.com
FROM_NAME=Your App
SITE_URL=http://localhost:3000
ENABLE_WELCOME_EMAILS=true
```

---

## **Phase 5: Testing & Monitoring** (2 hours) ✅ COMPLETED

### **File 8: Create** `D:\Repos\marvin\supabase\functions\_shared\email-service.test.ts` ✅
```typescript
// Unit tests for email service
import { assertEquals, assertStringIncludes } from 'https://deno.land/std/testing/asserts.ts'
import { EmailService } from './email-service.ts'
import { renderTemplate, WELCOME_EMAIL_TEMPLATE } from './email-templates.ts'

// Mock email config for testing
const mockEmailConfig = {
  mailgunApiKey: 'key-test',
  mailgunDomain: 'test.example.com',
  fromEmail: 'test@example.com',
  fromName: 'Test App',
  siteUrl: 'https://test.example.com'
}

Deno.test('Email Template Rendering - Basic Variables', () => {
  const testData = {
    email: 'user@example.com',
    applicationName: 'Test App',
    joinDate: 'January 1, 2024',
    unsubscribeUrl: 'https://example.com/unsubscribe?token=abc123',
    siteUrl: 'https://example.com'
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)

  assertEquals(rendered.subject, 'Welcome to Test App Waitlist! 🎉')
  assertStringIncludes(rendered.htmlContent, 'user@example.com')
  assertStringIncludes(rendered.htmlContent, 'Test App')
  assertStringIncludes(rendered.htmlContent, 'January 1, 2024')
  assertStringIncludes(rendered.htmlContent, 'https://example.com/unsubscribe?token=abc123')
})

Deno.test('Email Template Rendering - Special Characters', () => {
  const testData = {
    applicationName: "App with 'Special' & <Characters>",
    email: 'test@example.com',
    joinDate: 'Today',
    unsubscribeUrl: 'https://example.com/unsub',
    siteUrl: 'https://example.com'
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)
  
  assertStringIncludes(rendered.htmlContent, "App with 'Special' & <Characters>")
  assertStringIncludes(rendered.subject, "App with 'Special' & <Characters>")
})

Deno.test('Email Service - Configuration Validation', async () => {
  const invalidConfig = {
    mailgunApiKey: '',
    mailgunDomain: '',
    fromEmail: 'test@example.com',
    fromName: 'Test',
    siteUrl: 'https://test.com'
  }

  const emailService = new EmailService(invalidConfig)
  const testData = {
    email: 'test@example.com',
    applicationName: 'Test App',
    joinDate: 'Today',
    unsubscribeUrl: 'https://example.com/unsub',
    siteUrl: 'https://example.com'
  }

  const result = await emailService.sendWelcomeEmail(testData)
  
  assertEquals(result.success, false)
  assertStringIncludes(result.error!, 'configuration missing')
})
```

### **File 9: Create** `D:\Repos\marvin\supabase\functions\test-email\index.ts` ✅
```typescript
// Test endpoint for email functionality
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { EmailService } from '../_shared/email-service.ts'
import { EmailConfig, WaitlistEmailData } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { email, applicationName } = await req.json()

    if (!email || !applicationName) {
      return new Response(
        JSON.stringify({ success: false, message: 'email and applicationName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test email configuration
    const emailConfig: EmailConfig = {
      mailgunApiKey: Deno.env.get('MAILGUN_API_KEY') ?? '',
      mailgunDomain: Deno.env.get('MAILGUN_DOMAIN') ?? '',
      fromEmail: Deno.env.get('FROM_EMAIL') ?? 'hello@example.com',
      fromName: Deno.env.get('FROM_NAME') ?? applicationName,
      siteUrl: Deno.env.get('SITE_URL') ?? 'https://example.com'
    }

    const emailService = new EmailService(emailConfig)

    // Test connection first
    const connectionTest = await emailService.testConnection()
    if (!connectionTest.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email service connection failed',
          error: connectionTest.error
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send test email
    const emailData: WaitlistEmailData = {
      email: email,
      applicationName: applicationName,
      joinDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      unsubscribeUrl: `${emailConfig.siteUrl}/unsubscribe?token=test-token`,
      siteUrl: emailConfig.siteUrl
    }

    const result = await emailService.sendWelcomeEmail(emailData)

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
        messageId: result.messageId,
        error: result.error
      }),
      { 
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Test email error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### **File 10: Create** `D:\Repos\marvin\monitoring-queries.sql` ✅
```sql
-- Email delivery success rate (last 24 hours)
SELECT 
  COUNT(*) as total_signups,
  COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
  ROUND(
    COUNT(CASE WHEN email_sent = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent
FROM waitlist_entries 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Recent email failures with error details
SELECT 
  w.email,
  a.application_name,
  w.email_error,
  w.created_at,
  w.email_sent_at
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.email_sent = false 
  AND w.email_error IS NOT NULL 
  AND w.created_at >= NOW() - INTERVAL '7 days'
ORDER BY w.created_at DESC 
LIMIT 20;

-- Email delivery statistics by application
SELECT 
  a.application_name,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN w.email_sent = true THEN 1 END) as emails_sent,
  COUNT(CASE WHEN w.email_sent = false THEN 1 END) as emails_failed,
  ROUND(
    COUNT(CASE WHEN w.email_sent = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent
FROM applications a
LEFT JOIN waitlist_entries w ON a.application_id = w.application_id
WHERE w.created_at >= NOW() - INTERVAL '30 days'
GROUP BY a.application_id, a.application_name
ORDER BY total_signups DESC;

-- Email performance over time (daily breakdown)
SELECT 
  DATE(w.created_at) as signup_date,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN w.email_sent = true THEN 1 END) as emails_sent,
  ROUND(
    COUNT(CASE WHEN w.email_sent = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent,
  AVG(EXTRACT(EPOCH FROM (w.email_sent_at - w.created_at))) as avg_send_delay_seconds
FROM waitlist_entries w
WHERE w.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(w.created_at)
ORDER BY signup_date DESC;

-- Emails pending retry (sent more than 1 hour ago but failed)
SELECT 
  w.id,
  w.email,
  a.application_name,
  w.email_error,
  w.created_at,
  EXTRACT(EPOCH FROM (NOW() - w.created_at))/3600 as hours_since_signup
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.email_sent = false 
  AND w.created_at < NOW() - INTERVAL '1 hour'
  AND w.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY w.created_at DESC;
```

### **File 11: Create** `D:\Repos\marvin\email-testing-guide.md` ✅
```markdown
# Email Testing Guide

## Local Development Testing

### 1. Test Email Service Connection
```bash
curl -X POST "http://localhost:54321/functions/v1/test-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","applicationName":"Test App"}'
```

### 2. Test Full Waitlist Flow
```bash
curl -X POST "http://localhost:54321/functions/v1/join-waitlist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "applicationId":"your-app-uuid",
    "email":"test@example.com",
    "sourceUrl":"https://test.com"
  }'
```

### 3. Run Unit Tests
```bash
deno test supabase/functions/_shared/email-service.test.ts --allow-net
```

## Production Testing

### 1. Monitor Email Delivery
Check the monitoring queries in `monitoring-queries.sql` regularly:
- Run daily: Email delivery success rate
- Run weekly: Email failures by application
- Run on issues: Recent email failures

### 2. Test with Real Email
Use the test-email endpoint with a real email address to verify:
- Email delivery
- Template rendering
- Unsubscribe links work
- Email appears in inbox (not spam)

### 3. Load Testing
For high-volume testing:
```bash
# Test 100 signups rapidly
for i in {1..100}; do
  curl -X POST "https://your-project.supabase.co/functions/v1/join-waitlist" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -d "{\"applicationId\":\"your-app-uuid\",\"email\":\"test${i}@example.com\",\"sourceUrl\":\"https://test.com\"}" &
done
wait
```

Then check email delivery rates with monitoring queries.

## Troubleshooting Common Issues

### Emails Not Sending
1. Check environment variables are set correctly
2. Verify Mailgun API key has send permissions
3. Check Mailgun domain is verified
4. Review error logs in Supabase function logs

### Low Delivery Rates
1. Check for rate limiting in Mailgun dashboard
2. Verify email content doesn't trigger spam filters
3. Check domain reputation
4. Review email authentication (SPF, DKIM, DMARC)

### Template Issues
1. Test template rendering with various data inputs
2. Check for special characters in application names
3. Verify all template variables are being replaced
4. Test both HTML and text versions
```

---

## **Summary of All Changes**

### **New Files Created (8 files):**
1. `supabase/functions/_shared/types.ts` - Type definitions
2. `supabase/functions/_shared/email-templates.ts` - Email templates and rendering
3. `supabase/functions/_shared/email-service.ts` - Mailgun integration service
4. `supabase/migrations/20241001000000_add_email_tracking.sql` - Database migration
5. `supabase/functions/test-email/index.ts` - Email testing endpoint  
6. `supabase/functions/_shared/email-service.test.ts` - Unit tests
7. `monitoring-queries.sql` - Database monitoring queries
8. `email-testing-guide.md` - Testing documentation

### **Files Modified (2 files):**
1. `supabase/functions/join-waitlist/index.ts` - Added email integration
2. `.github/workflows/deploy.yml` - Added environment variables

### **Configuration Files to Create:**
1. `.env.example` - Environment variable template
2. `.env` - Local development environment (your actual secrets)

### **GitHub Secrets to Add (6 secrets):**
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN` 
- `FROM_EMAIL`
- `FROM_NAME`
- `SITE_URL`
- `ENABLE_WELCOME_EMAILS`

### **Key Features Implemented:**
- ✅ **Async Email Sending** - Doesn't block signup response
- ✅ **Graceful Degradation** - Signup succeeds even if email fails  
- ✅ **Email Status Tracking** - Database tracks delivery success/failure
- ✅ **Unsubscribe Support** - Secure tokens for future unsubscribe feature
- ✅ **Comprehensive Testing** - Unit tests, integration tests, monitoring queries
- ✅ **Configuration Management** - Environment-based settings
- ✅ **Error Handling** - Detailed error logging and recovery

### **Implementation Timeline:**
- **Phase 1**: Email Service Infrastructure (2-3 hours)
- **Phase 2**: Database Enhancements (1 hour)
- **Phase 3**: Integration (2-3 hours)
- **Phase 4**: Configuration (30 minutes)
- **Phase 5**: Testing & Monitoring (2 hours)

**Total Implementation Time: 8-10 hours**

---

## **Next Steps**

1. **Review this plan** and identify any modifications needed
2. **Set up Mailgun account** and configure domain if not done
3. **Choose implementation phase** to start with
4. **Create GitHub secrets** for environment variables
5. **Begin implementation** following the detailed code changes above

This plan provides a production-ready email notification system that integrates seamlessly with your existing waitlist architecture while maintaining reliability and performance.