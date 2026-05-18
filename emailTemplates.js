// ─────────────────────────────────────────────────────────────
// Email HTML Templates
// ─────────────────────────────────────────────────────────────

/**
 * Email sent TO THE PERSON who filled the contact form.
 * Thanks them and confirms you'll reply soon.
 */
export function acknowledgmentTemplate({ name, message }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Thanks for reaching out!</title>
</head>
<body style="margin:0;padding:0;background:#04040a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04040a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#0d0d18;border-radius:16px;border:1px solid #1a1a2e;overflow:hidden;">

          <!-- Header gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#a78bfa,#7c5cfc,#22d3ee);"></td>
          </tr>

          <!-- Logo + name -->
          <tr>
            <td style="padding:32px 36px 24px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#eeeef5;letter-spacing:-0.5px;">
                <span style="background:linear-gradient(135deg,#a78bfa,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">PS</span>
                <span style="color:#5a6480;font-size:13px;font-weight:400;margin-left:8px;">&lt;dev /&gt;</span>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 36px 32px;">
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#eeeef5;line-height:1.3;">
                Hey ${name}, thanks for reaching out! 👋
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#5a6480;line-height:1.7;">
                I've received your message and will get back to you as soon as possible —
                usually within <strong style="color:#a78bfa;">24–48 hours</strong>.
              </p>

              <!-- Message preview box -->
              <div style="background:#04040a;border-left:3px solid #7c5cfc;border-radius:0 8px 8px 0;padding:16px 18px;margin:24px 0;">
                <p style="margin:0 0 6px;font-size:11px;color:#5a6480;text-transform:uppercase;letter-spacing:1px;font-family:monospace;">
                  Your message
                </p>
                <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;font-style:italic;">
                  "${message.length > 200 ? message.slice(0, 200) + "…" : message}"
                </p>
              </div>

              <p style="margin:0 0 28px;font-size:15px;color:#5a6480;line-height:1.7;">
                While you wait, feel free to explore my work:
              </p>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="https://https://devconnect-frontend-h01h.onrender.com/"
                       style="display:inline-block;padding:11px 22px;background:linear-gradient(135deg,#7c5cfc,#22d3ee);color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
                      View DevConnect ↗
                    </a>
                  </td>
                  <td>
                    <a href="https://github.com/PrashantSali18"
                       style="display:inline-block;padding:11px 22px;background:transparent;color:#a78bfa;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #2a1f4a;">
                      GitHub ↗
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #1a1a2e;">
              <p style="margin:0;font-size:12px;color:#3a4060;line-height:1.6;">
                This is an automated confirmation. Please do not reply to this email directly —
                I'll reach you at the email you provided.<br/><br/>
                <strong style="color:#5a6480;">Prashant Sali</strong> · Full Stack Developer · Pune, India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Email sent TO YOU (Prashant) when someone fills the form.
 * Shows full name, email, and message with a Reply button.
 */
export function notificationTemplate({ name, email, message }) {
  const now = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Portfolio Contact</title>
</head>
<body style="margin:0;padding:0;background:#04040a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04040a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#0d0d18;border-radius:16px;border:1px solid #1a1a2e;overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#22d3ee,#7c5cfc,#a78bfa);"></td>
          </tr>

          <!-- Alert label -->
          <tr>
            <td style="padding:28px 36px 0;">
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-family:monospace;color:#22d3ee;background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);padding:4px 12px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;">
                🔔 New Contact Form Submission
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 36px 32px;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#eeeef5;">
                ${name} wants to connect
              </h1>
              <p style="margin:0 0 24px;font-size:13px;color:#5a6480;font-family:monospace;">${now} IST</p>

              <!-- Sender info -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#04040a;border-radius:10px;border:1px solid #1a1a2e;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #1a1a2e;">
                    <span style="font-size:10px;color:#5a6480;font-family:monospace;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:3px;">Name</span>
                    <span style="font-size:15px;color:#eeeef5;font-weight:600;">${name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;">
                    <span style="font-size:10px;color:#5a6480;font-family:monospace;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:3px;">Email</span>
                    <a href="mailto:${email}" style="font-size:15px;color:#a78bfa;font-weight:600;text-decoration:none;">${email}</a>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <p style="margin:0 0 8px;font-size:10px;color:#5a6480;font-family:monospace;text-transform:uppercase;letter-spacing:1px;">
                Message
              </p>
              <div style="background:#04040a;border-left:3px solid #7c5cfc;border-radius:0 8px 8px 0;padding:16px 18px;margin-bottom:28px;">
                <p style="margin:0;font-size:14px;color:#c4c4d4;line-height:1.75;white-space:pre-wrap;">${message}</p>
              </div>

              <!-- Reply button -->
              <a href="mailto:${email}?subject=Re: Your message to Prashant Sali&body=Hi ${name},%0D%0A%0D%0AThanks for reaching out!%0D%0A%0D%0A"
                 style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#7c5cfc,#22d3ee);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                Reply to ${name} →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #1a1a2e;">
              <p style="margin:0;font-size:12px;color:#3a4060;">
                Submitted via your portfolio contact form at prashant-portfolio.vercel.app
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
