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