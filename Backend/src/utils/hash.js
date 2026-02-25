const bcrypt = require("bcrypt");
const { BCRYPT_ROUNDS } = require("../config/env");

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, comparePassword };