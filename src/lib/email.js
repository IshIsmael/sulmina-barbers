'use strict';

/**
 * Email dispatch via SMTP.
 *
 * Contract:
 *   - Fail loudly if SMTP_USER / SMTP_PASS / MAIL_FROM are missing at
 *     the point of send. No silent fallback. No dev logger.
 *   - `isConfigured()` lets the server decide at startup whether to
 *     print "emails live" or "emails disabled".
 *   - `sendBookingEmails(booking)` renders both templates and dispatches.
 *     Failures are thrown to the caller; it's the caller's policy to
 *     decide whether to surface them or just log.
 */

const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

const { SHOP, getBarberById } = require('../config/shop');

let transporter = null;

/**
 * Are SMTP credentials present in the environment?
 */
function isConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM, SHOP_EMAIL } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM && SHOP_EMAIL);
}

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
  } = process.env;

  const missing = [];
  if (!SMTP_HOST) missing.push('SMTP_HOST');
  if (!SMTP_USER) missing.push('SMTP_USER');
  if (!SMTP_PASS) missing.push('SMTP_PASS');
  if (missing.length) {
    throw new Error(
      `SMTP is not configured — missing ${missing.join(', ')} in .env. ` +
      `For Gmail: enable 2-Step Verification and create an App Password at ` +
      `https://myaccount.google.com/apppasswords — use that 16-char password ` +
      `as SMTP_PASS.`
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!process.env.MAIL_FROM) {
    throw new Error('MAIL_FROM is not set in .env');
  }
  const t = getTransporter();
  return t.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
}

/**
 * Render both halves (text + html) of an email template pair.
 * Templates live at views/emails/<name>.text.ejs + .html.ejs.
 */
async function renderEmail(name, locals) {
  const baseDir = path.join(__dirname, '..', '..', 'views', 'emails');
  const [text, html] = await Promise.all([
    ejs.renderFile(path.join(baseDir, `${name}.text.ejs`), locals),
    ejs.renderFile(path.join(baseDir, `${name}.html.ejs`), locals)
  ]);
  return { text, html };
}

/**
 * Build the template locals used by both emails.
 */
function buildLocals(booking) {
  const barber = getBarberById(booking.barberId);
  const dateLong = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(booking.startAt);
  const timeLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(booking.startAt);

  return {
    booking,
    shop: SHOP,
    barberName: barber ? barber.name : `Barber ${booking.barberId}`,
    dateLong,
    timeLabel,
    firstName: (booking.customerName || '').split(/\s+/)[0] || booking.customerName
  };
}

/**
 * Send both confirmation emails for a committed booking.
 *
 * Throws if either send fails. Caller decides whether to surface or log.
 */
async function sendBookingEmails(booking) {
  if (!isConfigured()) {
    throw new Error(
      'Email not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS, ' +
      'MAIL_FROM and SHOP_EMAIL in .env.'
    );
  }
  const locals = buildLocals(booking);

  const customerEmail = renderEmail('customer-confirmation', locals);
  const shopEmail     = renderEmail('shop-notification',     locals);
  const [customerContent, shopContent] = await Promise.all([customerEmail, shopEmail]);

  const subjectCustomer =
    `Booking confirmed: ${booking.serviceName} · ${locals.dateLong} · ${locals.timeLabel}`;
  const subjectShop =
    `New booking: ${booking.customerName} · ${booking.serviceName} · ` +
    `${locals.dateLong} · ${locals.timeLabel} · ${locals.barberName}`;

  // Send in parallel — independent failures logged by caller.
  await Promise.all([
    sendMail({
      to: booking.customerEmail,
      subject: subjectCustomer,
      text: customerContent.text,
      html: customerContent.html
    }),
    sendMail({
      to: process.env.SHOP_EMAIL,
      subject: subjectShop,
      text: shopContent.text,
      html: shopContent.html
    })
  ]);
}

module.exports = {
  isConfigured,
  sendMail,
  sendBookingEmails,
  renderEmail,   // exposed for the dev preview route
  buildLocals    // exposed for the dev preview route
};
