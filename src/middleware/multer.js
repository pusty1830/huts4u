const multers3 = require("multer-s3");
const multer = require("multer");
const path = require("path");
require("dotenv").config();
const s3 = require("../utils/s3uploader");

const upload = multer({
  storage: multers3({
    s3: s3,
    // acl: "public-read",
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multers3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const fileName = `${file.originalname}_${Date.now()}_${Math.round(
        Math.random() * 1e9
      )}`;
      cb(null, `${fileName}${path.extname(file.originalname)}`);
    },
  }),
});

module.exports = upload;
