// src/utils/twolio.js
require("dotenv").config();
const Twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER; // WhatsApp-enabled number (E.164)
const TEMPLATE_SID = process.env.TEMPLATE_SID || null; // fallback template SID
const DEBUG = process.env.DEBUG === "true" || false;
const GATEWAY_CHARGE_PERCENT = Number(process.env.GATEWAY_CHARGE_PERCENT ?? 2); // default 2%

if (!accountSid || !authToken) {
  console.warn(
    "Twilio credentials not found in env (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)."
  );
}

const client = Twilio(accountSid, authToken);

function normalizePhoneNumber(raw) {
  if (!raw) return null;
  let num = String(raw)
    .trim()
    .replace(/[^0-9+]/g, "");
  if (num.startsWith("+")) return num;
  if (num.startsWith("0")) num = num.slice(1);
  if (/^[6-9]\d{9}$/.test(num)) return `+91${num}`;
  if (/^\d{10,15}$/.test(num)) return `+${num}`;
  return null;
}

function sanitizeVarValue(v) {
  if (v == null) return "";
  let s = String(v);
  // flatten newlines because Twilio template vars often disallow raw newlines
  s = s.replace(/[\r\n]+/g, " ");
  // replace straight apostrophe to avoid some parsing issues
  s = s.replace(/'/g, "\u2019");
  return s.trim();
}

function normalizeTemplateData(templateData = {}, expectedCount = 0) {
  const varsObj = {};

  // If an array was passed, map to "1","2",...
  if (Array.isArray(templateData)) {
    templateData.forEach((v, i) => (varsObj[String(i + 1)] = v));
  } else if (templateData && typeof templateData === "object") {
    // copy any numeric keys (works for keys like 1: 'A' or "1": 'A')
    Object.keys(templateData).forEach((k) => {
      if (/^\d+$/.test(k)) {
        varsObj[String(k)] = templateData[k];
      }
    });

    // if no numeric keys, attempt fallback mapping from named keys
    if (Object.keys(varsObj).length === 0) {
      const mapping = {
        guestName: "1",
        location: "2",
        hotelName: "3",
        checkInDate: "4",
        checkInTime: "5",
        checkOutDate: "6",
        checkOutTime: "7",
      };
      Object.entries(mapping).forEach(([name, idx]) => {
        if (templateData[name] != null) varsObj[idx] = templateData[name];
      });
    }
  }

  // ensure expectedCount keys present (fill with empty strings)
  for (let i = 1; i <= Number(expectedCount || 0); i++) {
    if (!Object.prototype.hasOwnProperty.call(varsObj, String(i)))
      varsObj[String(i)] = "";
  }

  // sanitize all values
  const sanitized = {};
  Object.keys(varsObj).forEach((k) => {
    sanitized[k] = sanitizeVarValue(varsObj[k]);
  });

  return sanitized;
}

/**
 * Always sends contentVariables as a JSON string to Twilio (more compatible across SDK versions).
 */
async function sendTemplateWhatsApp(
  toRaw,
  templateKeyOrSid = null,
  templateData = {},
  opts = {}
) {
  const templateSid = opts.templateSid || TEMPLATE_SID;
  if (!templateSid)
    throw new Error(
      "Missing TEMPLATE_SID (set TEMPLATE_SID env or pass opts.templateSid)"
    );

  const toE164 = normalizePhoneNumber(toRaw);
  if (!toE164) throw new Error(`Invalid phone number: ${toRaw}`);

  const expectedCount = Number(opts.expectedCount || 0);
  const vars = normalizeTemplateData(templateData, expectedCount);

  // If vars empty -> throw before Twilio call (prevents Twilio showing sample data)
  if (!vars || Object.keys(vars).length === 0) {
    throw new Error(
      "contentVariables would be empty — ensure you supply template variables"
    );
  }

  // ALWAYS stringfy (Twilio reliably accepts this)
  const contentVariablesString = JSON.stringify(vars);

  if (DEBUG) {
    console.log("sendTemplateWhatsApp debug: to:", toE164);
    console.log("sendTemplateWhatsApp debug: templateSid:", templateSid);
    console.log(
      "sendTemplateWhatsApp debug: contentVariablesString:",
      contentVariablesString
    );
  }

  const baseParams = {
    from: `whatsapp:${fromNumber}`,
    to: `whatsapp:${toE164}`,
    contentSid: templateSid,
    contentVariables: contentVariablesString,
  };

  try {
    const message = await client.messages.create(baseParams);
    return {
      sid: message.sid,
      twilio: message,
      templateSid,
      templateName: opts.templateName || templateKeyOrSid || null,
      previewVariables: vars,
    };
  } catch (err) {
    // rethrow with context
    const msg = err && err.message ? err.message : String(err);
    if (DEBUG) console.error("Twilio create() failed:", msg, err);
    throw err;
  }
}

/**
 * sendBookingNotifications
 * - fixed basePrice reading bug
 * - always computes gateway percent (unless you set GATEWAY_CHARGE_PERCENT=0)
 * - uses raw date strings from booking (booking.rawCheckInDate) if provided so original text is preserved
 */
async function sendBookingNotifications(booking = {}, opts = {}) {
  const errors = [];
  const results = { guestResult: null, hotelResult: null };

  const userTemplateSid =
    opts.userTemplateSid || process.env.USER_TEMPLATE_SID || TEMPLATE_SID;
  const hotelTemplateSid =
    opts.hotelTemplateSid || process.env.HOTEL_TEMPLATE_SID || TEMPLATE_SID;

  if (!userTemplateSid && !hotelTemplateSid) {
    throw new Error(
      "No template SID provided for user or hotel (set USER_TEMPLATE_SID/HOTEL_TEMPLATE_SID or pass opts)"
    );
  }

  const guestPhone = normalizePhoneNumber(
    booking.phone || booking.guestPhone || booking.guest?.phone
  );
  if (!guestPhone)
    errors.push(new Error(`Invalid guest phone: ${booking.phone}`));

  const receptionistRaw =
    booking.receptionistPhone ||
    booking.receptionMobile ||
    (booking.hotel && booking.hotel.receptionMobile) ||
    booking.hotelReceptionPhone ||
    booking.hotel?.receptionPhone;
  const receptionistPhone = normalizePhoneNumber(receptionistRaw);

  // Defensive numeric parsing (fix basePrice bug)
  const basePrice =
    Number(booking.basePrice ?? booking.pricingDetails?.basePrice ?? 0) || 0;
  const gstOnBase =
    Number(booking.gstOnBase ?? booking.pricingDetails?.gstOnBase ?? 0) || 0;
  const platformFee =
    Number(booking.platformFee ?? booking.pricingDetails?.platformFee ?? 0) ||
    0;
  const gstOnPlatform =
    Number(
      booking.gstOnPlatform ?? booking.pricingDetails?.gstOnPlatform ?? 0
    ) || 0;

  // Compute gatewayCharge from configured percent (set GATEWAY_CHARGE_PERCENT=0 to disable)
  const gatewayPercent =
    Number(
      opts.gatewayPercent ??
        process.env.GATEWAY_CHARGE_PERCENT ??
        GATEWAY_CHARGE_PERCENT
    ) || 0;
  const subtotalForGateway =
    basePrice + platformFee + gstOnBase + gstOnPlatform;
  const gatewayCharge = +((subtotalForGateway * gatewayPercent) / 100).toFixed(
    2
  );

  // User-facing calculations
  const baseFare = +(basePrice + platformFee).toFixed(2); // base + platform fee
  const fees = +(gstOnBase + gstOnPlatform + gatewayCharge).toFixed(2); // include gatewayCharge in fees
  const totalPaid = +(baseFare + fees).toFixed(2);

  // Hotel-facing calculations
  const grossTotal = +(
    basePrice +
    gstOnBase +
    platformFee +
    gstOnPlatform +
    gatewayCharge
  ).toFixed(2);
  const netPayableToProperty = +(
    grossTotal -
    (platformFee + gstOnPlatform + gatewayCharge)
  ).toFixed(2);
  const platformCommission = +(
    platformFee +
    gstOnPlatform +
    gatewayCharge
  ).toFixed(2);

  // Preserve original/raw date strings if available (so your templates show the exact text)
  const checkInDateVar =
    booking.rawCheckInDate ??
    booking.checkInDate ??
    booking.timing?.checkInDate ??
    "";
  const checkOutDateVar =
    booking.rawCheckOutDate ??
    booking.checkOutDate ??
    booking.timing?.checkOutDate ??
    "";

  const hotelName =
    booking.hotelName || booking.property || booking.hotel?.propertyName || "";
  const guestName =
    booking.guestName || booking.guest?.name || booking.guestInfo?.name || "";
  const guestPhoneFormatted =
    guestPhone || booking.guestPhone || booking.phone || "";
  const checkInTime = booking.checkInTime || booking.timing?.checkInTime || "";
  const checkOutTime =
    booking.checkOutTime || booking.timing?.checkOutTime || "";
  const paymentId =
    booking.paymentId || booking.payment?.id || booking.paymentIdGateway || "";

  // Build user vars (1..10)
  const userVars = {
    1: sanitizeVarValue(guestName),
    2: sanitizeVarValue(booking.location ?? booking.area ?? hotelName),
    3: sanitizeVarValue(hotelName),
    4: sanitizeVarValue(checkInDateVar),
    5: sanitizeVarValue(checkInTime),
    6: sanitizeVarValue(checkOutDateVar),
    7: sanitizeVarValue(checkOutTime),
    8: String(baseFare.toFixed(2)),
    9: String(fees.toFixed(2)),
    10: String(totalPaid.toFixed(2)),
  };

  // Build hotel vars (1..14)
  const hotelVars = {
    1: sanitizeVarValue(hotelName),
    2: sanitizeVarValue(guestName),
    3: sanitizeVarValue(guestPhoneFormatted),
    4: sanitizeVarValue(checkInDateVar),
    5: sanitizeVarValue(checkInTime),
    6: sanitizeVarValue(checkOutDateVar),
    7: sanitizeVarValue(checkOutTime),
    8: String(basePrice.toFixed(2)),
    9: String(gstOnBase.toFixed(2)),
    10: String(platformFee.toFixed(2)),
    11: String(gstOnPlatform.toFixed(2)),
    12: String(grossTotal.toFixed(2)),
    13: String(netPayableToProperty.toFixed(2)),
    14: String(platformCommission.toFixed(2)),
  };

  // Final debug — show exactly what will be stringified and sent
  const preview = {
    userTemplateSid: userTemplateSid || null,
    hotelTemplateSid: hotelTemplateSid || null,
    userVars,
    hotelVars,
    gatewayPercent,
    gatewayCharge,
  };
  if (DEBUG)
    console.log(
      "sendBookingNotifications preview:",
      JSON.stringify(preview, null, 2)
    );

  // Send to guest (stringified contentVariables inside helper)
  if (guestPhone && userTemplateSid) {
    try {
      const guestResult = await sendTemplateWhatsApp(
        guestPhone,
        opts.userTemplateName || "huts4u_booking_user",
        userVars,
        {
          templateSid: userTemplateSid,
          templateName: opts.userTemplateName || "huts4u_booking_user",
          expectedCount: 10,
        }
      );
      results.guestResult = guestResult;
    } catch (gErr) {
      errors.push(
        new Error(
          `Guest send failed: ${
            gErr && gErr.message ? gErr.message : String(gErr)
          }`
        )
      );
    }
  } else {
    errors.push(
      new Error("Skipping guest send — missing phone or userTemplateSid")
    );
  }

  // Send to hotel/receptionist
  if (receptionistPhone && hotelTemplateSid) {
    try {
      const hotelResult = await sendTemplateWhatsApp(
        receptionistPhone,
        opts.hotelTemplateName || "huts4u_booking_hotel_breakdown",
        hotelVars,
        {
          templateSid: hotelTemplateSid,
          templateName:
            opts.hotelTemplateName || "huts4u_booking_hotel_breakdown",
          expectedCount: 16,
        }
      );
      results.hotelResult = hotelResult;
    } catch (hErr) {
      errors.push(
        new Error(
          `Hotel send failed: ${
            hErr && hErr.message ? hErr.message : String(hErr)
          }`
        )
      );
    }
  } else {
    if (!receptionistPhone) {
      errors.push(
        new Error("No receptionist phone provided — hotel message skipped")
      );
    } else {
      errors.push(new Error("Skipping hotel send — missing hotelTemplateSid"));
    }
  }

  return { ...results, errors: errors.length ? errors : null };
}

module.exports = {
  sendTemplateWhatsApp,
  sendBookingNotifications,
};
