// twilio.js
require('dotenv').config();
const Twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

const DEFAULT_TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'approved_huts4u';
const DEFAULT_TEMPLATE_SID  = process.env.TEMPLATE_SID || null;

if (!accountSid || !authToken || !fromNumber) {
  console.warn('Twilio env variables missing. Make sure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER are set.');
}

const client = Twilio(accountSid, authToken);

// === TEMPLATES ===
const templates = {
  approved_huts4u: `Hello {{1}}, your booking at {{2}} (Hotel: {{3}}) is confirmed. Check-in: {{4}} at {{5}} Thanks — Huts4u`
};

// ================================
// ADD THIS FUNCTION
// ================================
function normalizePhoneNumber(raw) {
  if (!raw) return null;

  let num = String(raw).trim();

  // remove spaces, hyphens, brackets etc.
  num = num.replace(/[^0-9+]/g, '');

  // if already E.164 like +9198xxxxxx
  if (num.startsWith('+') && num.length >= 12) return num;

  // If starts with 0 → remove leading 0
  if (num.startsWith('0')) num = num.slice(1);

  // If Indian number length is 10 → prepend +91
  if (/^[6-9]\d{9}$/.test(num)) {
    return `+91${num}`;
  }

  // If something else → invalid
  return null;
}

// ================================
// renderTemplate
// ================================
function renderTemplate(templateName, data = {}) {
  const tpl = templates[templateName];
  if (!tpl) throw new Error(`Template not found: ${templateName}`);

  let out = tpl.replace(/{{\s*(\d+)\s*}}/g, (_, num) => {
    const map = { '1': 'guestName', '2': 'location', '3': 'hotelName', '4': 'checkInDate', '5': 'checkInTime' };
    const key = map[num];
    if (key && data[key] != null) return String(data[key]);
    return data[num] != null ? String(data[num]) : '';
  });

  out = out.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    return data[key] != null ? String(data[key]) : '';
  });

  return out;
}

// ================================
// UPDATED sendSMS with phone normalization
// ================================
async function sendSMS(toRaw, body) {
  if (!toRaw || !body) throw new Error('Missing `to` or `body` for sendSMS');

  const to = normalizePhoneNumber(toRaw);

  if (!to) {
    throw new Error(`Invalid phone number format: ${toRaw}`);
  }

  console.log("📨 Sending SMS to:", to);

  const message = await client.messages.create({
    body,
    from: fromNumber,
    to
  });

  return message;
}

// ================================
// sendTemplateSMS
// ================================
async function sendTemplateSMS(to, templateName = DEFAULT_TEMPLATE_NAME, data = {}, opts = {}) {
  const resolvedTemplateName = templateName || DEFAULT_TEMPLATE_NAME;
  const body = renderTemplate(resolvedTemplateName, data);

  const twilioRes = await sendSMS(to, body);

  return {
    twilio: twilioRes,
    templateName: opts.templateName || resolvedTemplateName,
    templateSid: opts.templateSid || DEFAULT_TEMPLATE_SID || null,
    bodySent: body
  };
}

module.exports = { renderTemplate, sendSMS, sendTemplateSMS, templates };
