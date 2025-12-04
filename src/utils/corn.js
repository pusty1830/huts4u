// cron.js (or schedule-payouts.js)

// Requires: dotenv package for loading .env file if used
require("dotenv").config(); 
const payoutService = require("../service/payoutService");
const db = require("../models/mappingIndex"); // Ensure this correctly loads your DB/Sequelize setup

/**
 * Runs the main cron logic to find and process due RazorpayX payouts.
 */
async function runPayoutCron() {
  console.log("--- Starting Scheduled Payout Processing ---");

  try {
    // Run the main logic that finds and processes due payouts
    // Using processDuePayouts which correctly filters by status='pending' and scheduledAt <= now
    const results = await payoutService.processDuePayouts({ limit: 50 });

    const total = results.length;
    // Check for success and 'initiated' status to distinguish from API failures
    const initiated = results.filter(r => r.result.success && r.result.payout && r.result.payout.status === 'initiated').length;
    const failed = results.filter(r => r.result.success === false).length;

    console.log(`\n✅ Payout Cron Summary:`);
    console.log(`- Total attempts: ${total}`);
    console.log(`- Initiated (Sent to RZP): ${initiated}`);
    console.log(`- Failed (API error/DB lock failure): ${failed}`);

    // Log details of critical failures
    results
      .filter(r => !r.result.success && !r.result.skipped)
      .forEach(r => {
        console.error(`- Payout ${r.payoutId} FAILED during API call:`, r.result.error);
      });
      
    return results; // Return results for external caller to inspect if needed

  } catch (error) {
    console.error("❌ CRITICAL ERROR DURING PAYOUT CRON EXECUTION:", error.message);
    throw error; // Re-throw the error so the caller can handle it
  } finally {
    // Important: Close the database connection if your ORM doesn't manage it automatically
    if (db.sequelize) {
        await db.sequelize.close(); 
    }
    console.log("--- Scheduled Payout Processing Finished ---");
  }
}

// --- EXPORT THE FUNCTION ---
module.exports = {
    runPayoutCron
};