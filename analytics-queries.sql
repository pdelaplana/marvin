-- MVP Waitlist Analytics Queries
-- Run these queries in Supabase SQL Editor to test analytics functionality

-- ========================================
-- BASIC ANALYTICS QUERIES
-- ========================================

-- 1. Total signups per day with application names
SELECT 
  a.application_name,
  DATE(w.created_at) as date,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_name, DATE(w.created_at)
ORDER BY date DESC, signups DESC;

-- 2. Signups by country with application context
SELECT 
  a.application_name,
  w.country,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.country IS NOT NULL
GROUP BY a.application_name, w.country
ORDER BY signups DESC;

-- 3. Top source URLs by application
SELECT 
  a.application_name,
  w.source_url,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_name, w.source_url
ORDER BY signups DESC
LIMIT 10;

-- 4. Cross-application summary
SELECT 
  a.application_name,
  COUNT(w.id) as total_signups,
  MIN(w.created_at) as first_signup,
  MAX(w.created_at) as latest_signup,
  COUNT(DISTINCT w.country) as countries_represented
FROM applications a
LEFT JOIN waitlist_entries w ON a.application_id = w.application_id
GROUP BY a.application_id, a.application_name
ORDER BY total_signups DESC;

-- ========================================
-- DETAILED ANALYTICS QUERIES  
-- ========================================

-- 5. Hourly signup patterns
SELECT 
  a.application_name,
  EXTRACT(hour FROM w.created_at) as hour_of_day,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_name, EXTRACT(hour FROM w.created_at)
ORDER BY a.application_name, hour_of_day;

-- 6. Daily growth rate
WITH daily_signups AS (
  SELECT 
    a.application_name,
    DATE(w.created_at) as signup_date,
    COUNT(*) as daily_count
  FROM waitlist_entries w
  JOIN applications a ON w.application_id = a.application_id
  GROUP BY a.application_name, DATE(w.created_at)
),
cumulative_signups AS (
  SELECT 
    application_name,
    signup_date,
    daily_count,
    SUM(daily_count) OVER (
      PARTITION BY application_name 
      ORDER BY signup_date 
      ROWS UNBOUNDED PRECEDING
    ) as cumulative_count
  FROM daily_signups
)
SELECT 
  application_name,
  signup_date,
  daily_count,
  cumulative_count,
  CASE 
    WHEN LAG(cumulative_count) OVER (PARTITION BY application_name ORDER BY signup_date) IS NULL THEN 0
    ELSE ROUND(
      ((cumulative_count - LAG(cumulative_count) OVER (PARTITION BY application_name ORDER BY signup_date)) * 100.0 / 
       LAG(cumulative_count) OVER (PARTITION BY application_name ORDER BY signup_date)), 2
    )
  END as growth_rate_percent
FROM cumulative_signups
ORDER BY application_name, signup_date DESC;

-- 7. Email domain analysis
SELECT 
  a.application_name,
  SPLIT_PART(w.email, '@', 2) as email_domain,
  COUNT(*) as signups
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_name, SPLIT_PART(w.email, '@', 2)
ORDER BY signups DESC
LIMIT 20;

-- ========================================
-- QUICK VERIFICATION QUERIES
-- ========================================

-- 8. Quick data check - all tables and counts
SELECT 'applications' as table_name, COUNT(*) as record_count FROM applications
UNION ALL
SELECT 'waitlist_entries' as table_name, COUNT(*) as record_count FROM waitlist_entries;

-- 9. Recent signups with all details
SELECT 
  a.application_name,
  w.email,
  w.source_url,
  w.country,
  w.created_at
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
ORDER BY w.created_at DESC
LIMIT 10;

-- 10. Data quality check
SELECT 
  a.application_name,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN w.email IS NOT NULL AND w.email != '' THEN 1 END) as valid_emails,
  COUNT(CASE WHEN w.source_url IS NOT NULL AND w.source_url != '' THEN 1 END) as valid_source_urls,
  COUNT(CASE WHEN w.country IS NOT NULL AND w.country != '' THEN 1 END) as entries_with_country,
  ROUND(
    COUNT(CASE WHEN w.country IS NOT NULL AND w.country != '' THEN 1 END) * 100.0 / COUNT(*), 2
  ) as country_completion_rate
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY a.application_id, a.application_name
ORDER BY total_entries DESC;

-- ========================================
-- EXPORT QUERIES (FOR CSV DOWNLOAD)
-- ========================================

-- 11. Full export with application names
SELECT 
  a.application_name,
  w.email,
  w.source_url,
  w.country,
  w.created_at,
  w.id as entry_id
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
ORDER BY w.created_at DESC;

-- 12. Summary export for reporting
SELECT 
  DATE(w.created_at) as date,
  a.application_name,
  COUNT(*) as daily_signups,
  COUNT(DISTINCT w.country) as countries,
  COUNT(DISTINCT SPLIT_PART(w.email, '@', 2)) as unique_domains
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
GROUP BY DATE(w.created_at), a.application_name
ORDER BY date DESC, daily_signups DESC;