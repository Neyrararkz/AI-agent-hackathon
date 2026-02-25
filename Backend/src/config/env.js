const dotenv = require("dotenv");
dotenv.config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

module.exports = {
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: must("DATABASE_URL"),
  JWT_SECRET: must("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 10),
  AI_URL: must("AI_URL"), 
};