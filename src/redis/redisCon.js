const redis = require("redis");
const logger = require("../utils/logger");
require("dotenv").config();

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

(async () => {
  try {
    await redisClient.connect();
    logger.info("Connected to Redis");
  } catch (err) {
    logger.error("Error connecting to Redis:", err);
  }
})();

module.exports = redisClient;
