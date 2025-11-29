const redisClient = require("./redisCon");

const storeOtpInRedis = async (key, data, expiration = 300) => {
  if (!key || !data) {
    console.error("Invalid key or data for Redis storage.");
    throw new Error("Invalid Redis storage parameters");
  }

  console.log("Storing data in Redis:", { key, data });
  const result = await redisClient.set(key, JSON.stringify(data), {
    EX: expiration,
  });
  console.log("Redis set result:", result);
};

const verifyOtpInRedis = async (key) => {
  try {
    console.log("Retrieving data from Redis for key:", key);
    const rawData = await redisClient.get(key); // Fetch the data
    console.log("Raw data retrieved from Redis:", rawData);

    // Handle null or undefined rawData
    if (!rawData) {
      console.warn(`No data found in Redis for key: ${key}`);
      return null;
    }

    // Parse the JSON data
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error accessing Redis or parsing data:", error);
    throw error; // Re-throw to handle in higher-level functions
  }
};

const deleteRedisKey = async (key) => {
  await redisClient.del(key);
};

module.exports = {
  storeOtpInRedis,
  verifyOtpInRedis,
  deleteRedisKey,
};
