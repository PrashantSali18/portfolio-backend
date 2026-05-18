import 'dotenv/config'
import express      from 'express'
import cors         from 'cors'
import nodemailer   from 'nodemailer'
import rateLimit    from 'express-rate-limit'
import { acknowledgmentTemplate, notificationTemplate } from './emailTemplates.js'

const app  = express()
const PORT = process.env.PORT || 5000

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(express.json())

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',   // local dev
    'http://localhost:4173',   // local preview
  ].filter(Boolean),
  methods: ['GET', 'POST'],
  credentials: true,
}))

// Rate limit: max 5 contact form submissions per IP per 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─────────────────────────────────────────────
// Nodemailer transporter (Gmail)
// ─────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Verify SMTP connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP connection failed:', err.message)
    console.error('   → Check GMAIL_USER and GMAIL_APP_PASSWORD in .env')
  } else {
    console.log('✅ SMTP connection verified — ready to send emails')
  }
})

// ─────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────

function validateContactInput({ name, email, message }) {
  const errors = []

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('A valid email address is required.')
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters.')
  }
  if (name?.length > 100)    errors.push('Name is too long.')
  if (email?.length > 200)   errors.push('Email is too long.')
  if (message?.length > 5000) errors.push('Message must be under 5000 characters.')

  return errors
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Health check — Render pings this to keep the service alive
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Prashant Sali — Portfolio Backend' })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * POST /api/contact
 * Body: { name, email, message }
 *
 * Sends:
 *   1. Acknowledgment email → person who submitted the form
 *   2. Notification email   → Prashant (NOTIFY_EMAIL)
 */
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, message } = req.body

  // Validate input
  const errors = validateContactInput({ name, email, message })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors })
  }

  const cleanName    = name.trim()
  const cleanEmail   = email.trim().toLowerCase()
  const cleanMessage = message.trim()

  try {
    // ── Email 1: Acknowledgment to the sender ──
    await transporter.sendMail({
      from: `"Prashant Sali" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: `Thanks for reaching out, ${cleanName}! 👋`,
      html: acknowledgmentTemplate({ name: cleanName, message: cleanMessage }),
    })

    // ── Email 2: Notification to Prashant ──
    await transporter.sendMail({
      from: `"Portfolio Contact Form" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      replyTo: cleanEmail,
      subject: `🔔 New message from ${cleanName} — Portfolio`,
      html: notificationTemplate({
        name:    cleanName,
        email:   cleanEmail,
        message: cleanMessage,
      }),
    })

    console.log(`✅ Contact form submitted by ${cleanName} <${cleanEmail}>`)

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully! Check your inbox for a confirmation.',
    })

  } catch (err) {
    console.error('❌ Email send failed:', err.message)
    return res.status(500).json({
      error: 'Failed to send email. Please try again or reach me directly at prashantsali502@gmail.com',
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio backend running on port ${PORT}`)
  console.log(`   GMAIL_USER:    ${process.env.GMAIL_USER}`)
  console.log(`   NOTIFY_EMAIL:  ${process.env.NOTIFY_EMAIL}`)
  console.log(`   FRONTEND_URL:  ${process.env.FRONTEND_URL}\n`)
})
