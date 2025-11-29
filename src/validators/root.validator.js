const Joi = require("joi");
const {
  validationHandler,
  attributeHandler,
} = require("../middleware/ValidationHandler");
const model = require("../models/mappingIndex");
const { getRawData } = require("../utils/function");

let modelvalidate = async (req, res, next) => {
  let tableName = req.params.tableName;
  let schemaObj = {};
  return async.forEachOf(
    model[tableName].rawAttributes,
    (ob_value, key, after_finish) => {
      if (key !== "id") {
        let rawAttributes = getRawData(ob_value.type);
        let fieldType = ob_value.type?.key;
        let statement = "";
        if (fieldType === "TEXT") {
          statement = eval(
            `Joi.string().trim().min(3).${
              ob_value.allowNull ? "optional()" : "required()"
            }`
          );
        } else if (fieldType === "STRING") {
          statement = eval(`Joi.string().trim()
                        .min(${rawAttributes?._length > 100 ? 5 : 1})
                        .max(${rawAttributes?._length})
                        .${ob_value.allowNull ? "optional()" : "required()"}`);
        } else if (fieldType === "INTEGER") {
          statement = eval(
            `Joi.number().min(0).${
              ob_value.allowNull ? "optional()" : "required()"
            }`
          );
        } else if (fieldType === "DATE") {
          statement = eval(`Joi.date().optional()`);
        } else if (fieldType === "BOOLEAN") {
          statement = eval(`Joi.boolean().optional()`);
        }
        schemaObj[key] = statement;
      }
      after_finish();
    },
    (err) => {
      if (err) {
        attributeHandler();
      }
      validationHandler(req, res, next, Joi.object().keys(schemaObj));
    }
  );
};

module.exports = {
  modelvalidate,
};
