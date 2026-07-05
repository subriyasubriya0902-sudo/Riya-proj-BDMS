-- Add urgency_level column to blood_requests
ALTER TABLE blood_requests
  ADD COLUMN IF NOT EXISTS urgency_level text NOT NULL DEFAULT 'normal'
  CHECK (urgency_level IN ('critical','urgent','normal'));

CREATE INDEX IF NOT EXISTS idx_requests_urgency ON blood_requests (urgency_level);
