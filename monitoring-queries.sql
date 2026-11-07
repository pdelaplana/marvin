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

-- Email delivery trends (hourly breakdown for today)
SELECT 
  EXTRACT(HOUR FROM w.created_at) as signup_hour,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN w.email_sent = true THEN 1 END) as emails_sent,
  ROUND(
    COUNT(CASE WHEN w.email_sent = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent
FROM waitlist_entries w
WHERE DATE(w.created_at) = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM w.created_at)
ORDER BY signup_hour;

-- Most common email errors
SELECT 
  w.email_error,
  COUNT(*) as error_count,
  COUNT(DISTINCT w.email) as affected_emails,
  MAX(w.created_at) as latest_occurrence
FROM waitlist_entries w
WHERE w.email_sent = false 
  AND w.email_error IS NOT NULL
  AND w.created_at >= NOW() - INTERVAL '7 days'
GROUP BY w.email_error
ORDER BY error_count DESC
LIMIT 10;

-- Successful email delivery with message IDs
SELECT 
  w.email,
  a.application_name,
  w.email_message_id,
  w.created_at,
  w.email_sent_at,
  EXTRACT(EPOCH FROM (w.email_sent_at - w.created_at)) as send_delay_seconds
FROM waitlist_entries w
JOIN applications a ON w.application_id = a.application_id
WHERE w.email_sent = true 
  AND w.email_message_id IS NOT NULL
  AND w.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY w.created_at DESC
LIMIT 50;

-- Unsubscribe token verification (ensure all entries have tokens)
SELECT 
  COUNT(*) as total_entries,
  COUNT(unsubscribe_token) as entries_with_tokens,
  COUNT(*) - COUNT(unsubscribe_token) as entries_missing_tokens
FROM waitlist_entries;

-- Email volume by country (for applications that collect country data)
SELECT 
  COALESCE(w.country, 'Unknown') as country,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN w.email_sent = true THEN 1 END) as emails_sent,
  ROUND(
    COUNT(CASE WHEN w.email_sent = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent
FROM waitlist_entries w
WHERE w.created_at >= NOW() - INTERVAL '30 days'
GROUP BY w.country
ORDER BY total_signups DESC
LIMIT 20;