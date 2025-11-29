const httpRes = require("./http");
require("dotenv").config();
const CYS = process.env.CYS;
const cryptoJS = require("crypto-js");

const prepareResponse = (status_code, msg, data, error) => {
  console.log(error);
  return {
    status_code: status_code,
    msg: msg,
    data: cryptoJS.AES.encrypt(JSON.stringify(data), CYS).toString(),
    error: error,
  };
};

const prepareBody = (req, res, next) => {
  if (req.get("Referrer") !== "http://localhost:4000/api-docs/") {
    req.body = JSON.parse(
      cryptoJS.AES.decrypt(req.body.cypher, CYS).toString(cryptoJS.enc.Utf8)
    );
  }
  next();
};

module.exports = {
  prepareResponse,
  prepareBody,
};
