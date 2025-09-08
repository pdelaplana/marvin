# MVP Waitlist Backend Utility

## Overview

A minimal backend utility function for collecting waitlist signups. Built on Supabase Edge Functions with basic email collection, URL tracking, and country data capture. Now includes proper application management with a relational database structure.

## Core Functionality

- Accept email + application ID via POST request
- Validate application exists before creating entries
- Capture source URL and country (optional)
- Store in database with timestamp
- Return success/failure response
- Prevent duplicate emails per application
- Support multiple applications with proper relational structure

## Database Schema

```sql
-- Applications table for multi-application support
CREATE TABLE applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waitlist entries table with foreign key to applications
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  source_url TEXT NOT NULL,
  country VARCHAR(2), -- ISO alpha-2 country code (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate emails per application
  UNIQUE(application_id, email)
);

-- Essential indexes for performance
CREATE INDEX idx_waitlist_entries_created_at ON waitlist_entries(created_at);
CREATE INDEX idx_waitlist_entries_country ON waitlist_entries(country);
CREATE INDEX idx_waitlist_entries_app_id ON waitlist_entries(application_id);
CREATE INDEX idx_applications_name ON applications(application_name);

-- Basic email validation
ALTER TABLE waitlist_entries 
ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

## Edge Function Implementation

**File: `supabase/functions/join-waitlist/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface JoinWaitlistRequest {
  applicationId: string
  email: string
  sourceUrl: string
  country?: string
}

serve(async (req: Request): Promise<Response> => {
  // CORS headers
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { applicationId, email, sourceUrl, country }: JoinWaitlistRequest = await req.json()

    // Basic validation
    if (!applicationId || !email || !sourceUrl) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## API Usage

### Request Format
```http
POST /functions/v1/join-waitlist
Content-Type: application/json

{
  "applicationId": "your-app-uuid",
  "email": "user@example.com",
  "sourceUrl": "https://yoursite.com/landing-page",
  "country": "US"
}
```

### Response Format

**Success (201):**
```json
{
  "success": true,
  "id": "uuid-of-entry",
  "message": "Successfully joined waitlist"
}
```

**Duplicate Email (409):**
```json
{
  "success": false,
  "message": "Email already registered"
}
```

**Invalid Application (400):**
```json
{
  "success": false,
  "message": "Invalid application ID"
}
```

**Other Errors (400/500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

## Frontend Integration

### JavaScript Example
```javascript
async function joinWaitlist(email) {
  try {
    const response = await fetch('https://your-project.supabase.co/functions/v1/join-waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        applicationId: 'your-app-uuid',
        email: email,
        sourceUrl: window.location.href,
        country: await detectCountry() // Optional
      })
    })

    const data = await response.json()
    
    if (data.success) {
      console.log('Joined waitlist successfully!')
      return data
    } else {
      console.error('Failed to join:', data.message)
      return null
    }
  } catch (error) {
    console.error('Network error:', error)
    return null
  }
}

// Optional country detection
async function detectCountry() {
  try {
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    return data.country_code
  } catch {
    return null
  }
}
```

### React Component Example
```jsx
import { useState } from 'react'

export function WaitlistForm({ applicationId }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await joinWaitlist(email)
    
    if (result) {
      setSuccess(true)
      setMessage('Successfully joined the waitlist!')
      setEmail('')
    } else {
      setMessage('Something went wrong. Please try again.')
    }
    
    setLoading(false)
  }

  if (success) {
    return <div className="success-message">{message}</div>
  }

  return (
    <form onSubmit={handleSubmit}>
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
      {message && <p className="error-message">{message}</p>}
    </form>
  )
}
```

## Application Management

### Creating Applications

**Method 1: Supabase Console (Recommended for MVP)**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. Open the `applications` table
4. Click "Insert" → "Insert row"
5. Add `application_name` (application_id will be auto-generated)
6. Copy the generated `application_id` for use in your frontend

**Method 2: Programmatic Creation (Optional)**
Create a simple Edge Function for application management:

```typescript
// supabase/functions/create-application/index.ts
serve(async (req: Request) => {
  const { applicationName } = await req.json()
  
  const { data, error } = await supabase
    .from('applications')
    .insert({ application_name: applicationName })
    .select('application_id, application_name')
    .single()
    
  if (error) throw error
  
  return new Response(JSON.stringify({ success: true, data }))
})
```

## Data Management

Use Supabase's built-in admin interface to:
- View all waitlist entries with application names
- Filter by application, date, country
- Export data as CSV
- Run SQL queries for analytics across applications

### Useful Analytics Queries

**Total signups per day with application names:**
```sql
SELECT 
  a.application_name,
  DATE(w.created_at) as date,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.application_id = 'your-app-uuid'
GROUP BY a.application_name, DATE(w.created_at)
ORDER BY date DESC;
```

**Signups by country with application context:**
```sql
SELECT 
  a.application_name,
  w.country,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.application_id = 'your-app-uuid'
  AND w.country IS NOT NULL
GROUP BY a.application_name, w.country
ORDER BY signups DESC;
```

**Top source URLs by application:**
```sql
SELECT 
  a.application_name,
  w.source_url,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.application_id = 'your-app-uuid'
GROUP BY a.application_name, w.source_url
ORDER BY signups DESC
LIMIT 10;
```

**Cross-application summary:**
```sql
SELECT 
  a.application_name,
  COUNT(w.id) as total_signups,
  MIN(w.created_at) as first_signup,
  MAX(w.created_at) as latest_signup
FROM applications a
LEFT JOIN waitlist_entries w ON a.application_id = w.application_id
GROUP BY a.application_id, a.application_name
ORDER BY total_signups DESC;
```

## CI/CD with GitHub Actions

### Repository Structure
```
your-waitlist-repo/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── supabase/
│   ├── functions/
│   │   └── join-waitlist/
│   │       └── index.ts
│   └── migrations/
│       └── 20240101000000_initial_schema.sql
├── package.json (optional)
└── README.md
```

### GitHub Secrets Setup
Add these secrets to your GitHub repository settings:
- `SUPABASE_PROJECT_ID` - Your Supabase project reference ID
- `SUPABASE_ACCESS_TOKEN` - Generate from Supabase dashboard

### GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Supabase

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3

    - uses: supabase/setup-cli@v1
      with:
        version: latest

    - name: Start Supabase local development setup
      run: supabase start

    - name: Verify generated types are checked in
      run: |
        supabase gen types typescript --local > types.gen.ts
        if ! git diff --ignore-space-at-eol --exit-code --quiet types.gen.ts; then
          echo "Detected uncommitted changes after build. See status below:"
          git diff
          exit 1
        fi

    - name: Run tests (if you have them)
      run: |
        # Add your test commands here
        # npm test

    - name: Deploy to Supabase
      if: github.ref == 'refs/heads/main'
      run: |
        supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        supabase db push
        supabase functions deploy
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Database Migrations

Create version-controlled migration files:

**File: `supabase/migrations/20240101000000_initial_schema.sql`**

```sql
-- Applications table for multi-application support
CREATE TABLE applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waitlist entries table with foreign key to applications
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  source_url TEXT NOT NULL,
  country VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, email)
);

-- Essential indexes
CREATE INDEX idx_waitlist_entries_created_at ON waitlist_entries(created_at);
CREATE INDEX idx_waitlist_entries_country ON waitlist_entries(country);
CREATE INDEX idx_waitlist_entries_app_id ON waitlist_entries(application_id);
CREATE INDEX idx_applications_name ON applications(application_name);

-- Basic email validation
ALTER TABLE waitlist_entries 
ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

### Local Development Workflow

```bash
# Initial setup
git clone your-repo
supabase start
supabase db reset

# Development cycle
# 1. Make changes to functions or migrations
# 2. Test locally
supabase functions serve

# 3. Commit and push (triggers deployment)
git add .
git commit -m "Add feature"
git push origin main
```

### Environment-Specific Deployments (Optional)

For staging vs production environments:

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        environment: 
          - ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    
    environment: ${{ matrix.environment }}
    
    steps:
    - uses: actions/checkout@v3
    - uses: supabase/setup-cli@v1
    
    - name: Deploy to ${{ matrix.environment }}
      run: |
        supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
        supabase db push
        supabase functions deploy
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Deployment

### Manual Deployment (for initial setup)

1. **Set up Supabase project:**
   ```bash
   supabase init
   supabase start
   ```

2. **Run database migrations:**
   ```bash
   supabase db reset
   ```

3. **Deploy Edge Function:**
   ```bash
   supabase functions deploy join-waitlist
   ```

4. **Set environment variables in Supabase dashboard:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **Create your first application:**
   - Use Supabase console to add a record to the `applications` table
   - Copy the generated `application_id` for your frontend

### Automated Deployment (recommended)

After initial setup, all deployments happen automatically via GitHub Actions:
- Push to `main` branch triggers production deployment
- Database migrations run automatically
- Edge Functions deploy automatically
- Zero-downtime deployments

## Security Considerations

### Included (MVP):
- Basic email format validation
- Application ID validation
- Duplicate prevention
- HTTPS enforcement (Supabase default)
- Input sanitization (trim, lowercase)
- Foreign key constraints for data integrity

### Future Enhancements:
- Rate limiting per IP/email
- Email verification
- Spam detection
- CAPTCHA integration

## Monitoring & Maintenance

- Use Supabase logs for error monitoring
- Monitor database growth via Supabase dashboard
- Set up alerts for unusual activity patterns
- Regular database cleanup if needed
- Monitor application usage across multiple apps

## Implementation Timeline

**Total Time: 5-7 hours**

**Note:** The addition of the applications table and CI/CD adds minimal complexity while providing proper relational structure, multi-application support, and professional deployment automation.

1. **Setup (1.5 hours):**
   - Create Supabase project
   - Set up GitHub repository
   - Configure GitHub Actions secrets
   - Configure environment

2. **Database (45 minutes):**
   - Create migration files
   - Create applications and waitlist_entries tables
   - Add indexes and constraints
   - Test locally with `supabase db reset`

3. **Edge Function (2 hours):**
   - Write and test function with application validation
   - Handle edge cases
   - Test locally with `supabase functions serve`

4. **CI/CD Setup (1 hour):**
   - Create GitHub Actions workflow
   - Test deployment pipeline
   - Verify automated deployments work

5. **Testing (1 hour):**
   - Test deployment flow
   - Verify production deployment
   - Test with different scenarios

6. **Frontend Integration (1-2 hours):**
   - Create simple test form
   - Test against deployed endpoints
   - Verify end-to-end flow

This MVP provides a robust foundation for waitlist collection while maintaining simplicity and fast implementation. The relational structure enables proper multi-application support and enhanced analytics capabilities.