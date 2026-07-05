import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Gender = 'male' | 'female' | 'other';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number | null;
  gender: Gender | null;
  blood_group: BloodGroup;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  is_admin: boolean;
  last_donation_date: string | null;
  created_at: string;
  updated_at: string;
}

export type UrgencyLevel = 'critical' | 'urgent' | 'normal';

export interface BloodRequest {
  id: string;
  requester_id: string | null;
  blood_group: BloodGroup;
  hospital_name: string;
  hospital_location: string | null;
  contact_name: string;
  contact_phone: string;
  units_required: number;
  units_fulfilled: number;
  status: 'open' | 'fulfilled' | 'cancelled';
  urgency_level: UrgencyLevel;
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_id: string;
  request_id: string | null;
  units: number;
  donation_date: string;
  hospital_name: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  request_id: string | null;
  title: string;
  message: string;
  type: 'request' | 'sos' | 'system';
  is_read: boolean;
  created_at: string;
}

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Blood compatibility: who can donate to whom
export const CAN_DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'],
  'O+': ['A+', 'B+', 'AB+', 'O+'],
  'A-': ['A+', 'AB+', 'A-', 'AB-'],
  'A+': ['A+', 'AB+'],
  'B-': ['B+', 'AB+', 'B-', 'AB-'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB+', 'AB-'],
  'AB+': ['AB+'],
};

export const CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  'AB+': ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'A+': ['A+', 'O+', 'A-', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'O+', 'B-', 'O-'],
  'B-': ['B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

// Haversine distance in km
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
