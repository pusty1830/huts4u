const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const Hotel = require("./hotel.model");
const User = require("./user.model");
const Booking = require("./bookings");

const MyPayment = sequelize.define(
  "mypayment",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Hotel, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Booking, key: "id" },
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // amounts stored in smallest currency unit (paise)
    amountPaise: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: "Total gross amount to pay (in paise)",
    },

    // fees charged by platform or gateway (in paise)
    feePaise: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0,
    },

    // net amount after fee (in paise)
    netmyAmountPaise: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },

    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: "INR",
    },

    // which bookings are included in this payout (array of booking ids)
    bookingsIncluded: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of booking IDs or objects used to compute this payout",
    },

    // schedule and processing timestamps
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When payout is scheduled to be processed by cron",
    },

    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the payout attempt was initiated",
    },

    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the payout was completed (success or final failure)",
    },

    // status lifecycle
    status: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "pending",
    },

    // payment gateway/reference id for the transfer
    transactionRef: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // raw gateway response (store for auditing)
    gatewayResponse: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    // if failed, store reason
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // admin/user that processed this payout
    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // free text notes
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["hotelId"] }, { fields: ["status"] }],
  }
);

module.exports = MyPayment;
