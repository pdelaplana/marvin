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