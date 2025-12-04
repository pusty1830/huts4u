const razorpay = require("../utils/razorpay");
const crypto = require("crypto");
const { prepareResponse } = require("../utils/response");

exports.createOrder = async (req, res) => {
  const { amount, currency } = req.body;

  try {
    const options = {
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}`,
    };
    console.log(options);
    const order = await razorpay.orders.create(options);

    res
      .status(201)
      .json(prepareResponse("CREATED", "Order created", order, null));
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json(
        prepareResponse("SERVER_ERROR", "Failed to create order", null, error)
      );
  }
};

exports.verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.R_KEY_SECRET)
    .update(body)
    .digest("hex");

  console.log(expectedSignature);
  if (expectedSignature !== signature) {
    return res
      .status(400)
      .json(
        prepareResponse("INVALID_SIGNATURE", "Signature mismatch", null, null)
      );
  }

  try {
    const paymentDetails = await razorpay.payments.fetch(paymentId);

    // const payment = new Payment({
    //   orderId,
    //   paymentId,
    //   signature,
    //   amount: paymentDetails.amount / 100,
    //   currency: paymentDetails.currency,
    //   status: paymentDetails.status,
    // });

    // await payment.save();

    res
      .status(200)
      .json(
        prepareResponse(
          "SUCCESS",
          "Payment verified and saved",
          paymentDetails,
          null
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(
        prepareResponse(
          "SERVER_ERROR",
          "Payment verification failed",
          null,
          error
        )
      );
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find();
    res
      .status(200)
      .json(prepareResponse("SUCCESS", "Payments fetched", payments, null));
  } catch (error) {
    res
      .status(500)
      .json(
        prepareResponse("SERVER_ERROR", "Failed to fetch payments", null, error)
      );
  }
};

exports.cancelPayment = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res
        .status(400)
        .json(
          prepareResponse("BAD_REQUEST", "paymentId is required", null, null)
        );
    }

    // build payload for razorpay (amount in paise). If no amount, gateway will do full refund.
    const refundPayload = {};
    if (typeof amount !== "undefined" && amount !== null) {
      // Make sure caller passed paise. If they pass rupees accidentally, they must multiply by 100 on frontend.
      refundPayload.amount = amount;
    }

    const refundResponse = await razorpay.payments.refund(
      paymentId,
      refundPayload
    );
    

    return res
      .status(200)
      .json(
        prepareResponse(
          "SUCCESS",
          "Refund processed",
          { refund: refundResponse },
          null
        )
      );
  } catch (error) {
    console.error("Refund Error:", error);

    // Razorpay error shape sometimes in error.error.description
    const errMsg =
      error?.error?.description || error?.message || "Refund failed";

    return res
      .status(500)
      .json(
        prepareResponse("SERVER_ERROR", "Refund failed", null, {
          message: errMsg,
        })
      );
  }
};
