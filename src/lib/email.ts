import { supabase } from './supabase';

const fn = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callEmailFn(token: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(fn, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn(`send-email (${payload.type}) failed ${res.status}:`, text);
  }
}

// Grabs the current session token; returns null if not signed in
async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export const email = {
  /** Sent after successful registration */
  sendWelcome: async (token: string) => {
    await callEmailFn(token, { type: 'welcome' });
  },

  /** Sent after successful login */
  sendWelcomeBack: async (token: string) => {
    await callEmailFn(token, { type: 'welcome_back' });
  },

  /** Sent to a specific donor about a new blood request */
  sendBloodRequest: async (donorId: string, details: {
    blood_group: string;
    hospital: string;
    address?: string;
    contact_name: string;
    contact_phone: string;
    units_required: number;
    urgency: string;
  }) => {
    const token = await getToken();
    if (!token) return;
    await callEmailFn(token, { type: 'blood_request', donor_id: donorId, ...details });
  },

  /** Sent to the requester when their request is approved */
  sendRequestApproved: async (details: {
    requester_id: string;
    blood_group: string;
    hospital: string;
    units_required: number;
  }) => {
    const token = await getToken();
    if (!token) return;
    await callEmailFn(token, { type: 'request_approved', ...details });
  },

  /** Sent to the requester when their request is rejected */
  sendRequestRejected: async (details: {
    requester_id: string;
    blood_group: string;
    hospital: string;
    reason?: string;
  }) => {
    const token = await getToken();
    if (!token) return;
    await callEmailFn(token, { type: 'request_rejected', ...details });
  },

  /** Sent to admin/user requesting a password reset */
  sendPasswordReset: async (token: string, resetLink: string) => {
    await callEmailFn(token, { type: 'password_reset', reset_link: resetLink });
  },

  /** Sent to donor after a successful donation pledge */
  sendDonationCertificate: async (hospital?: string) => {
    const token = await getToken();
    if (!token) return;
    await callEmailFn(token, { type: 'donation_certificate', hospital: hospital ?? '' });
  },
};
