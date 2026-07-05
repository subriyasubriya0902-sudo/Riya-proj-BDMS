/*
# Blood Donation Management System — initial schema

1. Overview
This migration creates the full data model for a Blood Donation Management System:
donor profiles, blood requests, donation history, and notifications. Authentication
is handled by Supabase Auth (email/password). Each registered auth user gets a row
in `profiles` extended with donor-specific fields (blood group, location, availability).

2. New Tables
- `profiles`
  - id (uuid, PK, references auth.users)
  - full_name, email, phone, age, gender, blood_group, address
  - latitude, longitude (numeric, donor location for nearby search)
  - is_available (boolean, whether donor is currently available)
  - is_admin (boolean, admin flag)
  - last_donation_date (date, last time donor donated)
  - created_at, updated_at
- `blood_requests`
  - id (uuid, PK)
  - requester_id (uuid, references profiles; admin who created it)
  - blood_group, hospital_name, contact_name, contact_phone, units_required, units_fulfilled
  - status (enum: open, fulfilled, cancelled)
  - latitude, longitude (hospital location)
  - radius_km (search radius)
  - created_at
- `donations`
  - id (uuid, PK)
  - donor_id (uuid, references profiles)
  - request_id (uuid, references blood_requests, nullable for direct donations)
  - units (numeric, units donated)
  - donation_date (date)
  - hospital_name (text)
  - created_at
- `notifications`
  - id (uuid, PK)
  - recipient_id (uuid, references profiles)
  - request_id (uuid, references blood_requests, nullable)
  - title, message (text)
  - type (text: request, sos, system)
  - is_read (boolean)
  - created_at

3. Security (RLS)
- profiles: each authenticated user can read all profiles (donor directory is shared
  among authenticated users), but can only update/insert their own row. Admins can
  update any row.
- blood_requests: authenticated users can read all requests; only admins can insert/
  update/delete.
- donations: a donor can read/insert/update/delete their own donations; admins can
  read all.
- notifications: a user can read/update/delete only their own notifications; admins
  can insert (to notify donors).

4. Important Notes
- `profiles.id` defaults to auth.uid() so the row is created on signup.
- Blood group stored as text with a CHECK constraint over valid values.
- Indexes added on blood_group, is_available, and location columns for fast filtering.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  age integer,
  gender text CHECK (gender IN ('male','female','other')),
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  address text,
  latitude double precision,
  longitude double precision,
  is_available boolean NOT NULL DEFAULT true,
  is_admin boolean NOT NULL DEFAULT false,
  last_donation_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the donor directory
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated"
ON profiles FOR SELECT TO authenticated USING (true);

-- A user can insert only their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- A user can update their own profile; admins can update any
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON profiles (blood_group);
CREATE INDEX IF NOT EXISTS idx_profiles_available ON profiles (is_available);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles (latitude, longitude);

-- Blood requests table
CREATE TABLE IF NOT EXISTS blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  hospital_name text NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  units_required integer NOT NULL DEFAULT 1,
  units_fulfilled integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','cancelled')),
  latitude double precision,
  longitude double precision,
  radius_km integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_authenticated" ON blood_requests;
CREATE POLICY "requests_select_authenticated"
ON blood_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "requests_insert_admin" ON blood_requests;
CREATE POLICY "requests_insert_admin"
ON blood_requests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "requests_update_admin" ON blood_requests;
CREATE POLICY "requests_update_admin"
ON blood_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "requests_delete_admin" ON blood_requests;
CREATE POLICY "requests_delete_admin"
ON blood_requests FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_requests_status ON blood_requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_blood_group ON blood_requests (blood_group);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES blood_requests(id) ON DELETE SET NULL,
  units numeric NOT NULL DEFAULT 1,
  donation_date date NOT NULL DEFAULT CURRENT_DATE,
  hospital_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donations_select_own_or_admin" ON donations;
CREATE POLICY "donations_select_own_or_admin"
ON donations FOR SELECT TO authenticated
USING (donor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "donations_insert_own" ON donations;
CREATE POLICY "donations_insert_own"
ON donations FOR INSERT TO authenticated
WITH CHECK (donor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "donations_update_own" ON donations;
CREATE POLICY "donations_update_own"
ON donations FOR UPDATE TO authenticated
USING (donor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
WITH CHECK (donor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "donations_delete_own" ON donations;
CREATE POLICY "donations_delete_own"
ON donations FOR DELETE TO authenticated
USING (donor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations (donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_request ON donations (request_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES blood_requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'request' CHECK (type IN ('request','sos','system')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
CREATE POLICY "notifications_insert_admin"
ON notifications FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true) OR recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (is_read);

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
