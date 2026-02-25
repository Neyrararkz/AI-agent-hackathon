const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { auth } = require("../middleware/auth");
const c = require("../controllers/auth.controller");

router.post("/register", asyncHandler(c.register));
router.post("/login", asyncHandler(c.login));
router.get("/me", auth, asyncHandler(c.me));

module.exports = router;