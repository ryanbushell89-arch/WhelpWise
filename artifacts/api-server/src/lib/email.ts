interface ContractSigningEmailParams {
  to: string;
  buyerName: string;
  breederName: string;
  signingUrl: string;
  contractType: string;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  puppy_sale_limited: "Puppy Purchase Agreement (Limited/Pet)",
  puppy_sale_main:    "Puppy Purchase Agreement (Full Registration)",
  stud:               "Stud Service Agreement",
  custom:             "Contract Agreement",
};

export async function sendContractSigningEmail(params: ContractSigningEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { to, buyerName, breederName, signingUrl, contractType } = params;
  const contractLabel = CONTRACT_TYPE_LABELS[contractType] ?? "Contract Agreement";
  const firstName = buyerName.split(" ")[0];

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:100%;">
        <tr><td style="background:#2d6a4f;padding:32px;text-align:center;">
          <span style="color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🐾 WhelpWise</span>
        </td></tr>
        <tr><td style="padding:40px 36px;">
          <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px;">Your contract is ready to sign</h1>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Hi <strong style="color:#111827;">${firstName}</strong>,
          </p>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0 0 8px;">
            <strong style="color:#111827;">${breederName}</strong> has sent you a
            <strong style="color:#111827;">${contractLabel}</strong> for your review and signature.
          </p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 32px;">
            Please click the button below to read the full document and add your digital signature.
            No account is required.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${signingUrl}" style="background:#2d6a4f;color:#fff;text-decoration:none;padding:16px 36px;border-radius:10px;font-weight:600;font-size:16px;display:inline-block;">
              Review &amp; Sign Document →
            </a>
          </div>
          <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin:24px 0;">
            <p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 4px;">🔒 Secure signing</p>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
              This link is unique to you and expires in 30 days. Your signature is legally binding
              under the Electronic Signatures Act.
            </p>
          </div>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:24px;">
            If you didn't expect this email, you can safely ignore it — no action is required.
            <br><br>
            Or copy this link: <span style="color:#2d6a4f;">${signingUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WhelpWise <noreply@whelpwise.app>",
        to: [to],
        subject: `Action required: Please sign your ${contractLabel} from ${breederName}`,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Post-signing emails ───────────────────────────────────────────────────────

interface BuyerSigningConfirmationParams {
  to: string;
  buyerName: string;
  signedContractUrl: string | null;
}

export async function sendBuyerSigningConfirmation(params: BuyerSigningConfirmationParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { to, buyerName, signedContractUrl } = params;
  const firstName = buyerName.split(" ")[0];

  const downloadSection = signedContractUrl
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${signedContractUrl}" style="background:#f0fdf4;color:#2d6a4f;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;border:1px solid #86efac;">
          ↓ Download Your Signed Copy
        </a>
       </div>`
    : "<p style=\"color:#6b7280;font-size:14px;\">Your signed copy will be available shortly in your breeder's portal.</p>";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:100%;">
        <tr><td style="background:#2d6a4f;padding:32px;text-align:center;">
          <span style="color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🐾 WhelpWise</span>
        </td></tr>
        <tr><td style="padding:40px 36px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:48px;">✅</span>
          </div>
          <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px;text-align:center;">Document signed successfully</h1>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Hi <strong style="color:#111827;">${firstName}</strong>,
          </p>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Your electronic signature has been recorded. A certificate of signature has been appended to the document for your records.
          </p>
          ${downloadSection}
          <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin:24px 0;">
            <p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 4px;">🔒 Legally binding</p>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
              Your signature is legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN) and equivalent legislation.
            </p>
          </div>
          <p style="color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6;padding-top:20px;margin-top:24px;">
            Keep this email for your records. If you have questions, contact your breeder directly.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "WhelpWise <noreply@whelpwise.app>",
        to: [to],
        subject: "Your contract has been signed — WhelpWise",
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface BreederSigningNotificationParams {
  to: string;
  buyerName: string;
  contractId: number;
  dashboardUrl: string;
  signedContractUrl: string | null;
}

export async function sendBreederSigningNotification(params: BreederSigningNotificationParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { to, buyerName, contractId, dashboardUrl, signedContractUrl } = params;

  const downloadLine = signedContractUrl
    ? `<p style="margin:0 0 8px;"><a href="${signedContractUrl}" style="color:#2d6a4f;">↓ Download signed PDF</a></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:100%;">
        <tr><td style="background:#2d6a4f;padding:32px;text-align:center;">
          <span style="color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🐾 WhelpWise</span>
        </td></tr>
        <tr><td style="padding:40px 36px;">
          <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 16px;">Contract signed</h1>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0 0 16px;">
            <strong style="color:#111827;">${buyerName}</strong> has signed contract <strong>#${contractId}</strong>.
          </p>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 8px;">
            A certificate of electronic signature has been appended to the document.
          </p>
          ${downloadLine}
          <div style="text-align:center;margin:28px 0;">
            <a href="${dashboardUrl}" style="background:#2d6a4f;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block;">
              View Contract →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6;padding-top:20px;margin-top:24px;">
            This notification was sent because a buyer signed a contract in your WhelpWise account.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "WhelpWise <noreply@whelpwise.app>",
        to: [to],
        subject: `${buyerName} signed contract #${contractId}`,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Invite email ──────────────────────────────────────────────────────────────

interface InviteEmailParams {
  to: string;
  puppyName: string;
  breederName: string;
  inviteUrl: string;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { to, puppyName, breederName, inviteUrl } = params;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;max-width:100%;">
        <tr><td style="background:#2d6a4f;padding:32px;text-align:center;">
          <span style="color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🐾 WhelpWise</span>
        </td></tr>
        <tr><td style="padding:40px 36px;">
          <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px;">You're invited!</h1>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0 0 24px;">
            <strong style="color:#111827;">${breederName}</strong> has invited you to view 
            <strong style="color:#111827;">${puppyName}</strong>'s profile on WhelpWise — 
            including weight records, vaccinations, and worming history. You'll also have a 
            private chat channel with your breeder for any questions.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteUrl}" style="background:#2d6a4f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:16px;display:inline-block;">
              View ${puppyName}'s Profile →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:24px;">
            This invitation link expires in 7 days. If you didn't expect this email, you can safely ignore it.
            <br><br>
            Or copy this link: <span style="color:#2d6a4f;">${inviteUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WhelpWise <noreply@whelpwise.app>",
        to: [to],
        subject: `${breederName} invited you to view ${puppyName}'s profile on WhelpWise`,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
