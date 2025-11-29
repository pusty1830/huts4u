// services/payoutService.js (only the relevant parts shown)
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const db = require("../models/mappingIndex");
const Payout = db.Payout;
const Hotel = db.Hotel;

const RZP_KEY_ID = process.env.R_KEY_ID;
const RZP_KEY_SECRET = process.env.R_KEY_SECRET;
if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
  console.warn("Razorpay credentials not set in env (R_KEY_ID/R_KEY_SECRET)");
}

const razorpayAxios = axios.create({
  baseURL: "https://api.razorpay.com/v1",
  auth: {
    username: RZP_KEY_ID || "",
    password: RZP_KEY_SECRET || "",
  },
  timeout: 20000,
});

/**
 * Ensure we have a Razorpay Contact for the hotel (create if missing).
 * Stores contact id on hotel.contactId if created.
 */
async function ensureContactForHotel(hotel) {
  if (!hotel) throw new Error("Hotel not provided");
  if (hotel.contactId) return hotel.contactId;

  // Build contact payload (company/contact details minimal)
  const payload = {
    name: hotel.beneficiaryName || hotel.name || "Hotel",
    type: "customer", // or "vendor" depending on usage; "vendor" is ok if available
    reference_id: `hotel_${hotel.id}`,
    // optionally supply email/phone if available on hotel model
    email: hotel.email || undefined,
    contact: hotel.phone || undefined,
    // notes can be used to store internal ids
    notes: { hotelId: String(hotel.id) },
  };

  const resp = await razorpayAxios.post("/contacts", payload);
  const contactId = resp.data && resp.data.id;
  if (contactId) {
    hotel.contactId = contactId;
    await hotel.save();
  }
  return contactId;
}

/**
 * Ensure a fund account exists for the hotel's bank account.
 * Uses hotel.fundAccountId if present; otherwise creates a fund account using account_number + ifsc.
 * Stores fundAccountId on hotel if created.
 */
async function ensureFundAccountForHotel(hotel) {
  if (!hotel) throw new Error("Hotel not provided");
  if (hotel.fundAccountId) return hotel.fundAccountId;

  // We need a contact id to create a fund account
  const contactId = await ensureContactForHotel(hotel);

  if (!hotel.accountNumber || !hotel.ifsc) {
    throw new Error("Hotel bank details missing (accountNumber/ifsc)");
  }

  const payload = {
    contact_id: contactId,
    account_type: "bank_account",
    bank_account: {
      name: hotel.beneficiaryName || hotel.name || "Hotel",
      ifsc: hotel.ifsc,
      account_number: hotel.accountNumber,
    },
  };

  const resp = await razorpayAxios.post("/fund_accounts", payload);
  const fundAccountId = resp.data && resp.data.id;
  if (fundAccountId) {
    hotel.fundAccountId = fundAccountId;
    await hotel.save();
  }
  return fundAccountId;
}

/**
 * Create payout using Razorpay /v1/payouts endpoint.
 * Uses fundAccountId if available (recommended).
 */
async function createPayoutOnRazorpayX({
  amountPaise,
  currency = "INR",
  fundAccountId,
  accountNumber,
  ifsc,
  beneficiaryName,
  payoutId,
}) {
  // generate idempotency key
  const idempotencyKey = `payout-${payoutId}-${uuidv4()}`;

  // Prefer fund_account_id method
  let payload;
  if (fundAccountId) {
    payload = {
      account_number: undefined, // not required when using fund_account_id
      fund_account_id: fundAccountId,
      amount: amountPaise,
      currency,
      mode: "IMPS", // choose IMPS/NEFT/RTGS as desired
      purpose: "payout",
      narration: `Payout for payoutId:${payoutId}`,
    };
  } else {
    // fallback: send raw account number + ifsc (Razorpay expects a specific shape)
    payload = {
      account_number: accountNumber,
      ifsc: ifsc,
      amount: amountPaise,
      currency,
      mode: "IMPS",
      purpose: "payout",
      narration: `Payout for payoutId:${payoutId}`,
      beneficiary_name: beneficiaryName,
    };
  }

  const headers = {
    "Idempotency-Key": idempotencyKey,
  };

  // POST /v1/payouts
  const resp = await razorpayAxios.post("/payouts", payload, { headers });
  return { idempotencyKey, data: resp.data };
}

/**
 * Real gateway payout implementation.
 * - Uses hotel's fundAccountId if present; otherwise creates contact & fund_account from hotel.accountNumber & hotel.ifsc
 * - Performs payout using /v1/payouts
 * - Returns structured result
 */
async function doGatewayPayout(payoutRow) {
  // reload fresh payout and hotel
  // --- replace the fundAccountId preparation block in doGatewayPayout with this ---

  // reload fresh payout and hotel
  const payout = await Payout.findByPk(payoutRow.id);
  const hotel = await Hotel.findByPk(payout.hotelId);

  if (!hotel) throw new Error("Hotel not found for payout");

  // validate amount
  if (!payout.netAmountPaise || payout.netAmountPaise <= 0) {
    throw new Error("Invalid payout amount (netAmountPaise)");
  }

  // Prefer any existing fundAccountId but if you want to use raw bank fields directly
  // we support: hotel.fundAccountId OR hotel.bankAccountNumber+hotel.bankIfsc (fallback to accountNumber/ifsc)
  let fundAccountId = hotel.fundAccountId || null;

  // try to pick account number + ifsc from whichever column you have
  const accountNumber =
    hotel.bankAccountNumber || hotel.accountNumber || hotel.account_no || null;
  const ifsc = hotel.bankIfsc || hotel.ifsc || hotel.ifsc_code || null;
  const beneficiaryName =
    hotel.beneficiaryName || hotel.name || hotel.ownerName || "Beneficiary";

  if (!fundAccountId && (!accountNumber || !ifsc)) {
    throw new Error(
      "No fundAccountId found and no bank details present on Hotel. Provide hotel.bankAccountNumber + hotel.bankIfsc (or fundAccountId)."
    );
  }

  // If fundAccountId exists, create payout using it; otherwise use direct bank details
  try {
    const resp = await createPayoutOnRazorpayX({
      amountPaise: payout.netAmountPaise,
      currency: payout.currency || "INR",
      fundAccountId: fundAccountId, // may be null
      accountNumber: accountNumber,
      ifsc: ifsc,
      beneficiaryName: beneficiaryName,
      payoutId: payout.id,
    });

    // success result
    return {
      success: true,
      providerResponse: resp.data,
      transactionRef: resp.data && resp.data.id ? resp.data.id : null,
      idempotencyKey: resp.idempotencyKey,
    };
  } catch (err) {
    const respData =
      err.response && err.response.data ? err.response.data : null;
    const msg = err.message || "Payout error";
    throw new Error(JSON.stringify({ msg, respData }));
  }
}

// =====================
// PROCESS ONE PAYOUT
// =====================
async function processPayout(payoutRow) {
  if (!payoutRow) {
    return { success: false, error: "Payout row missing" };
  }

  if (payoutRow.status !== "pending") {
    return {
      success: false,
      skipped: true,
      reason: "Payout not pending",
      status: payoutRow.status,
    };
  }

  // ---- CLAIM USING TRANSACTION (LOCK THE ROW) ----
  const t = await Payout.sequelize.transaction();
  let claimed;

  try {
    // lock
    claimed = await Payout.findOne({
      where: { id: payoutRow.id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!claimed) {
      await t.rollback();
      return { success: false, error: "Payout not found" };
    }

    if (claimed.status !== "pending") {
      await t.rollback();
      return {
        success: false,
        skipped: true,
        reason: "Already claimed",
        status: claimed.status,
      };
    }

    // claim it
    claimed.status = "processing";
    claimed.initiatedAt = new Date();
    await claimed.save({ transaction: t });

    await t.commit();
  } catch (err) {
    await t.rollback();
    return { success: false, error: "Claim failed: " + err.message };
  }

  // ---- CALL RAZORPAY GATEWAY ----
  let gatewayResult;

  try {
    gatewayResult = await doGatewayPayout(claimed);
  } catch (err) {
    // store failure information
    claimed.status = "failed";
    claimed.failureReason =
      err?.message || JSON.stringify(err) || "Unknown payout error";

    // store raw response if present
    if (err.response?.data) {
      claimed.gatewayResponse = err.response.data;
    } else {
      claimed.gatewayResponse = { error: claimed.failureReason };
    }

    claimed.processedAt = new Date();
    await claimed.save();

    return { success: false, error: claimed.failureReason };
  }

  // ---- ON SUCCESS ----
  try {
    claimed.status = "completed";
    claimed.transactionRef =
      gatewayResult.transactionRef ||
      (gatewayResult.providerResponse &&
        gatewayResult.providerResponse.id) ||
      null;

    claimed.gatewayResponse =
      gatewayResult.providerResponse || gatewayResult;

    claimed.processedAt = new Date();

    await claimed.save();

    return { success: true, payout: claimed };
  } catch (err) {
    // if saving success status fails
    claimed.status = "failed";
    claimed.failureReason = "DB save error after success: " + err.message;
    claimed.processedAt = new Date();
    await claimed.save();

    return { success: false, error: claimed.failureReason };
  }
}

// =====================
// PROCESS MULTIPLE / CRON
// ====================
async function processDuePayouts({ limit = 50 } = {}) {
  const now = new Date();

  const duePayouts = await Payout.findAll({
    where: {
      status: "pending",
      scheduledAt: { [Op.lte]: now },
    },
    order: [["scheduledAt", "ASC"]],
    limit,
  });

  const results = [];

  for (const payout of duePayouts) {
    try {
      const result = await processPayout(payout);
      results.push({
        payoutId: payout.id,
        result,
      });
    } catch (err) {
      results.push({
        payoutId: payout.id,
        result: {
          success: false,
          error: err.message || String(err),
        },
      });
    }
  }

  return results;
}

module.exports = {
  processPayout,
  processDuePayouts,
  doGatewayPayout, // exported for testing
};
