-- Allow any authenticated user to insert notifications for any recipient
-- (needed for SOS alerts and pledge donation notifications to other users)
-- The previous policy only allowed admins OR self-notifications.
DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
CREATE POLICY "notifications_insert_authenticated"
ON notifications FOR INSERT TO authenticated
WITH CHECK (true);
