const user = require("../models/user.model");

let addData = async (obj) => {
  return await user.create(obj);
};

let addBulkData = async (obj) => {
  return await user.bulkCreate(obj);
};

let getOneUserByCond = async (cond) => {
  return await user.findOne({ where: cond });
};
let updateUser = async (obj, cond) => {
  return await user.update(obj, { where: cond });
};
let deleteUser = async (cond) => {
  return await user.destroy({ where: cond });
};

module.exports = {
  addData,
  addBulkData,
  getOneUserByCond,
  updateUser,
  deleteUser,
};
