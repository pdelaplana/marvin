# MVP Waitlist Testing Steps

## Prerequisites
- Local Supabase development stack running (`npx supabase start`)
- Edge Function server running (`npx supabase functions serve join-waitlist --debug`)
- Application record created in database with known application_id

## Test Data
- **Application ID**: `48bc5a4b-f8e4-4c4e-8832-1a766715641e`
- **Local API URL**: `http://127.0.0.1:54321/functions/v1/join-waitlist`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

## 1. Edge Function API Tests

### Test 1: Valid Request
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "test@example.com", "sourceUrl": "http://localhost:3000", "country": "US"}'
```

**Expected Response:**
```json
{"success":true,"id":"[uuid]","message":"Successfully joined waitlist"}
```

### Test 2: Duplicate Email Prevention
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "test@example.com", "sourceUrl": "http://localhost:3000", "country": "US"}'
```

**Expected Response:**
```json
{"success":false,"message":"Email already registered"}
```

### Test 3: Different Email (Success)
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "user2@example.com", "sourceUrl": "http://localhost:3000/signup", "country": "CA"}'
```

**Expected Response:**
```json
{"success":true,"id":"[uuid]","message":"Successfully joined waitlist"}
```

### Test 4: Invalid Application ID
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{"applicationId": "invalid-app-id", "email": "test3@example.com", "sourceUrl": "http://localhost:3000", "country": "US"}'
```

**Expected Response:**
```json
{"success":false,"message":"Invalid application ID"}
```

### Test 5: Missing Required Fields
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": ""}'
```

**Expected Response:**
```json
{"success":false,"message":"Missing required fields"}
```

### Test 6: Invalid Email Format
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "invalid-email", "sourceUrl": "http://localhost:3000", "country": "US"}'
```

**Expected Response:**
Database constraint error (should be handled by database validation)

## 2. Frontend End-to-End Test

### HTML Form Test
1. **Open test form**: `file:///D:/Repos/marvin/test-form.html`
2. **Verify configuration display**: Should show local URL and application ID
3. **Test valid email**: Enter new email, should show success message
4. **Test duplicate email**: Enter same email, should show error message
5. **Test country detection**: Should auto-populate country field

### Form Configuration (Local Testing)
```javascript
const CONFIG = {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    APPLICATION_ID: '48bc5a4b-f8e4-4c4e-8832-1a766715641e'
};
```

## 3. Database Verification Steps

### Check Data in Supabase Studio
1. **Open Supabase Studio**: http://127.0.0.1:54323
2. **Navigate to Table Editor**
3. **View `applications` table**: Should show 1 record with your application
4. **View `waitlist_entries` table**: Should show entries from tests
5. **Verify data integrity**: Check all fields are populated correctly

### Analytics Queries Test
Run these queries in Supabase SQL Editor:

```sql
-- Total signups per day with application names
SELECT 
  a.application_name,
  DATE(w.created_at) as date,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_name, DATE(w.created_at)
ORDER BY date DESC;
```

```sql
-- Signups by country
SELECT 
  a.application_name,
  w.country,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.country IS NOT NULL
GROUP BY a.application_name, w.country
ORDER BY signups DESC;
```

```sql
-- Top source URLs
SELECT 
  a.application_name,
  w.source_url,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_name, w.source_url
ORDER BY signups DESC
LIMIT 10;
```

## 4. Complete Test Suite Runner

### Quick Test All Functionality
```bash
# Test 1: Valid request
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "quicktest@example.com", "sourceUrl": "http://localhost:3000", "country": "US"}'

# Test 2: Duplicate prevention
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" -d '{"applicationId": "48bc5a4b-f8e4-4c4e-8832-1a766715641e", "email": "quicktest@example.com", "sourceUrl": "http://localhost:3000", "country": "US"}'

# Test 3: Invalid app ID
curl -X POST http://127.0.0.1:54321/functions/v1/join-waitlist -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" -d '{"applicationId": "invalid-id", "email": "test@example.com", "sourceUrl": "http://localhost:3000", "country": "US"}'
```

## Test Results Expected
- ✅ Valid requests return success with UUID
- ✅ Duplicate emails return 409 error
- ✅ Invalid app IDs return 400 error  
- ✅ Missing fields return 400 error
- ✅ Data appears correctly in database
- ✅ Frontend form works end-to-end
- ✅ Analytics queries return data

## Troubleshooting
- If API calls fail, check Edge Function server is running
- If database errors, check Supabase local stack is running
- If form doesn't work, check browser console for CORS errors
- If no data in database, check application_id matches exactly

## Next Steps After Testing
1. Verify analytics queries work
2. Set up production deployment
3. Configure GitHub CI/CD
4. Document application_id for teams