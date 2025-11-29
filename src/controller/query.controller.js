const queryService = require("../service/query.service");
const httpres = require("../utils/http");
const {
  SERVER_ERROR_MESSAGE,
  ADD,
  UPDATE,
  GET,
  DELETE,
} = require("../utils/messages");
const { prepareResponse } = require("../utils/response");
const logger = require("../utils/logger");

exports.createData = async (req, res) => {
  try {
    let result = await queryService.addData(req.tableName, req.body);
    res
      .status(httpres.CREATED)
      .json(prepareResponse("CREATED", ADD, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.insertManyData = async (req, res) => {
  try {
    let result = await queryService.addBulkCreate(req.tableName, req.body);
    res
      .status(httpres.CREATED)
      .json(prepareResponse("CREATED", ADD, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.getAllRecod = async (req, res) => {
  try {
    let result = await queryService.getAllDataByCond(req.tableName, req.body);
    res.status(httpres.OK).json(prepareResponse("OK", GET, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
exports.getAllRecordBelongsTo = async (req, res) => {
  try {
    let secondTable = req.body.secondTable;
    delete req.body.secondTable;
    let result = await queryService.getAllDataByCondWithBelongsTo(
      req.tableName,
      req.body,
      secondTable
    );
    res.status(httpres.OK).json(prepareResponse("OK", GET, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
exports.updaterecord = async (req, res) => {
  try {
    let result = await queryService.updateData(
      req.tableName,
      req.params,
      req.body
    );
    res.status(httpres.OK).json(prepareResponse("OK", UPDATE, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
exports.deleterecord = async (req, res) => {
  try {
    let result = await queryService.deleteData(req.tableName, req.params);
    res.status(httpres.OK).json(prepareResponse("OK", DELETE, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.getOneData = async (req, res) => {
  try {
    // const id = req.params.id;

    let result = await queryService.getOneDataByCond(req.tableName, req.params);
    res.status(httpres.OK).json(prepareResponse("OK", GET, result, null));
  } catch (error) {
    logger.error("Internal server error:" + error);
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.getOneDataByUniqeKey = async (req, res) => {
  try {
    let result = await queryService.getOneDataByCond(req.tableName, req.query);
    res.status(httpres.OK).json(prepareResponse("OK", GET, result, null));
  } catch (error) {
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};

exports.searchData = async (req, res) => {
  try {
    let cond = req.body.data;
    let page = req.body.page;
    let pageSize = req.body.pageSize;
    let order = req.body.order;
    let includeTable = req.body.includeTable || null; // Get related table name

    let result = await queryService.getAllDataByCondAndPagination(
      req.tableName,
      cond,
      page,
      pageSize,
      order,
      includeTable
    );

    res.status(httpres.OK).json(prepareResponse("OK", GET, result, null));
  } catch (error) {
    res
      .status(httpres.SERVER_ERROR)
      .json(prepareResponse("SERVER_ERROR", SERVER_ERROR_MESSAGE, null, error));
  }
};
