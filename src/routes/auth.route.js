const router = require("express").Router();
const { prepareBody } = require("../utils/response");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  sendOTP,
  verifyOTP,
  register,
  getProfile,
  Signup,
  Signin,
  updateProfile,
  deleteProfile,
  fileUploader,
  getOneProfile,
  resetPassword,
} = require("../controller/auth.controller");
const {
  signupValidation,
  signinValidation,
  update,
  resetPassword: reset,
  forgotPassword: forgot,
} = require("../validators/auth.validator");
const checkMail = require("../middleware/checkMail");
const { verifySign } = require("../utils/token");
const upload = require("../middleware/multer");

// send OTP toPhone Number
router.route("/send-otp").post(prepareBody, asyncHandler("", sendOTP));

router.route("/verify-otp").post(prepareBody, asyncHandler("", verifyOTP));

router.route("/create").post(
  prepareBody,
  // asyncHandler("user", checkMail),
  asyncHandler("user", register)
);

//GET the PROFILE
router
  .route("/profile/:id")
  .get(asyncHandler("user", asyncHandler("user", getProfile)));

router.route("/register").post(
  prepareBody,
  // signupValidation,
  asyncHandler("user", checkMail),
  asyncHandler("user", Signup)
);

//USER_LOGIN
router
  .route("/login")
  .post(
    prepareBody,
    signinValidation,
    asyncHandler("user", asyncHandler("", Signin))
  );

//GET the PROFILE
router
  .route("/profile")
  .get(verifySign, asyncHandler("user", asyncHandler("user", getProfile)));

//update the PROFILE
router
  .route("/update-profile")
  .patch(prepareBody, verifySign, asyncHandler("user", updateProfile));

//delete the PROFILE
router
  .route("/delete-profile")
  .delete(verifySign, asyncHandler("user", deleteProfile));

//File-Uploader
router.route("/upload-doc").post(upload.array("files", 20), fileUploader);

router.route("/get-one-record/:id").get(asyncHandler("user", getOneProfile));

//RESET-PASSWORD
router.route("/reset-password").patch(
  // prepareBody,
  reset,
  asyncHandler("user", resetPassword)
);

module.exports = router;
