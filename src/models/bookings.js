const { Sequelize } = require("sequelize");
const sequelizeConfig = require("../config/db.config");
const User = require("./user.model");
const Hotel = require("./hotel.model");

const Booking = sequelizeConfig.define(
  "booking",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
    },
    geustName: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    hotelId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: Hotel,
        key: "id",
      },
    },
    checkInDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    checkInTime: {
      type: Sequelize.STRING,
      allowNull: true, // Can be null for overnight booking
    },
    checkOutDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    checkOutTime: {
      type: Sequelize.STRING,
      allowNull: true, // Can be null for overnight booking
    },
    amountPaid: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    // availableRooms: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    // },
    bookingType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    geustDetails: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    adults: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    children: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    hotelName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM("pending", "checkedIn", "checkedOut"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Booking;
