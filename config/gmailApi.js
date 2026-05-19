import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

/**
 * Encode email message for Gmail API
 */
function encodeMessage(email) {
  const str = [
    `From: "${email.fromName}" <${email.fromEmail}>`,
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    email.html,
  ].join("\n");

  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send email via Gmail API
 */
export async function sendEmailViaGmail({
  to,
  subject,
  html,
  fromName = "Prashant Sali",
}) {
  try {
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    const email = {
      fromName,
      fromEmail: process.env.GMAIL_SENDER_EMAIL || "prashantsali502@gmail.com",
      to,
      subject,
      html,
    };

    const encodedMessage = encodeMessage(email);

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`✅ Email sent via Gmail API: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Gmail API Error:", error.message);
    throw error;
  }
}

/**
 * Verify Gmail API connection
 */
export async function verifyGmailConnection() {
  try {
    const profile = await gmail.users.getProfile({
      userId: "me",
    });

    console.log("✅ Gmail API connection successful");
    console.log("📧 Sender Email:", profile.data.emailAddressAddress);
    return true;
  } catch (error) {
    console.error("❌ Gmail API connection failed:", error.message);
    return false;
  }
}
