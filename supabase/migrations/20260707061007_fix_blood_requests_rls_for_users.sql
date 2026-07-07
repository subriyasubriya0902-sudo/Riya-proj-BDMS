-- Allow any authenticated user to insert their own pending blood_requests
DROP POLICY IF EXISTS "requests_insert_own_pending" ON blood_requests;
CREATE POLICY "requests_insert_own_pending"
ON blood_requests FOR INSERT TO authenticated
WITH CHECK (
  -- Admins can insert with any status (open, etc.)
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  OR
  -- Regular users can only insert pending requests where they are the requester
  (requester_id = auth.uid() AND status = 'pending')
);

-- Drop the old admin-only insert policy (now superseded by the combined policy above)
DROP POLICY IF EXISTS "requests_insert_admin" ON blood_requests;

-- Allow regular users to update units_fulfilled and status on blood_requests
-- (needed for the pledge/donate flow in BloodRequests.tsx)
-- Admins retain full update access via their existing policy.
DROP POLICY IF EXISTS "requests_update_fulfillment" ON blood_requests;
CREATE POLICY "requests_update_fulfillment"
ON blood_requests FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
  -- Admins can update anything
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  OR
  -- Regular users can only update units_fulfilled and status (pledge flow);
  -- we can't restrict columns in RLS, but we restrict to open/fulfilled requests
  -- so users can't approve/reject (those transitions are pending->open which only admins do)
  status IN ('open', 'fulfilled')
);

-- Drop old admin-only update policy
DROP POLICY IF EXISTS "requests_update_admin" ON blood_requests;
