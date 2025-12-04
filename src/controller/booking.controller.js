// controllers/bookingsController.js
const {
  sendTemplateWhatsApp,
  sendBookingNotifications,
} = require("../utils/twolio");
const sendEmail = require("../utils/mail"); // your email helper
require("dotenv").config();

/** Simple date formatter: return YYYY-MM-DD if parsable, otherwise original trimmed string */
/**
 * Robust date parser + formatter -> returns "YYYY-MM-DD" or "" if unparseable.
 *
 * Heuristics:
 * - Accepts many common formats: ISO, "DD MMM YYYY", "D MMMM YYYY", "DD/MM/YYYY", "DD-MM-YYYY",
 *   "YYYY-MM-DD", "YYYY/MM/DD", "MM/DD/YYYY" (rare), "DD.MM.YYYY", "DD MMM, YYYY", "1st Jan 2025", etc.
 * - For ambiguous numeric formats with slashes/dashes (e.g. 03/04/2025), it assumes DD/MM/YYYY
 *   (India-style). If you want to prefer MM/DD, change the `preferMDY` flag below.
 * - Time portions are ignored.
 */
function formatDateForTemplate(input) {
  if (!input && input !== 0) return "";

  const preferMDY = false; // set true to treat 03/04/2025 as MM/DD/YYYY instead of DD/MM/YYYY

  let s = String(input).trim();

  // strip time portion (anything after a space that contains digits: "2025-12-01 12:00", "04 Dec 2025 12:00 PM")
  // also remove commas
  s = s.replace(/,\s*/g, " ");
  s = s.replace(/\s*\b(?:at|@)\b\s*/gi, " ");
  // remove ordinal suffixes (1st, 2nd, 3rd, 4th)
  s = s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
  // remove multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  // If it's already ISO-like YYYY-MM-DD or YYYY/MM/DD -> normalize quickly
  const mIso = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (mIso) {
    const yyyy = mIso[1];
    const mm = String(Number(mIso[2])).padStart(2, "0");
    const dd = String(Number(mIso[3])).padStart(2, "0");
    // basic validity check
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    if (!isNaN(date.getTime())) return `${yyyy}-${mm}-${dd}`;
  }

  // Handle numeric-only with slashes or dashes: DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const mNum = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (mNum) {
    let a = Number(mNum[1]),
      b = Number(mNum[2]),
      yyyy = Number(mNum[3]);
    let dd, mm;

    if (preferMDY) {
      mm = a;
      dd = b;
    } else {
      // prefer DD/MM/YYYY, but if first token > 12 it's definitely a day
      if (a > 12 && b <= 12) {
        dd = a;
        mm = b;
      } else {
        // default to DD/MM
        dd = a;
        mm = b;
      }
    }
    // validity
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const mmS = String(mm).padStart(2, "0");
      const ddS = String(dd).padStart(2, "0");
      const iso = `${yyyy}-${mmS}-${ddS}`;
      const date = new Date(`${iso}T00:00:00Z`);
      if (!isNaN(date.getTime())) return iso;
    }
  }

  // Month name parsing (e.g., "4 Dec 2025", "04 December 2025", "Dec 4 2025")
  // Create mapping
  const months = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  // Try patterns with month names
  // e.g. "4 Dec 2025", "04 Dec 2025", "Dec 04 2025", "December 4 2025", "1 December 2025 12:00 PM"
  const mMonth = s.match(
    /^(?:(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}))|^(?:([A-Za-z]+)\s+(\d{1,2})\s+(\d{4}))/i
  );
  if (mMonth) {
    let dd = null,
      mon = null,
      yyyy = null;
    if (mMonth[1] && mMonth[2] && mMonth[3]) {
      dd = Number(mMonth[1]);
      mon = String(mMonth[2]).toLowerCase();
      yyyy = Number(mMonth[3]);
    } else if (mMonth[4] && mMonth[5] && mMonth[6]) {
      mon = String(mMonth[4]).toLowerCase();
      dd = Number(mMonth[5]);
      yyyy = Number(mMonth[6]);
    }
    if (mon && months[mon] && yyyy && dd >= 1 && dd <= 31) {
      const mmS = String(months[mon]).padStart(2, "0");
      const ddS = String(dd).padStart(2, "0");
      const iso = `${yyyy}-${mmS}-${ddS}`;
      const date = new Date(`${iso}T00:00:00Z`);
      if (!isNaN(date.getTime())) return iso;
    }
  }

  // Fallback: try Date.parse (last resort) — normalize to UTC date parts
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Unparseable -> return original trimmed input so it's visible rather than empty
  return String(input).trim();
}

/**
 * POST /bookings/confirm
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

    // gather pricing fields (accept either direct fields or nested pricingDetails)
    const pricing = p.pricingDetails || {};
    const basePrice = Number(p.basePrice ?? pricing.basePrice ?? 0);
    const gstOnBase = Number(p.gstOnBase ?? pricing.gstOnBase ?? 0);
    const platformFee = Number(p.platformFee ?? pricing.platformFee ?? 0);
    const gstOnPlatform = Number(p.gstOnPlatform ?? pricing.gstOnPlatform ?? 0);

    // read razorpay exact fee if provided (prefer root p.razorpayfee then pricing.razorpayfee)
    const razorpayfee = Number(p.razorpayfee ?? pricing.razorpayfee ?? 0);

    // compute derived values (controller-local, but final calc performed in twolio helper)
    const baseFare = +(basePrice + platformFee).toFixed(2); // user: base fare = base + platform fee
    const fees = +(gstOnBase + gstOnPlatform + razorpayfee).toFixed(2); // include razorpayfee here for local response
    const totalPrice = +(baseFare + fees).toFixed(2); // user's total paid
    const grossTotal = +(
      basePrice +
      gstOnBase +
      platformFee +
      gstOnPlatform +
      (razorpayfee || 0)
    ).toFixed(2);
    const netPayableToProperty = +(
      grossTotal -
      (platformFee + gstOnPlatform + (razorpayfee || 0))
    ).toFixed(2);
    const platformCommission = +(
      platformFee +
      gstOnPlatform +
      (razorpayfee || 0)
    ).toFixed(2);

    // formatted dates for templates
    const formattedCheckInDate = formatDateForTemplate(p.checkInDate);
    const formattedCheckOutDate = formatDateForTemplate(p.checkOutDate);

    // Build a compact booking payload for notification helper
    const bookingPayload = {
      guestName: p.guestName,
      phone: p.phone,
      hotelName: p.hotelName,
      location: p.location || p.property || `${p.hotelName}` || "",
      checkInDate: formattedCheckInDate,
      checkInTime: p.checkInTime,
      checkOutDate: formattedCheckOutDate,
      checkOutTime: p.checkOutTime || "",
      basePrice,
      gstOnBase,
      platformFee,
      gstOnPlatform,
      // pass explicit gatewayCharge (Razorpay exact fee) so helper uses it instead of recomputing %
      gatewayCharge:
        typeof razorpayfee === "number" && razorpayfee > 0
          ? Number(razorpayfee.toFixed(2))
          : undefined,
      totalPrice: totalPrice,
      paymentId: p.paymentId || p.payment_id || p.payment?.id || null,
      notes: p.notes || "",
      // receptionist/hotel phones
      receptionistPhone:
        p.receptionistPhone ||
        p.receptionMobile ||
        p.hotel?.receptionMobile ||
        p.hotelReceptionPhone ||
        null,
    };

    // Try to use the high-level helper if available (sends both user & hotel)
    let notifyRes = null;
    if (typeof sendBookingNotifications === "function") {
      try {
        notifyRes = await sendBookingNotifications(bookingPayload, {
          userTemplateSid:
            p.userTemplateSid ||
            p.templateSid ||
            process.env.USER_TEMPLATE_SID ||
            process.env.TEMPLATE_SID,
          hotelTemplateSid:
            p.hotelTemplateSid ||
            process.env.HOTEL_TEMPLATE_SID ||
            process.env.TEMPLATE_SID,
          userTemplateName:
            p.templateName || p.template_name || "huts4u_booking_user",
          hotelTemplateName:
            p.hotelTemplateName || "huts4u_booking_hotel_breakdown",
        });
        console.log("sendBookingNotifications result:", notifyRes);
      } catch (notifErr) {
        console.error("sendBookingNotifications error:", notifErr);
        // fallback to per-recipient sends below
      }
    }

    // If high-level helper failed or not present, fall back to per-recipient sends
    let guestResult = null;
    let hotelResult = null;
    const fallbackErrors = [];

    if (!notifyRes) {
      // Build user template variables (placeholders 1..10)
      const userTemplateData = {
        1: p.guestName,
        2: bookingPayload.location,
        3: p.hotelName,
        4: formattedCheckInDate,
        5: p.checkInTime,
        6: formattedCheckOutDate || "",
        7: p.checkOutTime || "",
        8: String(baseFare.toFixed(2)),
        9: String(fees.toFixed(2)),
        10: String(totalPrice.toFixed(2)),
        // named fallbacks
        guestName: p.guestName,
        location: bookingPayload.location,
        hotelName: p.hotelName,
        checkInDate: formattedCheckInDate,
        checkInTime: p.checkInTime,
      };

      const userTemplateSid =
        p.userTemplateSid ||
        p.templateSid ||
        process.env.USER_TEMPLATE_SID ||
        process.env.TEMPLATE_SID;
      try {
        guestResult = await sendTemplateWhatsApp(
          p.phone,
          p.template || "huts4u_booking_user",
          userTemplateData,
          {
            templateSid: userTemplateSid,
            templateName: p.templateName || "huts4u_booking_user",
            expectedCount: 10,
          }
        );
        console.log(
          "Guest WhatsApp sent:",
          guestResult && (guestResult.twilio?.sid || guestResult.sid)
        );
      } catch (gErr) {
        console.error("Guest sendTemplateWhatsApp error:", gErr);
        fallbackErrors.push(
          new Error(`Guest send failed: ${gErr.message || gErr}`)
        );
      }

      // Build hotel template variables (placeholders 1..14)
      const hotelTemplateData = {
        1: p.hotelName,
        2: p.guestName,
        3: p.phone,
        4: formattedCheckInDate,
        5: p.checkInTime,
        6: formattedCheckOutDate || "",
        7: p.checkOutTime || "",
        8: String(basePrice.toFixed(2)),
        9: String(gstOnBase.toFixed(2)),
        10: String(platformFee.toFixed(2)),
        11: String(gstOnPlatform.toFixed(2)),
        12: String(grossTotal.toFixed(2)),
        13: String(netPayableToProperty.toFixed(2)),
        14: String(platformCommission.toFixed(2)),
        // named fallback for paymentId
        paymentId: p.paymentId || p.payment_id || p.payment?.id || "",
        15: p.paymentId || p.payment_id || p.payment?.id || "",
        16: p.notes || "",
      };

      const hotelTemplateSid =
        p.hotelTemplateSid ||
        process.env.HOTEL_TEMPLATE_SID ||
        process.env.TEMPLATE_SID;
      const receptionistPhone = bookingPayload.receptionistPhone;
      if (receptionistPhone) {
        try {
          hotelResult = await sendTemplateWhatsApp(
            receptionistPhone,
            p.hotelTemplate || "huts4u_booking_hotel_breakdown",
            hotelTemplateData,
            {
              templateSid: hotelTemplateSid,
              templateName:
                p.hotelTemplateName || "huts4u_booking_hotel_breakdown",
              expectedCount: 14,
            }
          );
          console.log(
            "Hotel WhatsApp sent:",
            hotelResult && (hotelResult.twilio?.sid || hotelResult.sid)
          );
        } catch (hErr) {
          console.error("Hotel sendTemplateWhatsApp error:", hErr);
          fallbackErrors.push(
            new Error(`Hotel send failed: ${hErr.message || hErr}`)
          );
        }
      } else {
        console.warn("No receptionist phone provided; hotel WhatsApp skipped.");
      }
    }

    // --- send email to hotel (only) ---
    const hotelEmail = p.hotelEmail;
    if (hotelEmail) {
      const emailData = {
        logoUrl:
          "https://huts44u.s3.ap-south-1.amazonaws.com/hutlogo-removebg-preview.png", // logo URL for header
        hotelName: p.hotelName,
        guestName: p.guestName,
        guestPhone: p.phone,
        propertyName: p.property || p.hotelName,
        checkInDate: formattedCheckInDate,
        checkInTime: p.checkInTime,
        checkOutDate: formattedCheckOutDate || "",
        checkOutTime: p.checkOutTime || "",
        rooms: p.rooms || 1,
        adults: p.adults || 1,
        children: p.children || 0,
        amountPaid: p.amountPaid ?? totalPrice,
        basePrice,
        gstOnBase,
        platformFee,
        gstOnPlatform,
        totalPrice,
        notes: p.notes || "",
      };

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
        // not fatal
      }
    } else {
      console.warn(
        "No hotelEmail provided and DEFAULT_HOTEL_EMAIL not set — skipping hotel email."
      );
    }

    // Build response payload
    const responsePayload = {
      success: true,
      booking: {
        guestName: p.guestName,
        hotelName: p.hotelName,
        checkInDate: formattedCheckInDate,
        checkInTime: p.checkInTime,
        checkOutDate: formattedCheckOutDate,
        checkOutTime: p.checkOutTime,
        pricing: {
          basePrice,
          gstOnBase,
          platformFee,
          gstOnPlatform,
          baseFare,
          fees,
          totalPrice,
        },
      },
      notifications: notifyRes || {
        guestResult,
        hotelResult,
        fallbackErrors: fallbackErrors.length
          ? fallbackErrors.map((e) => e.message || e)
          : null,
      },
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error("confirmBooking error:", err);
    return res.status(500).json({
      error: "Failed to send confirmation SMS",
      details: err.message || err,
    });
  }
}

module.exports = { confirmBooking };
