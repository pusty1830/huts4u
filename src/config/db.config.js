require("dotenv").config();
const Sequlize = require("sequelize");

const sequlize = new Sequlize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
  }
);

module.exports = sequlize;
