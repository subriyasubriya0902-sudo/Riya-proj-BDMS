import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Shared HTML shell — wraps every email body
// ---------------------------------------------------------------------------
function emailShell(title: string, bodyHtml: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Logo header -->
      <tr><td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" align="center">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C12 2 4.5 10 4.5 15C4.5 19.14 7.86 22.5 12 22.5C16.14 22.5 19.5 19.14 19.5 15C19.5 10 12 2 12 2Z" fill="white"/>
              </svg>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">LifeFlow</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body card -->
      <tr><td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
        ${bodyHtml}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">LifeFlow Blood Donation Network</p>
        <p style="margin:0;font-size:11px;color:#d1d5db;">You received this because you have an account on LifeFlow. Please do not reply to this email.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Reusable styled button
function emailBtn(text: string, href = "#"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#dc2626;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">${text}</a>
    </td></tr>
  </table>`;
}

// Reusable info row pill
function infoPill(label: string, value: string, accent = "#fef2f2", textColor = "#991b1b"): string {
  return `<tr>
    <td style="padding:4px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accent};border-radius:8px;">
        <tr>
          <td style="padding:10px 14px;">
            <span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">${label}</span><br/>
            <span style="font-size:14px;font-weight:600;color:${textColor};">${value}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

function tplWelcome(firstName: string, email: string, bloodGroup: string): string {
  return emailShell(
    "Welcome to LifeFlow",
    `<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">Welcome, ${firstName}!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.65;">Your LifeFlow account has been created. You're now part of a community that saves lives every day.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoPill("Email", email)}
      ${infoPill("Blood Group", bloodGroup, "#fef2f2", "#991b1b")}
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.65;"><strong>What's next?</strong> Complete your profile, mark yourself as available, and watch for blood requests matching your group. One donation can save up to 3 lives.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Thank you for joining — the LifeFlow team</p>`,
    `Welcome to LifeFlow, ${firstName}! Your account is ready.`,
  );
}

function tplWelcomeBack(firstName: string, email: string, loginTime: string): string {
  return emailShell(
    "Welcome back to LifeFlow",
    `<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">Welcome back, ${firstName}!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.65;">You've successfully signed in. Your generosity continues to make a real difference.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoPill("Login time", loginTime, "#f0fdf4", "#166534")}
      ${infoPill("Account", email)}
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">If this wasn't you, please change your password immediately.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Stay safe — the LifeFlow team</p>`,
    `Signed in to LifeFlow at ${loginTime}.`,
  );
}

function tplBloodRequest(
  donorFirstName: string,
  bloodGroup: string,
  hospital: string,
  address: string,
  contactName: string,
  contactPhone: string,
  unitsRequired: number,
  urgency: string,
): string {
  const urgencyColor = urgency === "critical" ? "#dc2626" : urgency === "urgent" ? "#d97706" : "#16a34a";
  const urgencyBg = urgency === "critical" ? "#fef2f2" : urgency === "urgent" ? "#fffbeb" : "#f0fdf4";

  return emailShell(
    `${urgency.toUpperCase()}: ${bloodGroup} Blood Needed`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${urgencyBg};border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:14px 18px;">
        <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${urgencyColor};">${urgency} request</span>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#111827;">${bloodGroup} Blood Needed</h1>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">Hi ${donorFirstName}, a patient at <strong>${hospital}</strong> urgently needs blood that matches your type. You can help save a life today.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-spacing:0 6px;">
      ${infoPill("Hospital", hospital)}
      ${infoPill("Address", address || "Contact hospital for directions")}
      ${infoPill("Units needed", `${unitsRequired} unit${unitsRequired > 1 ? "s" : ""}`)}
      ${infoPill("Contact person", `${contactName} — ${contactPhone}`, "#f0f9ff", "#0369a1")}
    </table>
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Log in to LifeFlow to pledge your donation or get more details.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Every second counts — the LifeFlow team</p>`,
    `${urgency.toUpperCase()}: ${bloodGroup} blood needed at ${hospital}.`,
  );
}

function tplRequestApproved(
  firstName: string,
  bloodGroup: string,
  hospital: string,
  unitsRequired: number,
): string {
  return emailShell(
    "Your blood request has been approved",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:16px 18px;">
        <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#16a34a;">Request approved</span>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#111827;">Your Request is Live</h1>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">Hi ${firstName}, your blood request has been reviewed and approved by our team. Matching donors in your area are being notified right now.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-spacing:0 6px;">
      ${infoPill("Hospital", hospital)}
      ${infoPill("Blood Group", bloodGroup)}
      ${infoPill("Units requested", `${unitsRequired} unit${unitsRequired > 1 ? "s" : ""}`, "#f0fdf4", "#166534")}
    </table>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Thank you for using LifeFlow — together we save lives.</p>`,
    `Your ${bloodGroup} blood request at ${hospital} is now live.`,
  );
}

function tplRequestRejected(
  firstName: string,
  bloodGroup: string,
  hospital: string,
  reason: string,
): string {
  return emailShell(
    "Update on your blood request",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:16px 18px;">
        <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#dc2626;">Request not approved</span>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#111827;">Request Requires Attention</h1>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">Hi ${firstName}, unfortunately your blood request could not be approved at this time. Please review the details below and resubmit if needed.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-spacing:0 6px;">
      ${infoPill("Hospital", hospital)}
      ${infoPill("Blood Group", bloodGroup)}
      ${infoPill("Reason", reason || "No reason provided", "#fef2f2", "#991b1b")}
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.65;">If you believe this was a mistake or need assistance, please contact our support team.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">We're here to help — the LifeFlow team</p>`,
    `Update on your blood request for ${hospital}.`,
  );
}

function tplPasswordReset(firstName: string, resetLink: string): string {
  return emailShell(
    "Reset your LifeFlow password",
    `<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">Password Reset</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.65;">Hi ${firstName}, we received a request to reset your LifeFlow account password. Click the button below to choose a new one.</p>
    ${emailBtn("Reset My Password", resetLink)}
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your account is secure.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Or copy this link: ${resetLink}</p>`,
    "Reset your LifeFlow password.",
  );
}

function tplDonationCertificate(
  donorName: string,
  bloodGroup: string,
  donationCount: number,
  totalUnits: number,
  hospital: string,
  donationDate: string,
  certId: string,
): string {
  return emailShell(
    "Your Donation Certificate — LifeFlow",
    `<!-- Certificate badge -->
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr><td style="background:linear-gradient(135deg,#dc2626,#991b1b);border-radius:50%;width:72px;height:72px;text-align:center;vertical-align:middle;">
        <span style="font-size:28px;color:white;line-height:72px;">&#10084;</span>
      </td></tr>
    </table>
    <h1 style="margin:0 0 4px;font-size:28px;font-weight:800;color:#111827;text-align:center;">Thank You, ${donorName}!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.65;text-align:center;">Your donation has been recorded. You are a life-saver in every sense of the word.</p>

    <!-- Stats row -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="33%" style="text-align:center;padding:0 4px;">
          <div style="background:#fef2f2;border-radius:12px;padding:16px 8px;">
            <div style="font-size:28px;font-weight:800;color:#dc2626;">${totalUnits}</div>
            <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Total Units</div>
          </div>
        </td>
        <td width="33%" style="text-align:center;padding:0 4px;">
          <div style="background:#f0fdf4;border-radius:12px;padding:16px 8px;">
            <div style="font-size:28px;font-weight:800;color:#16a34a;">${donationCount}</div>
            <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Donations</div>
          </div>
        </td>
        <td width="33%" style="text-align:center;padding:0 4px;">
          <div style="background:#eff6ff;border-radius:12px;padding:16px 8px;">
            <div style="font-size:28px;font-weight:800;color:#1d4ed8;">${bloodGroup}</div>
            <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Blood Type</div>
          </div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-spacing:0 6px;">
      ${infoPill("Hospital", hospital)}
      ${infoPill("Donation date", donationDate, "#f0fdf4", "#166534")}
      ${infoPill("Certificate ID", certId)}
    </table>

    <p style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.65;"><strong>Did you know?</strong> A single blood donation can save up to 3 lives. Your generosity creates a ripple effect of hope for patients and their families.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">With gratitude — the LifeFlow team</p>`,
    `Your LifeFlow donation certificate is ready, ${donorName}.`,
  );
}

// ---------------------------------------------------------------------------
// SMTP transport (created lazily per request — Deno edge functions are stateless)
// ---------------------------------------------------------------------------
function createTransport() {
  const host = Deno.env.get("SMTP_HOST");
  const port = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const from = Deno.env.get("SMTP_FROM") ?? `LifeFlow <${user}>`;

  if (!host || !user || !pass) return null;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return { transport, from };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const smtp = createTransport();
    if (!smtp) {
      console.warn("SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — email skipped");
      return respond({ skipped: true });
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return respond({ error: "Invalid token" }, 401);

    const body = await req.json() as Record<string, unknown>;
    const type = body.type as string;

    let to: string;
    let subject: string;
    let html: string;

    switch (type) {
      // ── 1. Welcome (registration) ──────────────────────────────────────
      case "welcome": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, blood_group")
          .eq("id", user.id)
          .maybeSingle();
        const firstName = profile?.full_name?.split(" ")[0] ?? "there";
        to = user.email!;
        subject = `Welcome to LifeFlow, ${firstName}!`;
        html = tplWelcome(firstName, user.email!, profile?.blood_group ?? "—");
        break;
      }

      // ── 2. Welcome back (login) ────────────────────────────────────────
      case "welcome_back": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        const firstName = profile?.full_name?.split(" ")[0] ?? "there";
        const loginTime = new Date().toLocaleString("en-US", {
          weekday: "long", year: "numeric", month: "long",
          day: "numeric", hour: "2-digit", minute: "2-digit",
        });
        to = user.email!;
        subject = `Welcome back, ${firstName} — you're signed in`;
        html = tplWelcomeBack(firstName, user.email!, loginTime);
        break;
      }

      // ── 3. Blood request notification to a donor ───────────────────────
      case "blood_request": {
        const donorId = body.donor_id as string;
        if (!donorId) return respond({ error: "donor_id required" }, 400);

        const { data: donor } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", donorId)
          .maybeSingle();
        if (!donor?.email) return respond({ error: "Donor not found" }, 404);

        const firstName = donor.full_name?.split(" ")[0] ?? "Donor";
        to = donor.email;
        subject = `${(body.urgency as string ?? "urgent").toUpperCase()}: ${body.blood_group} Blood Needed at ${body.hospital}`;
        html = tplBloodRequest(
          firstName,
          body.blood_group as string,
          body.hospital as string,
          body.address as string ?? "",
          body.contact_name as string ?? "",
          body.contact_phone as string ?? "",
          Number(body.units_required ?? 1),
          body.urgency as string ?? "urgent",
        );
        break;
      }

      // ── 4a. Request approved ───────────────────────────────────────────
      case "request_approved": {
        const requesterId = body.requester_id as string;
        if (!requesterId) return respond({ error: "requester_id required" }, 400);

        const { data: requester } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", requesterId)
          .maybeSingle();
        if (!requester?.email) return respond({ error: "Requester not found" }, 404);

        const firstName = requester.full_name?.split(" ")[0] ?? "there";
        to = requester.email;
        subject = `Your ${body.blood_group} blood request has been approved`;
        html = tplRequestApproved(
          firstName,
          body.blood_group as string,
          body.hospital as string,
          Number(body.units_required ?? 1),
        );
        break;
      }

      // ── 4b. Request rejected ───────────────────────────────────────────
      case "request_rejected": {
        const requesterId = body.requester_id as string;
        if (!requesterId) return respond({ error: "requester_id required" }, 400);

        const { data: requester } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", requesterId)
          .maybeSingle();
        if (!requester?.email) return respond({ error: "Requester not found" }, 404);

        const firstName = requester.full_name?.split(" ")[0] ?? "there";
        to = requester.email;
        subject = `Update on your ${body.blood_group} blood request`;
        html = tplRequestRejected(
          firstName,
          body.blood_group as string,
          body.hospital as string,
          body.reason as string ?? "",
        );
        break;
      }

      // ── 5. Password reset ──────────────────────────────────────────────
      case "password_reset": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        const firstName = profile?.full_name?.split(" ")[0] ?? "there";
        const resetLink = body.reset_link as string ?? "#";
        to = user.email!;
        subject = "Reset your LifeFlow password";
        html = tplPasswordReset(firstName, resetLink);
        break;
      }

      // ── 6. Donation certificate ────────────────────────────────────────
      case "donation_certificate": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, blood_group")
          .eq("id", user.id)
          .maybeSingle();

        // Fetch all donations for this user
        const { data: donations } = await supabase
          .from("donations")
          .select("units, donation_date, hospital_name")
          .eq("donor_id", user.id)
          .order("donation_date", { ascending: false });

        const totalUnits = (donations ?? []).reduce((s: number, d: { units: number }) => s + Number(d.units), 0);
        const latestDonation = donations?.[0];
        const certId = `LF-${user.id.slice(0, 8).toUpperCase()}`;
        const donationDate = latestDonation?.donation_date
          ? new Date(latestDonation.donation_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

        to = user.email!;
        subject = `Your LifeFlow Donation Certificate — ${certId}`;
        html = tplDonationCertificate(
          profile?.full_name ?? "Donor",
          profile?.blood_group ?? "—",
          donations?.length ?? 1,
          totalUnits,
          latestDonation?.hospital_name ?? (body.hospital as string ?? "LifeFlow"),
          donationDate,
          certId,
        );
        break;
      }

      default:
        return respond({ error: `Unknown email type: ${type}` }, 400);
    }

    await smtp.transport.sendMail({
      from: smtp.from,
      to,
      subject,
      html,
    });

    return respond({ sent: true, to, type });
  } catch (err) {
    console.error("send-email error:", err);
    return respond({ error: (err as Error).message }, 500);
  }
});
