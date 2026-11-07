# Frontend Integration Guide

## Overview
This guide provides frontend teams with everything needed to integrate with the MVP waitlist backend API.

## API Configuration

### Endpoints
- **Local Development**: `http://127.0.0.1:54321/functions/v1/join-waitlist`
- **Production**: `https://[your-supabase-project].supabase.co/functions/v1/join-waitlist`

### Application ID
**Current Application ID**: `48bc5a4b-f8e4-4c4e-8832-1a766715641e`

### Authentication
- **Local**: Service role key or anon key from local Supabase
- **Production**: Use your Supabase anon key

## API Request Format

### Endpoint: POST `/functions/v1/join-waitlist`

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer [your-supabase-anon-key]'
}
```

**Request Body:**
```javascript
{
  "applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e",
  "email": "user@example.com",
  "sourceUrl": "https://yoursite.com/landing",  // Current page URL
  "country": "US"  // Optional: 2-letter country code
}
```

## API Response Format

### Success Response (200)
```javascript
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",  // UUID of created entry
  "message": "Successfully joined waitlist"
}
```

### Error Responses

**Missing Required Fields (400)**
```javascript
{
  "success": false,
  "message": "Missing required fields"
}
```

**Invalid Application ID (400)**
```javascript
{
  "success": false,
  "message": "Invalid application ID"
}
```

**Duplicate Email (409)**
```javascript
{
  "success": false,
  "message": "Email already registered"
}
```

**Server Error (500)**
```javascript
{
  "success": false,
  "message": "Internal server error"
}
```

## JavaScript Implementation Example

### Basic Implementation
```javascript
const WAITLIST_CONFIG = {
  SUPABASE_URL: 'https://[your-project].supabase.co',
  SUPABASE_ANON_KEY: '[your-anon-key]',
  APPLICATION_ID: '48bc5a4b-f8e4-4c4e-8832-1a766715641e'
};

async function joinWaitlist(email, country = null) {
  try {
    const response = await fetch(`${WAITLIST_CONFIG.SUPABASE_URL}/functions/v1/join-waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WAITLIST_CONFIG.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        applicationId: WAITLIST_CONFIG.APPLICATION_ID,
        email: email,
        sourceUrl: window.location.href,
        country: country
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      message: `Network error: ${error.message}`
    };
  }
}
```

### React Hook Example
```javascript
import { useState } from 'react';

export function useWaitlist() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const joinWaitlist = async (email, country) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          applicationId: process.env.REACT_APP_APPLICATION_ID,
          email,
          sourceUrl: window.location.href,
          country
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { joinWaitlist, loading, error };
}
```

### Environment Variables
Create these environment variables in your frontend project:

```bash
# Production
REACT_APP_SUPABASE_URL=https://[your-project].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
REACT_APP_APPLICATION_ID=48bc5a4b-f8e4-4c4e-8832-1a766715641e

# Local Development (if testing against local Supabase)
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
REACT_APP_APPLICATION_ID=48bc5a4b-f8e4-4c4e-8832-1a766715641e
```

## Form Implementation

### Simple HTML Form
```html
<form id="waitlistForm">
  <input type="email" id="email" required placeholder="Enter your email">
  <input type="text" id="country" placeholder="US, CA, UK, etc." maxlength="2">
  <button type="submit">Join Waitlist</button>
</form>

<script>
document.getElementById('waitlistForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const country = document.getElementById('country').value;
  
  const result = await joinWaitlist(email, country);
  
  if (result.success) {
    alert('Successfully joined waitlist!');
  } else {
    alert(`Error: ${result.message}`);
  }
});
</script>
```

### React Component
```jsx
import React, { useState } from 'react';
import { useWaitlist } from './hooks/useWaitlist';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { joinWaitlist, loading, error } = useWaitlist();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await joinWaitlist(email, country);
    
    if (result.success) {
      setSubmitted(true);
      setEmail('');
      setCountry('');
    }
  };

  if (submitted) {
    return <div>🎉 Successfully joined the waitlist!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <input
        type="text"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder="US, CA, UK, etc."
        maxLength="2"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
      {error && <div style={{color: 'red'}}>{error}</div>}
    </form>
  );
}
```

## Country Detection (Optional)

### Auto-detect User Country
```javascript
async function detectCountry() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code; // Returns 2-letter country code
  } catch (error) {
    console.warn('Could not detect country:', error);
    return null;
  }
}

// Use in form
const autoCountry = await detectCountry();
const result = await joinWaitlist(email, country || autoCountry);
```

## Error Handling Best Practices

### User-Friendly Messages
```javascript
function getDisplayMessage(apiResponse) {
  const errorMessages = {
    'Email already registered': 'You\'re already on our waitlist! We\'ll be in touch soon.',
    'Invalid application ID': 'Something went wrong. Please try again.',
    'Missing required fields': 'Please enter a valid email address.',
    'Internal server error': 'Server error. Please try again in a few minutes.'
  };

  if (apiResponse.success) {
    return '🎉 Welcome to the waitlist! We\'ll notify you when we launch.';
  }

  return errorMessages[apiResponse.message] || `Error: ${apiResponse.message}`;
}
```

## Testing

### Quick Test Commands
```bash
# Test valid request (replace URL with your endpoint)
curl -X POST [your-endpoint]/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "test@example.com", "sourceUrl": "https://yoursite.com", "country": "US"}'

# Test duplicate email (should return error)
curl -X POST [your-endpoint]/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "test@example.com", "sourceUrl": "https://yoursite.com", "country": "US"}'
```

## Production Checklist

Before going live, ensure:
- [ ] Production Supabase URL configured
- [ ] Production anon key configured  
- [ ] Application ID verified in production database
- [ ] CORS settings allow your domain
- [ ] Error handling implemented
- [ ] Form validation in place
- [ ] Success/error user feedback working
- [ ] Analytics/tracking implemented if needed

## Support

For questions or issues with the waitlist API:
1. Check the API response for error details
2. Verify your application ID matches the database
3. Ensure proper authentication headers
4. Test with curl commands first
5. Check Supabase function logs if available

## Data Structure Reference

The waitlist entry will be stored with:
- `id`: UUID (auto-generated)
- `application_id`: Your application UUID
- `email`: User's email address
- `source_url`: The page URL where they signed up
- `country`: 2-letter country code (optional)
- `created_at`: Timestamp (auto-generated)