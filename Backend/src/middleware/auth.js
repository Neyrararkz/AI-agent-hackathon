const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

function auth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const [type, token] = hdr.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; 
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { auth, requireRole };