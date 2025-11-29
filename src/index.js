const express = require("express");
const app = express();
const logger = require("./utils/logger");
const cors = require("cors");
require("dotenv").config();
const sequilize = require("./config/db.config");
const path = require("path");
const {startPayoutCron}=require('./utils/corn')

//middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

startPayoutCron();

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    // "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
    "*"
  );
  next();
});

const buildpath = path.join(__dirname, "../build");
app.use(express.static(buildpath));

//database
sequilize
  .authenticate()
  .then(() => {
    logger.info("Database Connected Successfully");
    sequilize
      .sync({ force: false, alter: true }) //its doing the table sync and
      .then(() => {
        logger.info("Database Synced Successfully");
      })
      .catch((syncErr) => {
        logger.error("Error Syncing Database: " + syncErr.message);
        process.exit(1);
      });
  })
  .catch((err) => {
    logger.error("Error Connecting to Database", err);
    process.exit(1);
  });

//routes
app.use("/api", require("./routes/index"));

app.get("/get", async (req, res) => {
  try {
    // Simulate a database or API call
    res.send({ message: "API is working!" });
  } catch (err) {
    console.log("Error occurred:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(buildpath, "index.html"));
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`server is running on port ${PORT}`);
});
