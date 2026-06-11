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
