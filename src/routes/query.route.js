const router = require("express").Router({ mergeParams: true });
const { prepareBody } = require("../utils/response");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  createData,
  insertManyData,
  getAllRecod,
  getAllRecordBelongsTo,
  updaterecord,
  deleterecord,
  getOneData,
  getOneDataByUniqeKey,
  searchData,
} = require("../controller/query.controller");
const { modelvalidate } = require("../validators/root.validator");
const { verifySign } = require("../utils/token");

router.route("/create").post(
  prepareBody,
  //  modelvalidate,
  asyncHandler("", createData)
);
router.route("/insertMany").post(prepareBody, asyncHandler("", insertManyData));
router.route("/get-all-record").get(prepareBody, asyncHandler("", getAllRecod));
router
  .route("/get-all-record-with-belongs-to")
  .post(prepareBody, asyncHandler("", getAllRecordBelongsTo));
router
  .route("/update-record/:id")
  .patch(prepareBody, asyncHandler("", updaterecord));
router.route("/delete-record/:id").delete(asyncHandler("", deleterecord));
router
  .route("/get-one-record/:id")
  .get(verifySign, asyncHandler("", getOneData));

router.route("/search-one-record").get(asyncHandler("", getOneDataByUniqeKey));

router.route("/search-record").post(prepareBody, asyncHandler("", searchData));
//getone record
module.exports = router;
