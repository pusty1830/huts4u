// controllers/bookingsController.js
const { sendTemplateSMS } = require("../utils/twolio");
const sendEmail = require("../utils/mail"); // your email helper
require("dotenv").config();

/**
 * POST /bookings/confirm
 * Example body:
 * {
 *   "guestName": "Amitav",
 *   "location": "Blue Lagoon Site",
 *   "hotelName": "Huts4u - Blue Lagoon",
 *   "hotelEmail": "hotel@example.com",        // <--- HOTEL EMAIL (optional if DEFAULT_HOTEL_EMAIL set)
 *   "checkInDate": "2025-12-08",
 *   "checkInTime": "15:00",
 *   "checkOutDate": "2025-12-09",             // optional
 *   "checkOutTime": "11:00",                  // optional
 *   "phone": "+919812345678",
 *   "rooms": 1,
 *   "adults": 2,
 *   "children": 0,
 *   "amountPaid": 2250,
 *   "notes": "Late arrival",
 *   "templateSid": "TEMPLATE_SID_FROM_DLT",   // optional - for your tracking
 *   "templateName": "Approved Template Name"  // optional - for your tracking
 * }
 */
async function confirmBooking(req, res) {
  try {
    const p = req.body || {};

    console.log("confirmBooking payload:", p);

    // minimal required fields
    const required = [
      "phone",
      "guestName",
      "hotelName",
      "checkInDate",
      "checkInTime",
    ];
    for (const f of required) {
      if (!p[f]) return res.status(400).json({ error: `${f} is required` });
    }

    // default template key in code is 'approved_huts4u'
    const templateKey = p.template || "approved_huts4u";

    // Build data mapping for SMS template (numeric keys must be strings)
    const templateData = {
      1: p["1"] || p.guestName,
      2: p["2"] || p.location || p.property || p.hotelName,
      3: p["3"] || p.hotelName,
      4: p["4"] || p.checkInDate,
      5: p["5"] || p.checkInTime,

      // named keys (also available to your sendTemplateSMS implementation)
      guestName: p.guestName,
      location: p.location || p.property || p.hotelName,
      hotelName: p.hotelName,
      checkInDate: p.checkInDate,
      checkInTime: p.checkInTime,
    };

    // templateSid and readable templateName (for tracking)
    const templateSid = p.templateSid || p.template_sid || null;
    const templateNameForTracking = p.templateName || p.template_name || null;

    // Send the templated SMS
    const result = await sendTemplateSMS(p.phone, templateKey, templateData, {
      templateSid,
      templateName: templateNameForTracking,
    });

    // --- send email to hotel (only) ---
    // Resolve hotel email (prefer payload, fall back to env)
    const hotelEmail =
      p.hotelEmail ;
    if (hotelEmail) {
      // Prepare data for the hotelBooking.ejs template
      const emailData = {
        logoUrl:
          "https://huts44u.s3.ap-south-1.amazonaws.com/hutlogo-removebg-preview.png", // logo URL for header
        hotelName: p.hotelName,
        guestName: p.guestName,
        guestPhone: p.phone,
        propertyName: p.property || p.hotelName,
        checkInDate: p.checkInDate,
        checkInTime: p.checkInTime,
        checkOutDate: p.checkOutDate || "",
        checkOutTime: p.checkOutTime || "",
        rooms: p.rooms || 1,
        adults: p.adults || 1,
        children: p.children || 0,
        amountPaid: p.amountPaid || 0,
        notes: p.notes || "",
      };

      // Fire-and-log: don't block the SMS result — but capture the outcome
      try {
        await sendEmail(
          hotelEmail,
          `New Booking from Huts4u — ${p.guestName}`,
          "hotelBooking", // ejs template name (views/hotelBooking.ejs)
          emailData
        );
        console.log(`Hotel booking email sent to ${hotelEmail}`);
      } catch (mailErr) {
        console.error("Error sending hotel email:", mailErr);
        // Include mail error info in response if you want (we'll include a flag below)
      }
    } else {
      console.warn(
        "No hotelEmail provided and DEFAULT_HOTEL_EMAIL not set — skipping hotel email."
      );
    }

    // Optionally update booking status in DB here (not included)

    return res.status(200).json({
      success: true,
      twilioMessageSid: result.twilio?.sid || result.sid || null,
      templateUsed: result.templateName || templateKey,
      templateSid: result.templateSid || templateSid,
      bodySentPreview: result.bodySent || result.preview || null,
      hotelEmailSent: !!hotelEmail,
    });
  } catch (err) {
    console.error("confirmBooking error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send confirmation SMS", details: err.message });
  }
}

module.exports = { confirmBooking };
