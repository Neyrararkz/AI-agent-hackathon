const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../db/pool");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { hashPassword, comparePassword } = require("../utils/hash");

const RegisterSchema = z.object({
  role: z.enum(["student", "teacher"]),
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register(req, res) {
  const body = RegisterSchema.parse(req.body);

  const exists = await pool.query("SELECT id FROM users WHERE email=$1", [body.email]);
  if (exists.rowCount) return res.status(409).json({ error: "Email already exists" });

  const password_hash = await hashPassword(body.password);

  const q = `
    INSERT INTO users(role, full_name, email, password_hash)
    VALUES ($1,$2,$3,$4)
    RETURNING id, role, full_name, email, created_at
  `;
  const r = await pool.query(q, [body.role, body.full_name, body.email, password_hash]);
  const user = r.rows[0];

  const token = sign(user);
  res.json({ token, user });
}

async function login(req, res) {
  const body = LoginSchema.parse(req.body);

  const r = await pool.query(
    "SELECT id, role, full_name, email, password_hash FROM users WHERE email=$1",
    [body.email]
  );
  if (!r.rowCount) return res.status(401).json({ error: "Invalid credentials" });

  const user = r.rows[0];
  const ok = await comparePassword(body.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = sign(user);
  delete user.password_hash;

  res.json({ token, user });
}

async function me(req, res) {
  const r = await pool.query(
    "SELECT id, role, full_name, email, created_at, skill_map FROM users WHERE id=$1",
    [req.user.id]
  );
  res.json({ user: r.rows[0] });
}

module.exports = { register, login, me };