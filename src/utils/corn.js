// cron/payoutCron.js
const cron = require("node-cron");
const { processDuePayouts } = require("../service/payoutService");

function startPayoutCron() {
  // runs daily at 14:00 Asia/Kolkata
  // node-cron accepts { timezone: 'Asia/Kolkata' }
  cron.schedule(
    "13 17 * * *",
    async () => {
      try {
        console.log("[payout-cron] start:", new Date().toISOString());
        const res = await processDuePayouts({ limit: 100 });
        console.log("[payout-cron] done:", res.length, "items");
      } catch (err) {
        console.error("[payout-cron] error:", err);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Payout cron scheduled: daily at 14:00 IST (Asia/Kolkata)");
}

module.exports = { startPayoutCron };
