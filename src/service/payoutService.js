// // services/payoutService.js
// const axios = require("axios");
// const { v4: uuidv4 } = require("uuid");
// const { Op } = require("sequelize");
// const db = require("../models/mappingIndex");
// const Payout = db.Payout;
// const Hotel = db.Hotel;

// // --- CRITICAL CONFIGURATION ---
// const RZP_KEY_ID = process.env.R_KEY_ID;
// const RZP_KEY_SECRET = process.env.R_KEY_SECRET;
// const RZP_X_ACCOUNT_NUMBER = process.env.RZP_X_ACCOUNT_NUMBER; 

// if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
//   console.warn("Razorpay credentials not set in env (R_KEY_ID/R_KEY_SECRET)");
// }
// if (!RZP_X_ACCOUNT_NUMBER) {
//   console.warn("RazorpayX source account number not set in env (RZP_X_ACCOUNT_NUMBER)");
// }
// // ------------------------------

// const razorpayAxios = axios.create({
//   baseURL: "https://api.razorpay.com/v1",
//   auth: {
//     username: RZP_KEY_ID || "",
//     password: RZP_KEY_SECRET || "",
//   },
//   timeout: 20000,
// });

// /**
//  * Ensure we have a Razorpay Contact for the hotel (create if missing).
//  * Stores contact id on hotel.contactId if created.
//  */
// async function ensureContactForHotel(hotel) {
//   if (!hotel) throw new Error("Hotel not provided");
//   if (hotel.contactId) return hotel.contactId;

//   // Build contact payload
//   const payload = {
//     name: hotel.beneficiaryName || hotel.name || "Hotel",
//     type: "vendor", // 'vendor' or 'customer' is generally used for payees
//     reference_id: `hotel_${hotel.id}`,
//     email: hotel.email || undefined,
//     contact: hotel.phone || undefined,
//     notes: { hotelId: String(hotel.id) },
//   };

//   const resp = await razorpayAxios.post("/contacts", payload);
//   const contactId = resp.data && resp.data.id;
//   if (contactId) {
//     hotel.contactId = contactId;
//     await hotel.save();
//   }
//   return contactId;
// }

// /**
//  * Ensure a fund account exists for the hotel's bank account.
//  * Stores fundAccountId on hotel if created.
//  */
// async function ensureFundAccountForHotel(hotel) {
//   if (!hotel) throw new Error("Hotel not provided");
//   if (hotel.fundAccountId) return hotel.fundAccountId;

//   // We need a contact id to create a fund account
//   const contactId = await ensureContactForHotel(hotel);

//   if (!hotel.accountNumber || !hotel.ifsc) {
//     throw new Error("Hotel bank details missing (accountNumber/ifsc)");
//   }

//   const payload = {
//     contact_id: contactId,
//     account_type: "bank_account",
//     bank_account: {
//       name: hotel.beneficiaryName || hotel.name || "Hotel",
//       ifsc: hotel.ifsc,
//       account_number: hotel.accountNumber,
//     },
//   };

//   const resp = await razorpayAxios.post("/fund_accounts", payload);
//   const fundAccountId = resp.data && resp.data.id;
//   if (fundAccountId) {
//     hotel.fundAccountId = fundAccountId;
//     await hotel.save();
//   }
//   return fundAccountId;
// }

// /**
//  * Create payout using Razorpay /v1/payouts endpoint.
//  * Now requires sourceXAccountNumber (your RZP X account)
//  */
// async function createPayoutOnRazorpayX({
//   amountPaise,
//   currency = "INR",
//   fundAccountId,
//   accountNumber, // beneficiary account number (only for fallback)
//   ifsc, // beneficiary ifsc (only for fallback)
//   beneficiaryName,
//   payoutId,
//   sourceXAccountNumber, // <<-- YOUR RZP X ACCOUNT NUMBER
// }) {
//   if (!sourceXAccountNumber) {
//     throw new Error("Source RazorpayX Account Number is required for Payout API.");
//   }
  
//   // generate idempotency key
//   const idempotencyKey = `payout-${payoutId}-${uuidv4()}`;

//   // Prefer fund_account_id method
//   let payload;
//   if (fundAccountId) {
//     payload = {
//       // FIX: Use your RZP X Account Number as the source
//       account_number: sourceXAccountNumber, 
//       fund_account_id: fundAccountId,
//       amount: amountPaise,
//       currency,
//       mode: "IMPS", // choose IMPS/NEFT/RTGS as desired
//       purpose: "payout",
//       narration: `Payout for payoutId:${payoutId}`,
//       reference_id: String(payoutId),
//       // Recommended: Queue if funds are low instead of failing
//       queue_if_low_balance: true, 
//     };
//   } else {
//     // fallback: send raw account number + ifsc (This requires your RZP X account number as well)
//     payload = {
//       account_number: sourceXAccountNumber, // FIX: Use your RZP X Account Number as the source
//       fund_account_id: undefined, // Must be undefined if using raw bank details
//       // Raw Bank Details
//       account_number: accountNumber, 
//       ifsc: ifsc,
//       beneficiary_name: beneficiaryName,
      
//       amount: amountPaise,
//       currency,
//       mode: "IMPS",
//       purpose: "payout",
//       narration: `Payout for payoutId:${payoutId}`,
//       reference_id: String(payoutId),
//       queue_if_low_balance: true,
//     };
//   }

//   const headers = {
//     "Idempotency-Key": idempotencyKey,
//   };

//   // POST /v1/payouts
//   const resp = await razorpayAxios.post("/payouts", payload, { headers });
//   return { idempotencyKey, data: resp.data };
// }

// /**
//  * Real gateway payout implementation.
//  * - Uses hotel's fundAccountId if present; otherwise uses direct bank details
//  * - Performs payout using /v1/payouts
//  */
// async function doGatewayPayout(payoutRow) {
//   // reload fresh payout and hotel
//   const payout = await Payout.findByPk(payoutRow.id);
//   const hotel = await Hotel.findByPk(payout.hotelId);

//   // CRITICAL: Check for your RZP X Account Number
//   if (!RZP_X_ACCOUNT_NUMBER) {
//     throw new Error("RZP_X_ACCOUNT_NUMBER environment variable is missing.");
//   }
//   if (!hotel) throw new Error("Hotel not found for payout");
//   if (!payout.netAmountPaise || payout.netAmountPaise <= 0) {
//     throw new Error("Invalid payout amount (netAmountPaise)");
//   }

//   let fundAccountId = hotel.fundAccountId || null;
//   const accountNumber =
//     hotel.bankAccountNumber || hotel.accountNumber || hotel.account_no || null;
//   const ifsc = hotel.bankIfsc || hotel.ifsc || hotel.ifsc_code || null;
//   const beneficiaryName =
//     hotel.beneficiaryName || hotel.name || hotel.ownerName || "Beneficiary";

//   if (!fundAccountId && (!accountNumber || !ifsc)) {
//     // If fundAccountId is missing, ensure we have the raw bank details for fallback
//     throw new Error(
//       "No fundAccountId found and no bank details present on Hotel."
//     );
//   }

//   try {
//     const resp = await createPayoutOnRazorpayX({
//       amountPaise: payout.netAmountPaise,
//       currency: payout.currency || "INR",
//       fundAccountId: fundAccountId,
//       accountNumber: accountNumber,
//       ifsc: ifsc,
//       beneficiaryName: beneficiaryName,
//       payoutId: payout.id,
//       // PASS YOUR RZP X ACCOUNT NUMBER
//       sourceXAccountNumber: RZP_X_ACCOUNT_NUMBER, 
//     });

//     // success result
//     return {
//       success: true,
//       providerResponse: resp.data,
//       transactionRef: resp.data && resp.data.id ? resp.data.id : null,
//       idempotencyKey: resp.idempotencyKey,
//     };
//   } catch (err) {
//     const respData =
//       err.response && err.response.data ? err.response.data : null;
//     const msg = err.message || "Payout error";
//     throw new Error(JSON.stringify({ msg, respData }));
//   }
// }

// // =====================
// // SAFER PROCESSING HELPERS (NO CHANGES HERE)
// // =====================

// /**
//  * Process a single payout Sequelize instance.
//  */
// async function processPayout(payoutRow) {
//   if (!payoutRow) {
//     return { success: false, error: "Payout row missing" };
//   }

//   const fresh = await Payout.findByPk(payoutRow.id);

//   if (!fresh) return { success: false, error: "Payout not found" };

//   if (fresh.status !== "pending") {
//     return {
//       success: false,
//       skipped: true,
//       reason: "not-pending",
//       status: fresh.status,
//       payoutId: fresh.id,
//     };
//   }

//   // ---- CLAIM USING TRANSACTION (LOCK THE ROW) ----
//   const t = await Payout.sequelize.transaction();
//   let claimed;
//   try {
//     claimed = await Payout.findOne({
//       where: { id: fresh.id },
//       lock: t.LOCK.UPDATE,
//       transaction: t,
//     });

//     if (!claimed) {
//       await t.rollback();
//       return { success: false, error: "Payout not found during claim" };
//     }

//     if (claimed.status !== "pending") {
//       await t.rollback();
//       return { success: false, skipped: true, reason: "already-claimed", status: claimed.status };
//     }

//     claimed.status = "processing";
//     claimed.initiatedAt = new Date();
//     await claimed.save({ transaction: t });

//     await t.commit();
//   } catch (err) {
//     try { await t.rollback(); } catch (_) {}
//     return { success: false, error: `Claim failed: ${err.message || err}` };
//   }

//   // ---- CALL GATEWAY ----
//   try {
//     const gatewayResult = await doGatewayPayout(claimed);

//     // Razorpay Payouts go to a 'processing' state first, then Webhooks update the final status.
//     // We mark it as initiated/sent. You'll need a Webhook handler for the final 'processed' or 'failed' status.
//     claimed.status = "initiated"; // Changed from 'completed' to 'initiated' for accuracy
//     claimed.transactionRef =
//       gatewayResult.transactionRef ||
//       (gatewayResult.providerResponse && gatewayResult.providerResponse.id) ||
//       null;
//     claimed.gatewayResponse = gatewayResult.providerResponse || gatewayResult;
//     claimed.processedAt = new Date();
//     await claimed.save();

//     return { success: true, payout: claimed };
//   } catch (err) {
//     // mark failed and record details
//     claimed.status = "failed";
//     claimed.failureReason = err?.message || JSON.stringify(err) || "Unknown payout error";
//     claimed.gatewayResponse = err.response?.data || { error: claimed.failureReason };
//     claimed.processedAt = new Date();
//     await claimed.save();

//     return { success: false, error: claimed.failureReason, payout: claimed };
//   }
// }

// /**
//  * processDuePayouts is the cron entrypoint.
//  * FIX: This now correctly filters by scheduledAt <= now.
//  */
// async function processDuePayouts({ limit = 50 } = {}) {
//   const now = new Date();
//   console.log("[payout-cron] now:", now.toISOString());

//   const duePayouts = await Payout.findAll({
//     where: {
//       status: "pending",
//       // CRITICAL FIX: Only process payouts that are scheduled now or earlier
//       scheduledAt: {
//         [Op.lte]: now,
//       },
//     },
//     order: [["scheduledAt", "ASC"]],
//     limit,
//   });

//   console.log("[payout-cron] due count:", duePayouts.length, "ids:", duePayouts.map(d => d.id));

//   const results = [];
//   for (const payout of duePayouts) {
//     try {
//       const result = await processPayout(payout);
//       results.push({ payoutId: payout.id, result });
//     } catch (err) {
//       results.push({ payoutId: payout.id, result: { success: false, error: err.message || String(err) } });
//     }
//   }

//   return results;
// }

// // EXPORTS 
// module.exports = {
//   processPayout,
//   // processPayoutById,
//   // processSelectedPending,
//   processDuePayouts,
//   doGatewayPayout,
//   // Added for completeness/flexibility
//   ensureContactForHotel,
//   ensureFundAccountForHotel,
// };