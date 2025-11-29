const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
require("dotenv").config();

const sendEmail = async (email, title, otp) => {
  const templatePath = path.join(__dirname, "../views/emailTamplet.ejs");
  const message = await ejs.renderFile(templatePath, {
    title,
    message: ` ${otp}.`,
  });
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Huts4u" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: title,
    html: message,
  });
};

module.exports = sendEmail;
