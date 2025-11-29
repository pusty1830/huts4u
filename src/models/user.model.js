const Sequilize = require("sequelize");
const sequlizeConfig = require("../config/db.config");

const user = sequlizeConfig.define(
  "user",
  {
    id: {
      type: Sequilize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userName: {
      type: Sequilize.STRING(50),
      allowNull: false,
    },
    email: {
      type: Sequilize.STRING(100),
      allowNull: true,
    },
    password: {
      type: Sequilize.STRING(100),
      allowNull: false,
      defaultValue: "123456",
    },
    role: {
      type: Sequilize.ENUM("User", "Hotel", "Admin"),
      allowNull: false,
      defaultValue: "User",
    },
    phoneNumber: {
      type: Sequilize.STRING(20),
      allowNull: false,
      unique: true,
    },

    profileImage: {
      allowNull: true,
      type: Sequilize.STRING(300),
    },
    isVerified: {
      allowNull: false,
      type: Sequilize.BOOLEAN,
      defaultValue: false,
    },
    token: {
      type: Sequilize.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        fields: ["id"],
      },
      {
        fields: ["email"],
      },
    ],
  }
);

module.exports = user;
