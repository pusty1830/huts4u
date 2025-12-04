const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
require("dotenv").config();

// Create transporter with proper Gmail configuration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
  logger: true,
  debug: true,
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server Ready to Send Emails");
  }
});

/**
 * Send Email with EJS Template
 */
async function sendEmail(to, subject, templateName, templateData = {}) {
  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      `${templateName}.ejs`
    );

    // 1. Render the EJS template
    const html = await ejs.renderFile(templatePath, templateData);

    // 2. Setup email config
    const mailOptions = {
      from: `Huts4u`,
      to,
      subject,
      html,
    };

    // 3. Send email
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent:", result.messageId);
    return result;
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
}

module.exports = sendEmail;
