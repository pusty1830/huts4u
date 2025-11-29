const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const User = require("./user.model");
const Hotel = require("./hotel.model");
const Booking = require("./bookings"); // <-- make sure this path/name is correct

const Cancel = sequelize.define(
  "cancel", // consider "cancellations" or "booking_cancellations"
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // who requested the cancellation (usually required)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // set false if cancellation must have a user
      references: { model: User, key: "id" },
      onDelete: "SET NULL",
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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    // store amount in decimal (preferred) OR an integer smallest unit like paise
    amount: {
      type: DataTypes.DECIMAL(12, 2), // supports up to 9999999999.99
      allowNull: false,
      defaultValue: 0.0,
    },

    // amount actually refunded (might be different from requested amount)
    refundAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    // reason given by user/admin
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // status of cancellation processing
    status: {
      type: DataTypes.ENUM("pending", "completed", "refunded", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },

    // who processed/refunded (admin user id)
    processedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // when refund was processed
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // optional: store currency if multi-currency system
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: "INR",
    },
  },
  {
    timestamps: true,
    // paranoid: true, // enable soft deletes if you want
    indexes: [
      { fields: ["bookingId"] },
      { fields: ["hotelId"] },
      { fields: ["userId"] },
      { fields: ["status"] },
    ],
  }
);

module.exports = Cancel;
