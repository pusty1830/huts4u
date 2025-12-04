const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const Hotel = require("./hotel.model");
const User = require("./user.model");
const Booking = require("./bookings");

const Rating = sequelize.define(
  "rating",
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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    rating: {
      type: DataTypes.FLOAT, // allows 1–5 with decimals (e.g. 4.5)
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
      comment: "Rating given by user to the hotel (1 to 5 stars)",
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "User's feedback for the hotel",
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["hotelId"] },
      { fields: ["userId"] },
      { unique: true, fields: ["hotelId", "userId"] },
      // A user can rate the same hotel only once
    ],
  }
);

module.exports = Rating;
