const { Sequelize } = require("sequelize");
const sequelizeConfig = require("../config/db.config");
const User = require("./user.model");

const Hotel = sequelizeConfig.define(
  "hotel",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    propertyName: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    propertyType: {
      type: Sequelize.ENUM("Hotel", "Villa"),
      allowNull: false,
      defaultValue: "Hotel",
    },
    propertyDesc: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    ownerMobile: {
      type: Sequelize.STRING(20), // Reduced size for phone numbers
      allowNull: false,
    },
    ownerEmail: {
      type: Sequelize.STRING(100), // Reduced size for email
      allowNull: false,
      validate: {
        isEmail: true, // Email validation
      },
    },
    receptionMobile: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    receptionEmail: {
      type: Sequelize.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    address: {
      // Fixed typo from `adress`
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    city: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    state: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    pincode: {
      type: Sequelize.STRING(10), // Reduced size to match standard pincode length
      allowNull: false,
    },
    landmark: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    googleBusinessPage: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    gstNo: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    panNo: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    gstCertificateImage: {
      type: Sequelize.STRING(300), // Increased size for URL
      allowNull: true,
    },
    bankName: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    bankAccountNumber: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    bankIfsc: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    bankPassbook: {
      type: Sequelize.STRING(300), // Increased size for URL
      allowNull: false,
    },
    panCardImage: {
      type: Sequelize.STRING(300),
      allowNull: false,
    },
    extraService: {
      type: Sequelize.STRING(300),
      allowNull: true,
    },
    propertyPolicy: {
      type: Sequelize.JSON, // ✅ Changed to JSON
      allowNull: false,
    },
    coupleFriendly: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "yes",
    },
    petFriendly: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "yes",
    },
    familyFriendly: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "yes",
    },
    businessFriendly: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "yes",
    },
    propertyImages: {
      type: Sequelize.JSON, // ✅ Changed to JSON
      allowNull: true,
    },

    ratings: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {
        rating: 5,
        reviews: 0,
      },
    },
    noOfRoomsAvailableAfterBookings: {
      type: Sequelize.STRING(30),
      allowNull: true,
    },
    remarks: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    roomAvailable: {
      type: Sequelize.ENUM("Available", "Unavailable"),
      allowNull: false,
      defaultValue: "Available",
    },
    status: {
      type: Sequelize.ENUM("Pending", "Reject", "Approved"),
      allowNull: false,
      defaultValue: "Pending",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

User.hasMany(Hotel, { foreignKey: "userId", onDelete: "CASCADE" });

module.exports = Hotel;
