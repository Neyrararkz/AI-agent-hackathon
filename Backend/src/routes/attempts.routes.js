const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { auth, requireRole } = require("../middleware/auth");
const c = require("../controllers/attempts.controller");

router.post("/start", auth, requireRole("student"), asyncHandler(c.startAttempt));
router.post("/:attemptId/submit", auth, requireRole("student"), asyncHandler(c.submitAttempt));
router.get("/:attemptId", auth, requireRole("student"), asyncHandler(c.getAttempt));
router.get("/", auth, requireRole("student"), asyncHandler(c.myAttempts));

module.exports = router;