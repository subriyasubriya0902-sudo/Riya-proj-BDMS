-- Add text hospital_location to blood_requests for human-readable address
ALTER TABLE blood_requests
  ADD COLUMN IF NOT EXISTS hospital_location text;
