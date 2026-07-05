import { Profile, Donation } from './supabase';

// Generates a donor certificate as a printable HTML blob and opens print dialog.
export function generateCertificate(profile: Profile, donations: Donation[]) {
  const totalUnits = donations.reduce((sum, d) => sum + Number(d.units), 0);
  const count = donations.length;
  const certId = `LF-${profile.id.slice(0, 8).toUpperCase()}`;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Donor Certificate - ${profile.full_name}</title>
<style>
  @page { size: landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #f5f5f5; padding: 40px; }
  .cert {
    width: 1000px; height: 700px; margin: 0 auto; position: relative;
    background: linear-gradient(135deg, #fff 0%, #fef2f2 100%);
    border: 3px solid #b91c1c; border-radius: 12px; padding: 60px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }
  .corner { position: absolute; width: 80px; height: 80px; border: 2px solid #dc2626; }
  .tl { top: 20px; left: 20px; border-right: none; border-bottom: none; border-radius: 12px 0 0 0; }
  .tr { top: 20px; right: 20px; border-left: none; border-bottom: none; border-radius: 0 12px 0 0; }
  .bl { bottom: 20px; left: 20px; border-right: none; border-top: none; border-radius: 0 0 0 12px; }
  .br { bottom: 20px; right: 20px; border-left: none; border-top: none; border-radius: 0 0 12px 0; }
  .drop { width: 70px; height: 70px; margin: 0 auto 16px; background: #dc2626; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; }
  .drop span { transform: rotate(45deg); color: white; font-size: 22px; font-weight: bold; }
  .title { text-align: center; font-size: 16px; letter-spacing: 4px; color: #7f1d1d; text-transform: uppercase; }
  .heading { text-align: center; font-size: 42px; color: #991b1b; margin-top: 8px; font-weight: bold; }
  .subtitle { text-align: center; font-size: 18px; color: #6b7280; margin-top: 24px; }
  .name { text-align: center; font-size: 36px; color: #111; margin-top: 12px; font-weight: bold; border-bottom: 2px solid #dc2626; display: inline-block; padding-bottom: 6px; }
  .name-wrap { text-align: center; }
  .body { text-align: center; font-size: 16px; color: #4b5563; margin-top: 24px; line-height: 1.6; }
  .stats { display: flex; justify-content: center; gap: 60px; margin-top: 30px; }
  .stat { text-align: center; }
  .stat .num { font-size: 32px; color: #dc2626; font-weight: bold; }
  .stat .lbl { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .footer { position: absolute; bottom: 60px; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 80px; }
  .sig { text-align: center; }
  .sig .line { border-top: 1px solid #333; width: 200px; padding-top: 8px; }
  .sig .lbl { font-size: 13px; color: #6b7280; }
  .cert-id { position: absolute; top: 30px; right: 40px; font-size: 12px; color: #9ca3af; }
  .date-line { position: absolute; bottom: 30px; left: 0; right: 0; text-align: center; font-size: 13px; color: #9ca3af; }
</style></head>
<body>
<div class="cert">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>
  <div class="cert-id">Certificate #${certId}</div>
  <div class="drop"><span>LF</span></div>
  <div class="title">Certificate of Appreciation</div>
  <div class="heading">Blood Donor</div>
  <div class="subtitle">This certificate is proudly presented to</div>
  <div class="name-wrap"><span class="name">${profile.full_name}</span></div>
  <div class="body">
    In recognition of your selfless contribution to saving lives through<br>
    blood donation. Your generosity has made a meaningful difference.
  </div>
  <div class="stats">
    <div class="stat"><div class="num">${count}</div><div class="lbl">Donations</div></div>
    <div class="stat"><div class="num">${totalUnits}</div><div class="lbl">Units Given</div></div>
    <div class="stat"><div class="num">${profile.blood_group}</div><div class="lbl">Blood Group</div></div>
  </div>
  <div class="footer">
    <div class="sig"><div class="line"></div><div class="lbl">LifeFlow Director</div></div>
    <div class="sig"><div class="line"></div><div class="lbl">Authorized Signature</div></div>
  </div>
  <div class="date-line">Issued on ${date}</div>
</div>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Fallback: download
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${profile.full_name.replace(/\s/g, '-')}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
