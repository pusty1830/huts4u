const { Sequelize } = require("sequelize");
const sequelizeConfig = require("../config/db.config");

const Room = sequelizeConfig.define(
  "rooms",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    hotelId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      // references: {
      //   model: Hotel,
      //   key: "id",
      // },
      // onUpdate: "CASCADE",
      // onDelete: "CASCADE",
    },
    stayType: {
      type: Sequelize.ENUM("Overnight", "Hourly"),
      allowNull: false,
      defaultValue: "Overnight",
    },
    roomCategory: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    roomSize: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    availableRooms: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    rateFor1Night: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    rateFor3Hour: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    rateFor6Hour: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    rateFor12Hour: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    additionalGuestRate: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    additionalChildRate: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    standardRoomOccupancy: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    maxRoomOccupancy: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    numberOfFreeChildren: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    taxRate: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    extrafees: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    amenities: {
      type: Sequelize.JSON, // ✅ Changed to JSON
      allowNull: false,
    },
    roomImages: {
      type: Sequelize.JSON, // ✅ Changed to JSON
      allowNull: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// // ✅ Define the association with the Hotel model
// Hotel.hasMany(Room, { foreignKey: "hotelId", onDelete: "CASCADE" });
// Room.belongsTo(Hotel, { foreignKey: "hotelId", onDelete: "CASCADE" });

module.exports = Room;

const Hotel = require("./hotel.model");
// ✅ Define the association with the Hotel model
Hotel.hasMany(Room, { foreignKey: "hotelId", onDelete: "CASCADE" });
Room.belongsTo(Hotel, { foreignKey: "hotelId", onDelete: "CASCADE" });
