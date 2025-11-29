const Joi = require("joi");
const { validationHandler } = require("../middleware/ValidationHandler");

// Validation schema for signup
const signupValidation = (req, res, next) => {
  const schema = Joi.object().keys({
    firstName: Joi.string().min(3).max(50).required().messages({
      "string.base": "Username must be a string.",
      "string.empty": "Username cannot be empty.",
      "string.min": "Username must be at least 3 characters long.",
      "string.max": "Username cannot exceed 50 characters.",
      "any.required": "Username is required.",
    }),
    lastName: Joi.string().min(3).max(50).required().messages({
      "string.base": "Username must be a string.",
      "string.empty": "Username cannot be empty.",
      "string.min": "Username must be at least 3 characters long.",
      "string.max": "Username cannot exceed 50 characters.",
      "any.required": "Username is required.",
    }),

    email: Joi.string().email().required().messages({
      "string.base": "Email must be a string.",
      "string.email": "Email must be a valid email address.",
      "string.empty": "Email cannot be empty.",
      "any.required": "Email is required.",
    }),

    password: Joi.string().min(6).max(100).required().messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password cannot be empty.",
      "string.min": "Password must be at least 6 characters long.",
      "string.max": "Password cannot exceed 100 characters.",
      "any.required": "Password is required.",
    }),

    role: Joi.string()
      .valid("User", "Artist", "Business", "Admin")
      .default("User")
      .messages({
        "string.base": "Role must be a string.",
        "any.only": "Role must be one of the following: Admin, Teacher, User.",
        "any.required": "Role is required.",
      }),

    // phoneNumber: Joi.string()
    //   .pattern(/^\+?[0-9]{10,15}$/)
    //   .required()
    //   .messages({
    //     "string.base": "Phone number must be a string.",
    //     "string.empty": "Phone number cannot be empty.",
    //     "string.pattern.base":
    //       "Phone number must be a valid phone number with 10 to 15 digits.",
    //     "any.required": "Phone number is required.",
    //   }),

    coverImage: Joi.string().uri().allow(null).messages({
      "string.base": "Cover image must be a valid URI.",
      "any.allowOnly": "Cover image is optional.",
    }),

    profileImage: Joi.string().uri().allow(null).messages({
      "string.base": "Profile image must be a valid URI.",
      "any.allowOnly": "Profile image is optional.",
    }),

    isVerified: Joi.boolean().default(false),

    token: Joi.string().allow(null),
  });
  validationHandler(req, res, next, schema);
};

const signinValidation = (req, res, next) => {
  const schema = Joi.object().keys({
    email: Joi.string().email().required().messages({
      "string.base": "Email must be a string.",
      "string.email": "Email must be a valid email address.",
      "string.empty": "Email cannot be empty.",
      "any.required": "Email is required.",
    }),

    password: Joi.string().min(6).max(100).required().messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password cannot be empty.",
      "string.min": "Password must be at least 6 characters long.",
      "string.max": "Password cannot exceed 100 characters.",
      "any.required": "Password is required.",
    }),
  });
  validationHandler(req, res, next, schema);
};
const forgotPassword = (req, res, next) => {
  const schema = Joi.object().keys({
    email: Joi.string().trim().email().required(),
  });

  validationHandler(req, res, next, schema);
};

const resetPassword = (req, res, next) => {
  const schema = Joi.object().keys({
    email: Joi.string().trim().email().required(),
    token: Joi.string().trim().required(),
    password: Joi.string()
      .trim()
      .pattern(
        new RegExp(
          "(?=[A-Za-z0-9@#$%^&+!=]+$)^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&+!=])(?=.{8,}).*$"
        )
      )
      .required(),
  });

  validationHandler(req, res, next, schema);
};

const update = (req, res, next) => {
  const schema = Joi.object().keys({
    userName: Joi.string().trim().alphanum().min(3).max(50),
    email: Joi.string().trim().email(),
    password: Joi.string()
      .trim()
      .pattern(
        new RegExp(
          "(?=[A-Za-z0-9@#$%^&+!=]+$)^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&+!=])(?=.{8,}).*$"
        )
      ),
    currentPassword: Joi.string()
      .trim()
      .pattern(
        new RegExp(
          "(?=[A-Za-z0-9@#$%^&+!=]+$)^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&+!=])(?=.{8,}).*$"
        )
      ),
    status: Joi.string().trim().optional().default("CREATED"),
  });
  validationHandler(req, res, next, schema);
};
module.exports = {
  signupValidation,
  signinValidation,
  forgotPassword,
  resetPassword,
  update,
};
