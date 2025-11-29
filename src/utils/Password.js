const bcrypt = require("bcryptjs");

const hashPassword = async (password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return hashedPassword;
};

const comparePassword = async (password, compPass) => {
  return await bcrypt.compare(password, compPass);
};

module.exports = {
  hashPassword,
  comparePassword,
};
