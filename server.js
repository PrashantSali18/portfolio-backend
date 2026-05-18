import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";

import {
  acknowledgmentTemplate,
  notificationTemplate,
} from "./emailTemplates.js";

const app = express();
const PORT = process.env.PORT || 5000;

// =========================================================
// TRUST PROXY (Required for Render / express-rate-limit)
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
      // Allow Postman, server-to-server, health checks
      if (!origin) return callback(null, true);

      // Exact allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview deployments
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },

    methods: ["GET", "POST", "OPTIONS"],

    allowedHeaders: ["Content-Type"],

    credentials: true,
  }),
);

// Handle preflight requests
app.options("*", cors());

// =========================================================
// RATE LIMITING
// =========================================================
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,

  message: {
    error: "Too many requests. Please wait a few minutes and try again.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =========================================================
// NODEMAILER TRANSPORTER
// =========================================================
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// =========================================================
// SMTP VERIFY
// =========================================================
transporter.verify((err, success) => {
  if (err) {
    console.error("\n❌ SMTP VERIFY FAILED");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    console.error("Response:", err.response);
    console.error("Full Error:", err);
  } else {
    console.log("\n✅ SMTP connection verified");
  }
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

  if (name?.length > 100) {
    errors.push("Name is too long.");
  }

  if (email?.length > 200) {
    errors.push("Email is too long.");
  }

  if (message?.length > 5000) {
    errors.push("Message must be under 5000 characters.");
  }

  return errors;
}

// =========================================================
// HEALTH ROUTES
// =========================================================
app.get("/", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "Prashant Sali Portfolio Backend",
  });
});

app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// =========================================================
// CONTACT ROUTE
// =========================================================
app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // =========================
    // VALIDATION
    // =========================
    const errors = validateContactInput({
      name,
      email,
      message,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
        errors,
      });
    }

    // =========================
    // SANITIZATION
    // =========================
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();

    // =========================
    // EMAIL 1 - ACKNOWLEDGEMENT
    // =========================
    await transporter.sendMail({
      from: `"Prashant Sali" <${process.env.GMAIL_USER}>`,

      to: cleanEmail,

      subject: `Thanks for reaching out, ${cleanName}! 👋`,

      html: acknowledgmentTemplate({
        name: cleanName,
        message: cleanMessage,
      }),
    });

    // =========================
    // EMAIL 2 - NOTIFICATION
    // =========================
    await transporter.sendMail({
      from: `"Portfolio Contact Form" <${process.env.GMAIL_USER}>`,

      to: process.env.NOTIFY_EMAIL,

      replyTo: cleanEmail,

      subject: `🔔 New message from ${cleanName}`,

      html: notificationTemplate({
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
      }),
    });

    console.log(`✅ Emails successfully sent for ${cleanName}`);

    return res.status(200).json({
      success: true,
      message: "Message sent successfully! Please check your inbox.",
    });
  } catch (err) {
    console.error("\n❌ EMAIL SEND FAILED");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    console.error("Response:", err.response);
    console.error("Full Error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to send message. Please try again later.",
    });
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
// SERVER START
// =========================================================
app.listen(PORT, () => {
  console.log("\n🚀 Portfolio backend running");
  console.log(`🌐 Port: ${PORT}`);

  console.log(
    `📧 Gmail Config: ${
      process.env.GMAIL_USER ? "✅ CONFIGURED" : "❌ NOT SET"
    }`,
  );

  console.log(
    `📩 Notify Email: ${
      process.env.NOTIFY_EMAIL ? "✅ CONFIGURED" : "❌ NOT SET"
    }`,
  );

  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "❌ NOT SET"}\n`);
});
