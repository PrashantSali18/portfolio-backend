import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import { google } from "googleapis";

import {
  acknowledgmentTemplate,
  notificationTemplate,
} from "./services/emailTemplates.js";

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================
// GMAIL API SETUP (NO SMTP - WORKS ON RENDER!)
// =========================================================

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

// Function to send email via Gmail API
async function sendEmailViaGmail({
  to,
  subject,
  html,
  fromName = "Prashant Sali",
}) {
  try {
    const fromEmail =
      process.env.GMAIL_SENDER_EMAIL || "prashantsali502@gmail.com";

    // Create email message
    const emailLines = [
      `From: "${fromName}" <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ];

    const email = emailLines.join("\n");

    // Encode to base64url format
    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log(`✅ Email sent via Gmail API: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Gmail API Error:", error.message);
    throw error;
  }
}

// Verify Gmail API connection on startup
async function verifyGmailConnection() {
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    console.log("✅ Gmail API connection successful");
    console.log("📧 Sender Email:", profile.data.emailAddress);
    return true;
  } catch (error) {
    console.error("❌ Gmail API connection failed:", error.message);
    if (error.code === 401) {
      console.error("⚠️ Authentication error. Check your refresh token.");
    }
    return false;
  }
}

// =========================================================
// TRUST PROXY (Required for Render)
// =========================================================
app.set("trust proxy", 1);

// =========================================================
// SECURITY HEADERS
// =========================================================
app.use(helmet());

// =========================================================
// BODY PARSER
// =========================================================
app.use(express.json({ limit: "10kb" }));

// =========================================================
// CORS CONFIGURATION
// =========================================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin && origin.endsWith(".vercel.app")) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  }),
);

app.options("*", cors());

// =========================================================
// RATE LIMITER
// =========================================================
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Too many requests. Please wait a few minutes and try again.",
  },
});

// =========================================================
// INPUT VALIDATION
// =========================================================
function validateContactInput({ name, email, message }) {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email is required.");
  }
  if (!message || message.trim().length < 10) {
    errors.push("Message must be at least 10 characters.");
  }
  if (name?.length > 100) errors.push("Name is too long.");
  if (email?.length > 200) errors.push("Email is too long.");
  if (message?.length > 5000)
    errors.push("Message must be under 5000 characters.");

  return errors;
}

// =========================================================
// ROUTES
// =========================================================

app.get("/", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "Prashant Sali Portfolio Backend",
    message: "Backend is running with Gmail API",
  });
});

app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// =========================================================
// CONTACT FORM API (USING GMAIL API)
// =========================================================
app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    const errors = validateContactInput({ name, email, message });
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
        errors,
      });
    }

    // Sanitization
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();

    console.log(`📧 Processing contact from: ${cleanName} (${cleanEmail})`);

    // 1. Send NOTIFICATION to you (the portfolio owner)
    const notificationHtml = notificationTemplate({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
    });

    await sendEmailViaGmail({
      to: process.env.NOTIFY_EMAIL || "prashantsali502@gmail.com",
      subject: `Portfolio Contact: New message from ${cleanName}`,
      html: notificationHtml,
      fromName: "Portfolio Contact",
    });

    console.log(`✅ Notification email sent to you for ${cleanName}`);

    // 2. Send ACKNOWLEDGEMENT to the person who contacted you
    const ackHtml = acknowledgmentTemplate({
      name: cleanName,
      message: cleanMessage,
    });

    await sendEmailViaGmail({
      to: cleanEmail,
      subject: `Thanks for reaching out, ${cleanName}! `,
      html: ackHtml,
      fromName: "Prashant Sali",
    });

    console.log(`✅ Acknowledgement email sent to ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: "Message sent successfully! Check your email for confirmation.",
    });
  } catch (err) {
    console.error("\n❌ EMAIL SEND FAILED");
    console.error("Message:", err.message);

    return res.status(500).json({
      success: false,
      error:
        "Failed to send message. Please try again later or email me directly at prashantsali502@gmail.com",
    });
  }
});

// =========================================================
// KEEP RENDER SERVICE AWAKE
// =========================================================
cron.schedule("*/10 * * * *", async () => {
  try {
    const response = await fetch(
      "https://portfolio-backend-10kd.onrender.com/health",
    );
    console.log(
      `🔄 Self-ping success: ${response.status} (${new Date().toISOString()})`,
    );
  } catch (error) {
    console.error("❌ Self-ping failed:", error.message);
  }
});

// =========================================================
// 404 HANDLER
// =========================================================
app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================
app.use((err, _req, res, _next) => {
  console.error("\n❌ GLOBAL ERROR");
  console.error(err);
  return res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// =========================================================
// START SERVER
// =========================================================
// Verify Gmail API before starting
verifyGmailConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio backend running`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`📧 Gmail API: ✅ CONFIGURED`);
    console.log(`📩 Notify Email: ${process.env.NOTIFY_EMAIL || "❌ NOT SET"}`);
    console.log(
      `🔗 Frontend URL: ${process.env.FRONTEND_URL || "❌ NOT SET"}\n`,
    );
  });
});
