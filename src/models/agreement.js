const { Sequelize } = require("sequelize");
const sequelizeConfig = require("../config/db.config");

const Agreement = sequelizeConfig.define(
  "agreement",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    hotelName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    hotelAddress: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    agreementDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    huts4uSignature: {
      type: Sequelize.STRING, // can store digital signature file URL or text
      allowNull: true,
    },
    hotelSignature: {
      type: Sequelize.STRING, // same here
      allowNull: true,
    },
    fullAgreementText: {
      type: Sequelize.TEXT("long"), // full agreement terms and conditions
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Agreement;
