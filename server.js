import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import {
  acknowledgmentTemplate,
  notificationTemplate,
} from "./emailTemplates.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy — required on Render ──────────────────────────
app.set("trust proxy", 1);

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = Postman / curl / health checks — allow
      if (!origin) return callback(null, true);
      // Exact match
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Any *.vercel.app preview deploy
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  }),
);

// Handle preflight OPTIONS for all routes
app.options("*", cors());

// ── Body parser ───────────────────────────────────────────────
app.use(express.json());

// ── Rate limit ────────────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many requests. Please wait a few minutes and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Nodemailer transporter ────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Non-fatal SMTP check — server starts even if Gmail creds are wrong
transporter.verify((err) => {
  if (err) {
    console.error("⚠️  SMTP verify failed:", err.message);
    console.error(
      "    → Emails will fail until GMAIL credentials are fixed in Render env vars",
    );
  } else {
    console.log("✅ SMTP connection verified — ready to send emails");
  }
});

// ── Input validation ─────────────────────────────────────────
function validateContactInput({ name, email, message }) {
  const errors = [];
  if (!name || name.trim().length < 2)
    errors.push("Name must be at least 2 characters.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("A valid email is required.");
  if (!message || message.trim().length < 10)
    errors.push("Message must be at least 10 characters.");
  if (name?.length > 100) errors.push("Name is too long.");
  if (email?.length > 200) errors.push("Email is too long.");
  if (message?.length > 5000)
    errors.push("Message must be under 5000 characters.");
  return errors;
}

// ── Routes ────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Prashant Sali — Portfolio Backend" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/contact", contactLimiter, async (req, res) => {
  const { name, email, message } = req.body;

  const errors = validateContactInput({ name, email, message });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMessage = message.trim();

  try {
    // Email 1 — acknowledgment to sender
    await transporter.sendMail({
      from: `"Prashant Sali" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: `Thanks for reaching out, ${cleanName}! 👋`,
      html: acknowledgmentTemplate({ name: cleanName, message: cleanMessage }),
    });

    // Email 2 — notification to Prashant
    await transporter.sendMail({
      from: `"Portfolio Contact Form" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      replyTo: cleanEmail,
      subject: `🔔 New message from ${cleanName} — Portfolio`,
      html: notificationTemplate({
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
      }),
    });

    console.log(`✅ Emails sent for ${cleanName} <${cleanEmail}>`);

    return res.status(200).json({
      success: true,
      message: "Message sent! Check your inbox for a confirmation email.",
    });
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return res.status(500).json({
      error:
        "Failed to send email. Please try again or reach me at prashantsali502@gmail.com",
    });
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio backend on port ${PORT}`);
  console.log(`   GMAIL_USER:   ${process.env.GMAIL_USER || "❌ NOT SET"}`);
  console.log(`   NOTIFY_EMAIL: ${process.env.NOTIFY_EMAIL || "❌ NOT SET"}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || "❌ NOT SET"}\n`);
});
