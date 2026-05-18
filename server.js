import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import { Resend } from "resend";

import {
  acknowledgmentTemplate,
  notificationTemplate,
} from "./emailTemplates.js";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 10000;

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
      // Allow Postman / curl / server-side requests
      if (!origin) {
        return callback(null, true);
      }

      // Exact allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview deployments
      if (origin && origin.endsWith(".vercel.app")) {
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
// RATE LIMITER
// =========================================================
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,

  message: {
    success: false,
    error: "Too many requests. Please wait a few minutes and try again.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =========================================================
// RESEND VERIFICATION
// =========================================================
if (process.env.RESEND_API_KEY) {
  console.log("✅ Resend API configured");
} else {
  console.warn("⚠️ RESEND_API_KEY not set - Email sending will fail!");
}

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
// ROUTES
// =========================================================

// Root route
app.get("/", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "Prashant Sali Portfolio Backend",
    message: "Backend is running with Resend API",
  });
});

// Health route
app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// =========================================================
// CONTACT FORM API (UPDATED FOR RESEND)
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

    console.log(`📧 Processing contact from: ${cleanName} (${cleanEmail})`);

    // =========================
    // NOTIFICATION EMAIL (to you first - more important)
    // =========================
    const notificationHtml = notificationTemplate({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
    });

    const { error: notifyError } = await resend.emails.send({
      from: `Portfolio Contact <onboarding@resend.dev>`,
      to: process.env.NOTIFY_EMAIL || "prashantsali502@gmail.com",
      replyTo: cleanEmail,
      subject: `🔔 Portfolio Contact: New message from ${cleanName}`,
      html: notificationHtml,
    });

    if (notifyError) {
      console.error("❌ Notification email error:", notifyError);
      throw new Error(`Notification failed: ${notifyError.message}`);
    }

    console.log(`✅ Notification email sent to you for ${cleanName}`);

    // =========================
    // ACKNOWLEDGEMENT EMAIL (to the person who filled the form)
    // =========================
    const ackHtml = acknowledgmentTemplate({
      name: cleanName,
      message: cleanMessage,
    });

    const { error: ackError } = await resend.emails.send({
      from: `Prashant Sali <onboarding@resend.dev>`,
      to: cleanEmail,
      subject: `Thanks for reaching out, ${cleanName}! 👋`,
      html: ackHtml,
    });

    if (ackError) {
      console.error("❌ Acknowledgement email error:", ackError);
      // Don't throw here - main email (notification) already sent
      console.warn(`⚠️ Could not send ack email to ${cleanEmail}`);
    } else {
      console.log(`✅ Acknowledgement email sent to ${cleanEmail}`);
    }

    return res.status(200).json({
      success: true,
      message: "Message sent successfully! I'll get back to you soon.",
    });
  } catch (err) {
    console.error("\n❌ EMAIL SEND FAILED");
    console.error("Message:", err.message);
    console.error("Full Error:", err);

    return res.status(500).json({
      success: false,
      error:
        "Failed to send message. Please try again later or email me directly at prashantsali502@gmail.com",
    });
  }
});

// =========================================================
// KEEP RENDER SERVICE AWAKE (Ping every 10 minutes)
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
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio backend running`);
  console.log(`🌐 Port: ${PORT}`);

  console.log(
    `📧 Resend Config: ${
      process.env.RESEND_API_KEY ? "✅ CONFIGURED" : "❌ NOT SET"
    }`,
  );

  console.log(
    `📩 Notify Email: ${
      process.env.NOTIFY_EMAIL ? "✅ CONFIGURED" : "❌ NOT SET"
    }`,
  );

  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "❌ NOT SET"}\n`);
});

// =========================================================
// HEALTH CHECK
// =========================================================
app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Healthy",
  });
});