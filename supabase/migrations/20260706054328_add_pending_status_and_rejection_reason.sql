/*
# Blood Request Approval Workflow

1. Changes to `blood_requests`
   - Add `'pending'` as a valid status value (extends the existing CHECK constraint).
     New requests submitted by non-admin users default to 'pending'.
     Admin-created requests continue to default to 'open' (auto-approved).
   - Add `rejection_reason` (text, nullable) — admin-supplied reason when rejecting.
   - Add `reviewed_at` (timestamptz, nullable) — timestamp of approval or rejection.
   - Add `reviewed_by` (uuid, nullable) — references the admin profile who acted.

2. Security
   - No new RLS policies required; existing admin UPDATE policy covers the new columns.
   - The CHECK constraint is extended to allow 'pending'.

3. Notes
   - Existing rows with status 'open', 'fulfilled', or 'cancelled' are unaffected.
   - The old CHECK constraint is dropped and replaced (ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT).
   - All new columns are nullable so existing rows require no backfill.
*/

-- Extend the status CHECK constraint to include 'pending'
ALTER TABLE blood_requests
  DROP CONSTRAINT IF EXISTS blood_requests_status_check;

ALTER TABLE blood_requests
  ADD CONSTRAINT blood_requests_status_check
  CHECK (status IN ('pending', 'open', 'fulfilled', 'cancelled'));

-- Add rejection_reason column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blood_requests' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE blood_requests ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Add reviewed_at column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blood_requests' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE blood_requests ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

-- Add reviewed_by column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blood_requests' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE blood_requests ADD COLUMN reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for fast pending-queue lookups
CREATE INDEX IF NOT EXISTS idx_requests_pending ON blood_requests (status) WHERE status = 'pending';
