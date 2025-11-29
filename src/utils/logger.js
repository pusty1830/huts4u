// const { createLogger, format, transports } = require("winston");
// const path = require('path');
// const fs = require('fs');
// const chalk = require('chalk');
// const { combine, timestamp, json, colorize } = format;
// const consoleLogFormat = format.combine(
//   format.colorize(),
//   format.printf(({ level, message, timestamp }) => {
//     return `${level}: ${message}`;
//   })
// );

// const logger = createLogger({
//   level: "info",
//   format: combine(colorize(), timestamp(), json()),
//   transports: [
//     new transports.Console({
//       format: consoleLogFormat,
//     }),
//     new transports.File({ filename: "app.log" }),
//   ],
// });

// module.exports = logger;
const winston = require("winston");
const path = require("path");
const fs = require("fs");

class Logger {
  constructor() {
    this.logDir = this.createLogDirectory();

    this.logger = this.createWinstonLogger();

    this.setupGlobalErrorHandlers();
  }

  // Create a log directory if it doesn't exist
  createLogDirectory() {
    const logDir = path.join(__dirname, "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  }

  // Create the Winston logger
  createWinstonLogger() {
    return winston.createLogger({
      level: "info", // Default log level
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(
          ({ timestamp, level, message }) =>
            `${timestamp} [${level.toUpperCase()}]: ${message}`
        )
      ),
      transports: [
        new winston.transports.Console(), // Log to the console
        new winston.transports.File({
          filename: path.join(this.logDir, "combined.log"),
        }), // Log to file
        new winston.transports.File({
          filename: path.join(this.logDir, "error.log"),
          level: "error",
        }), // Error logs
      ],
    });
  }

  // Handle global errors
  setupGlobalErrorHandlers() {
    process.on("uncaughtException", (error) => {
      this.logger.error(`Uncaught Exception: ${error.message}`);
      console.error("Uncaught Exception. Shutting down...");
      process.exit(1); // Exit process
    });

    process.on("unhandledRejection", (reason) => {
      this.logger.error(`Unhandled Rejection: ${reason}`);
      console.error("Unhandled Rejection detected.");
    });
  }
}

// Export the logger instance
module.exports = new Logger().logger;
