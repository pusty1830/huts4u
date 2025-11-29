const User = require("../service/user.service");
const { prepareResponse } = require("../utils/response");
const { getRawData } = require("../utils/function");
const httpRes = require("../utils/http");
const queryService = require("../service/query.service");
const {
  SERVER_ERROR_MESSAGE,
  VERIFY_EMAIL_BEFORE_LOGIN,
  INVALID_OTP,
  PROFILE_CREATION,
  CURRENT_PASSWORD_INCORRECT,
  LOGIN,
  ACCOUNT_NOT_FOUND,
  USER_PROFILE,
  UPDATE_PROFILE_SUCCESS,
  UPLOADED,
  RESET_PASS_SUCCESS,
  ADD,
} = require("../utils/messages");
const { hashPassword, comparePassword } = require("../utils/Password");
const logger = require("../utils/logger");
const sendEmail = require("../utils/mail");
const { generateSign, generateSign1 } = require("../utils/token");
require("dotenv").config();
const axios = require("axios");
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;

// exports.sendOTP = async (req, res) => {
//   const { phone } = req.body;

//   try {
//     const response = await axios.get(
//       `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN3/OTP1`
//     );

//     if (response.data.Status === "Success") {
//       res
//         .status(httpRes.OK)
//         .json(
//           prepareResponse(
//             "OK",
//             "OTP  Send Successfully",
//             response.data.Details,
//             null
//           )
//         );
//     } else {
//       res
//         .status(httpRes.BAD_REQUEST)
//         .json(prepareResponse("BAD_REQUEST", "Failed to send OTP", null, null));
//     }
//   } catch (error) {
//     res
//       .status(httpRes.SERVER_ERROR)
//       .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
//   }
// };
// exports.verifyOTP = async (req, res) => {
//   const { otp, sessionId, phone } = req.body;

//   if (!sessionId) {
//     return res
//       .status(httpRes.BAD_REQUEST)
//       .json(
//         prepareResponse("BAD_REQUEST", "SessionId is required", null, null)
//       );
//   }

//   try {
//     const verifyResponse = await axios.get(
//       `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
//     );

//     if (verifyResponse.data.Status === "Success") {
//       // 🔎 Check if user exists in the database
//       let user = await User.getOneUserByCond({ phoneNumber: phone });
//       console.log(user);

//       let authToken;

//       if (user) {
//         // ✅ Existing user → Generate token with existing user details
//         authToken = generateSign({
//           phone: user.phoneNumber,
//           id: user.id,
//           name: user.userName,
//           role: "User",
//         });

//         return res
//           .status(httpRes.OK)
//           .json(
//             prepareResponse(
//               "OK",
//               "OTP Verified, Logged In",
//               { user, token: authToken },
//               null
//             )
//           );
//       } else {
//         const hashedPassword = await hashPassword("123456");

//         const newUser = await User.create({
//           phoneNumber: phone,
//           userName: `User_${phone.substring(6)}`,
//           password: hashedPassword,
//           email: email || null,
//           role: "User",
//         });
//         authToken = generateSign({
//           phone: newUser.phoneNumber,
//           id: newUser.id,
//           name: newUser.userName,
//           role: "User",
//         });

//         return res
//           .status(httpRes.OK)
//           .json(
//             prepareResponse(
//               "OK",
//               "OTP Verified, New User",
//               { user: null, phone, token: authToken },
//               null
//             )
//           );
//       }
//     } else {
//       return res
//         .status(httpRes.BAD_REQUEST)
//         .json(
//           prepareResponse(
//             "BAD_REQUEST",
//             "Invalid OTP or Expired Session",
//             null,
//             null
//           )
//         );
//     }
//   } catch (error) {
//     res
//       .status(httpRes.SERVER_ERROR)
//       .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
//   }
// };

// Register New User & Generate Auth Token

exports.sendOTP = async (req, res) => {
  const { phone, name, email } = req.body;

  try {
    // 🔎 Check if user exists
    let user = await User.getOneUserByCond({ phoneNumber: phone });

    if (!user) {
      // 🔥 Create new user (if not present)
      const hashedPassword = await hashPassword("123456");
      user = await User.addData({
        phoneNumber: phone,
        userName: name || `User_${phone.substring(6)}`,
        email: email || null,
        password: hashedPassword,
        role: "User",
      });
    }

    // 📲 Send OTP
    const response = await axios.get(
      `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN3/OTP1`
    );

    if (response.data.Status === "Success") {
      return res
        .status(httpRes.OK)
        .json(
          prepareResponse(
            "OK",
            "OTP Sent Successfully",
            response.data.Details,
            null
          )
        );
    } else {
      return res
        .status(httpRes.BAD_REQUEST)
        .json(prepareResponse("BAD_REQUEST", "Failed to send OTP", null, null));
    }
  } catch (error) {
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.verifyOTP = async (req, res) => {
  const { otp, sessionId, phone, name, email } = req.body;

  if (!sessionId) {
    return res
      .status(httpRes.BAD_REQUEST)
      .json(
        prepareResponse("BAD_REQUEST", "SessionId is required", null, null)
      );
  }

  try {
    // ✅ Step 1: Verify OTP using 2Factor API
    const verifyResponse = await axios.get(
      `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    if (verifyResponse.data.Status === "Success") {
      // 🔎 Step 2: Check if user exists
      let user = await User.getOneUserByCond({ phoneNumber: phone });

      let authToken;

      if (user) {
        // ✅ Existing user → Generate token
        authToken = generateSign(
          user.phoneNumber,
          user.id,
          user.userName,
          "User"
        );

        return res
          .status(httpRes.OK)
          .json(
            prepareResponse(
              "OK",
              "OTP Verified, Logged In",
              { user, token: authToken },
              null
            )
          );
      } else {
        // ✅ New user → Create user + Generate token
        const hashedPassword = await hashPassword("123456");
        const newUser = await User.addData({
          phoneNumber: phone,
          userName: name || `User_${phone.substring(6)}`,
          email: email || null,
          password: hashedPassword,
          role: "User",
        });

        authToken = generateSign(
          newUser.phoneNumber,
          newUser.id,
          newUser.userName,
          "User"
        );

        return res
          .status(httpRes.OK)
          .json(
            prepareResponse(
              "OK",
              "OTP Verified, New User Registered",
              { user: newUser, token: authToken },
              null
            )
          );
      }
    } else {
      // ❌ Invalid OTP
      return res
        .status(httpRes.BAD_REQUEST)
        .json(
          prepareResponse(
            "BAD_REQUEST",
            "Invalid OTP or Expired Session",
            null,
            null
          )
        );
    }
  } catch (error) {
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

// exports.register = async (req, res) => {
//   try {
//     const { password, email } = req.body;
//     const email1 = email || null;
//     const hashedpassword = await hashPassword(password || "123456");
//     req.body.password = hashedpassword;
//     req.body.email = email1;
//     let result = await User.addData(req.body);
//     res
//       .status(httpRes.CREATED)
//       .json(prepareResponse("CREATED", ADD, result, null));
//   } catch (error) {
//     res
//       .status(httpRes.SERVER_ERROR)
//       .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
//   }
// };

exports.register = async (req, res) => {
  try {
    const { phone, password, email, name } = req.body;

    // 🔎 Step 1: Check if user already exists
    let user = await User.getOneUserByCond({ phoneNumber: phone });

    if (user) {
      // ✅ If user exists → Generate token and return
      const authToken = generateSign({
        phone: user.phoneNumber,
        id: user.id,
        name: user.userName,
        role: "User",
      });

      return res
        .status(httpRes.OK)
        .json(
          prepareResponse(
            "OK",
            "User already exists, Logged In",
            { user, token: authToken },
            null
          )
        );
    }

    // 🔥 Step 2: Create new user
    const hashedPassword = await hashPassword(password || "123456");
    user = await User.addData({
      phoneNumber: phone,
      userName: name || `User_${phone.substring(6)}`,
      email: email || null,
      password: hashedPassword,
      role: "User",
    });

    // ✅ Step 3: Generate token for new user
    const authToken = generateSign({
      phone: user.phoneNumber,
      id: user.id,
      name: user.userName,
      role: "User",
    });

    return res
      .status(httpRes.CREATED)
      .json(
        prepareResponse(
          "CREATED",
          "User Registered Successfully",
          { user, token: authToken },
          null
        )
      );
  } catch (error) {
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.getProfile = async (req, res) => {
  try {
    let user = await User.getOneUserByCond({
      phoneNumber: req.params.phoneNumber,
    });

    if (user) {
      res
        .status(httpRes.OK)
        .json(prepareResponse("OK", USER_PROFILE, user, null));
    } else {
      res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }
  } catch (error) {
    logger.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

//documents uploder
exports.fileUploader = (req, res) => {
  if (Array.isArray(req.files)) {
    let files = req.files;
    let data = {};
    files.forEach((file, index) => {
      data[`doc${index}`] = file.location;
    });
    res.status(httpRes.OK).json(prepareResponse("OK", UPLOADED, data, null));
  } else {
    res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, null));
  }
};

// Hotel Signup
exports.Signup = async (req, res) => {
  try {
    const body = req.body;

    // Hash the password
    body.password = await hashPassword(body.password);

    // Save user data directly to the database
    const result = await User.addData(body);

    // Prepare and send response
    const response = prepareResponse(
      "CREATED",
      PROFILE_CREATION,
      getRawData(result),
      null
    );

    return res.status(httpRes.CREATED).json(response);
  } catch (error) {
    logger.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

//Login controller

exports.Signin = async (req, res) => {
  try {
    let result = await User.getOneUserByCond({ email: req.body.email });
    result = getRawData(result);
    if (result) {
      const hash = await comparePassword(req.body.password, result.password);
      if (!hash) {
        logger.error("CurrentPassword is incorrect ");
        res
          .status(httpRes.FORBIDDEN)
          .json(
            prepareResponse("FORBIDDEN", CURRENT_PASSWORD_INCORRECT, null, null)
          );
      } else {
        let token = await generateSign1(
          result.email,
          result.userName,
          result.status,
          result.id,
          result.role
        );
        result.accessToken = token;
        const { password, ...responseData } = result;
        res
          .status(httpRes.OK)
          .json(prepareResponse("OK", LOGIN, responseData, null));
      }
    } else {
      logger.error("Account not found");
      res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }
  } catch (error) {
    logger.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

//get the user data;
exports.getProfile = async (req, res) => {
  try {
    let user = await User.getOneUserByCond({ id: req.decoded.id });

    if (user) {
      res
        .status(httpRes.OK)
        .json(prepareResponse("OK", USER_PROFILE, user, null));
    } else {
      res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }
  } catch (error) {
    logger.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

// update the user data
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.query?.id || req.decoded.id;

    let user = await User.getOneUserByCond({ id: userId });
    if (!user) {
      return res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }

    // Handle password update logic
    if (req.body.password) {
      if (!req.body.currentPassword) {
        return res
          .status(httpRes.BAD_REQUEST)
          .json(
            prepareResponse(
              "BAD_REQUEST",
              "Current password is required",
              null,
              null
            )
          );
      }

      const hash = comparePassword(req.body.currentPassword, user.password);
      if (!hash) {
        return res
          .status(httpResponseCodes.FORBIDDEN)
          .json(
            prepareResponse("FORBIDDEN", CURRENT_PASSWORD_INCORRECT, null, null)
          );
      }

      // Hash the new password
      req.body.password = hashPassword(req.body.password, 10);
    }

    // Update user details
    await User.updateUser(req.body, { id: userId });

    // Fetch the updated user
    const updatedUser = await User.getOneUserByCond({ id: userId });

    // Return success response
    return res
      .status(httpRes.OK)
      .json(prepareResponse("OK", UPDATE_PROFILE_SUCCESS, updatedUser, null));
  } catch (error) {
    console.error("Error in updateProfile:", error);

    // Handle server errors
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
//delete the user data
exports.deleteProfile = async (req, res) => {
  try {
    let userid = req.decoded.id;
    let user = await User.getOneUserByCond({ id: userid });
    if (user) {
      await User.deleteUser(userid);
      res
        .status(httpRes.OK)
        .json(prepareResponse("OK", DELETE_PROFILE_SUCCESS, null, null));
    } else {
      res
        .status(httpRes.FORBIDDEN)
        .json(prepareResponse("FORBIDDEN", ACCOUNT_NOT_FOUND, null, null));
    }
  } catch (error) {
    logger.error(error);
    return res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.getOneProfile = async (req, res) => {
  try {
    let user = await User.getOneUserByCond({ id: req.params });
    if (user) {
      res
        .status(httpRes.OK)
        .json(prepareResponse("OK", USER_PROFILE, user, null));
    } else {
      res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }
  } catch (error) {
    res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
// exports.forgotPassword = async (req, res) => {
//   try {
//     const SUBJECT = `${process.env.KEYWORD} - Password Reset Link`;
//     let obj = req.body;
//     let token = Math.floor(100000 + Math.random() * 900000);
//     let result = await User.getOneUserByCond(req.body);
//     result = getRawData(result);
//     if (result) {
//       let optionToChange = {
//         host: process.env.WEBSITEDOMAIN,
//         firstName: result.userName,
//         email: Buffer.from(obj.email).toString("base64"),
//         token: Buffer.from(token.toString()).toString("base64"),
//       };
//       await User.updateUser(result.id, { token: token });
//       let htmlToSend = await modifymessageFromTemplate(
//         "resetpassword.html",
//         optionToChange
//       );
//       sendMail([obj.email], SUBJECT, htmlToSend);
//       res
//         .status(httpResponseCodes.OK)
//         .json(prepareResponse("OK", RESET_PASS_LINK_SENT, result, null));
//     } else {
//       res
//         .status(httpResponseCodes.NOT_FOUND)
//         .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
//     }
//   } catch (error) {
//     res
//       .status(httpResponseCodes.SERVER_ERROR)
//       .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
//   }
// };

exports.resetPassword = async (req, res) => {
  try {
    let obj = req.body;
    obj.password = await bcrypt.hash(obj.password, 10);
    let user = await User.getOneUserByCond({
      email: obj.email,
      token: obj.token,
    });
    user = getRawData(user);
    if (user) {
      let result = await User.updateUser(user.id, {
        token: null,
        password: obj.password,
      });

      res
        .status(httpRes.OK)
        .json(prepareResponse("OK", RESET_PASS_SUCCESS, user, null));
    } else {
      res
        .status(httpRes.NOT_FOUND)
        .json(prepareResponse("NOT_FOUND", ACCOUNT_NOT_FOUND, null, null));
    }
  } catch (error) {
    res
      .status(httpRes.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
