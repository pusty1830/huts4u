// routes/bookings.js
const express = require("express");
const router = express.Router();
const { confirmBooking } = require("../controller/booking.controller");
const { prepareBody } = require("../utils/response");

router.post("/confirm", prepareBody, confirmBooking);

module.exports = router;
