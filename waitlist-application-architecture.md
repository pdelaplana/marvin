# Waitlist Application Architecture

## Overview

A scalable, multi-tenant waitlist application built on Supabase that supports multiple applications and can be extended to handle various form types (feedback, contact, surveys, etc.).

## Use Case

1. A user visits a landing page with a "join waitlist" form
2. User enters their email and clicks join
3. A function is invoked with parameters: ApplicationId, Source URL, Country, and Email
4. Information is stored in database with timestamp when user joined
5. People can join waitlists for different applications

## Database Schema (Supabase)

### Core Tables

```sql
-- Applications table (multi-tenant support)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waitlist entries table
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL, -- RFC 5321 max email length
  source_url TEXT NOT NULL,
  country VARCHAR(3), -- ISO 3166-1 alpha-3 country code
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT false,
  verification_token UUID DEFAULT gen_random_uuid(),
  metadata JSONB DEFAULT '{}',
  
  -- Prevent duplicate emails per application
  UNIQUE(application_id, email)
);

-- Indexes for performance
CREATE INDEX idx_waitlist_entries_application_id ON waitlist_entries(application_id);
CREATE INDEX idx_waitlist_entries_email ON waitlist_entries(email);
CREATE INDEX idx_waitlist_entries_joined_at ON waitlist_entries(joined_at DESC);
CREATE INDEX idx_waitlist_entries_country ON waitlist_entries(country);
CREATE INDEX idx_applications_domain ON applications(domain);

-- Row Level Security (RLS)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Applications are viewable by authenticated users" 
  ON applications FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Waitlist entries are viewable by app owners" 
  ON waitlist_entries FOR SELECT 
  TO authenticated 
  USING (true); -- Adjust based on your auth requirements
```

### Extended Schema for Multiple Form Types

```sql
-- Add form types table for different form configurations
CREATE TABLE form_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'waitlist', 'feedback', 'contact', etc.
  description TEXT,
  schema JSONB NOT NULL, -- Field definitions and validation rules
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify applications table to support multiple form types
ALTER TABLE applications 
ADD COLUMN supported_form_types UUID[] DEFAULT ARRAY[]::UUID[];

-- Create generic form_submissions table (can replace waitlist_entries)
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id),
  form_type_id UUID NOT NULL REFERENCES form_types(id),
  form_data JSONB NOT NULL, -- Flexible data storage
  source_url TEXT NOT NULL,
  country VARCHAR(3),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending', -- pending, processed, archived
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(application_id, form_type_id, (form_data->>'email')) -- Conditional uniqueness
);
```

## API Function Architecture (Supabase Edge Function)

### Waitlist-Specific Implementation

```typescript
// supabase/functions/join-waitlist/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface JoinWaitlistRequest {
  applicationId: string
  email: string
  sourceUrl: string
  country?: string
}

interface JoinWaitlistResponse {
  success: boolean
  message: string
  data?: {
    id: string
    position?: number
  }
}

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
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body: JoinWaitlistRequest = await req.json()
    const { applicationId, email, sourceUrl, country } = body

    // Get client IP and other metadata
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = req.headers.get('user-agent') || ''
    const referrer = req.headers.get('referer') || ''

    // Validate application exists and is active
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, is_active')
      .eq('id', applicationId)
      .eq('is_active', true)
      .single()

    if (appError || !app) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid application' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert waitlist entry
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        application_id: applicationId,
        email: email.toLowerCase().trim(),
        source_url: sourceUrl,
        country: country || null,
        ip_address: clientIP,
        user_agent: userAgent,
        referrer: referrer
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return new Response(
          JSON.stringify({ success: false, message: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    // Get waitlist position
    const { count } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', applicationId)
      .lte('joined_at', new Date().toISOString())

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully joined waitlist',
        data: {
          id: data.id,
          position: count || 0
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Generic Form Handler (Extended)

```typescript
// Generic form submission handler
interface FormSubmissionRequest {
  applicationId: string
  formTypeId: string
  formData: Record<string, any>
  sourceUrl: string
  country?: string
}

// Form type configurations
const FORM_SCHEMAS = {
  waitlist: {
    fields: [
      { name: 'email', type: 'email', required: true, unique: true }
    ],
    rateLimits: { ip: 5, email: 1 }
  },
  feedback: {
    fields: [
      { name: 'email', type: 'email', required: false },
      { name: 'message', type: 'text', required: true, maxLength: 1000 },
      { name: 'rating', type: 'number', min: 1, max: 5 },
      { name: 'category', type: 'select', options: ['bug', 'feature', 'general'] }
    ],
    rateLimits: { ip: 10, email: 3 }
  }
}
```

## Frontend Implementation

### React Waitlist Component

```tsx
import { useState } from 'react'

interface WaitlistFormProps {
  applicationId: string
  sourceUrl?: string
}

export function WaitlistForm({ applicationId, sourceUrl }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          email,
          sourceUrl: sourceUrl || window.location.href,
          country: await getCountryCode() // Optional: detect from IP
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setMessage(`Welcome! You're #${data.data.position} on the waitlist.`)
        setEmail('')
      } else {
        setMessage(data.message)
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="waitlist-success">
        <h3>🎉 You're on the list!</h3>
        <p>{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="waitlist-form">
      <div className="form-group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading || !email}>
          {loading ? 'Joining...' : 'Join Waitlist'}
        </button>
      </div>
      {message && (
        <p className={`message ${success ? 'success' : 'error'}`}>
          {message}
        </p>
      )}
    </form>
  )
}

// Helper function to detect country (optional)
async function getCountryCode(): Promise<string | undefined> {
  try {
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    return data.country_code
  } catch {
    return undefined
  }
}
```

### Generic Form Builder (Extended)

```tsx
// Generic form component
interface FormBuilderProps {
  applicationId: string
  formTypeId: string
  schema: FormSchema
}

export function FormBuilder({ applicationId, formTypeId, schema }: FormBuilderProps) {
  // Dynamic form generation based on schema
  // Handles different field types: text, email, textarea, select, radio, etc.
}

// Specific feedback form
export function FeedbackForm({ applicationId }: { applicationId: string }) {
  return (
    <FormBuilder
      applicationId={applicationId}
      formTypeId="feedback"
      schema={FEEDBACK_FORM_SCHEMA}
    />
  )
}
```

## Validation & Security

### Database Validation

```sql
-- Database constraints and validation functions
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Add check constraint
ALTER TABLE waitlist_entries 
ADD CONSTRAINT valid_email_format 
CHECK (validate_email(email));

-- URL validation
CREATE OR REPLACE FUNCTION validate_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN url ~* '^https?://[^\s/$.?#].[^\s]*$';
END;
$$ LANGUAGE plpgsql;

ALTER TABLE waitlist_entries 
ADD CONSTRAINT valid_source_url 
CHECK (validate_url(source_url));
```

### Rate Limiting & Security

```typescript
// Rate limiting implementation
import { Redis } from 'https://deno.land/x/redis@v0.29.0/mod.ts'

async function checkRateLimit(ip: string, email: string): Promise<boolean> {
  const redis = await Redis.connect(Deno.env.get('REDIS_URL') || '')
  
  // IP-based rate limiting: 5 requests per hour
  const ipKey = `waitlist:ip:${ip}`
  const ipCount = await redis.incr(ipKey)
  if (ipCount === 1) await redis.expire(ipKey, 3600)
  if (ipCount > 5) return false
  
  // Email-based rate limiting: 1 request per day
  const emailKey = `waitlist:email:${email}`
  const emailExists = await redis.exists(emailKey)
  if (emailExists) return false
  
  await redis.setex(emailKey, 86400, '1')
  return true
}

// Spam detection
function detectSpam(email: string, sourceUrl: string): boolean {
  const disposableEmailDomains = [
    '10minutemail.com', 'guerrillamail.com', 'tempmail.org'
  ]
  
  const domain = email.split('@')[1]
  if (disposableEmailDomains.includes(domain)) return true
  
  // Additional spam checks
  if (email.includes('+spam') || email.includes('+test')) return true
  
  return false
}
```

### Security Headers

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
}
```

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Create Supabase project
   - Run database schema migrations
   - Set up RLS policies
   - Create initial applications record

2. **Basic API Function**
   - Deploy Edge Function for waitlist joining
   - Implement basic validation
   - Test with sample data

### Phase 2: Security & Validation (Week 2)
1. **Input Validation**
   - Add database constraints
   - Implement server-side validation
   - Add spam detection

2. **Rate Limiting**
   - Set up Redis for rate limiting
   - Implement IP and email-based limits
   - Add security headers

### Phase 3: Frontend Integration (Week 3)
1. **React Component**
   - Create reusable waitlist form component
   - Add loading states and error handling
   - Implement country detection

2. **Styling & UX**
   - Add responsive design
   - Success/error messaging
   - Form accessibility

### Phase 4: Analytics & Management (Week 4)
1. **Admin Dashboard**
   - View waitlist entries
   - Export functionality
   - Analytics and metrics

2. **Email Notifications**
   - Welcome emails
   - Position updates
   - Launch notifications

### Phase 5: Advanced Features (Week 5+)
1. **Email Verification**
   - Verification tokens
   - Double opt-in process

2. **Referral System**
   - Referral tracking
   - Position improvements for referrals

3. **A/B Testing**
   - Multiple form variants
   - Conversion tracking

## Extensibility

This architecture supports extending to additional form types:

1. **Contact Forms** - Customer inquiries with routing
2. **Survey Forms** - Multiple question types and logic
3. **Newsletter Signup** - With preference management
4. **Beta Access Requests** - With qualification criteria
5. **Support Tickets** - With priority and categorization
6. **Event Registration** - With capacity and requirements
7. **Product Feedback** - With ratings and categorization

## Migration Strategy

To transition from waitlist-specific to generic forms:

1. **Phase 1**: Create new tables alongside existing ones
2. **Phase 2**: Migrate waitlist data to generic form_submissions
3. **Phase 3**: Update API to handle multiple form types
4. **Phase 4**: Remove old waitlist-specific tables

## Key Benefits

- **Multi-tenant**: Supports multiple applications
- **Scalable**: Uses Supabase's managed infrastructure
- **Secure**: RLS, rate limiting, input validation
- **Real-time**: Get waitlist position immediately
- **Analytics-ready**: Rich metadata collection
- **Flexible**: JSONB metadata for future extensions
- **Extensible**: Easy to add new form types (feedback, contact, etc.)