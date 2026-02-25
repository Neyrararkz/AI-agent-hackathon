const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { auth, requireRole } = require("../middleware/auth");
const c = require("../controllers/tests.controller");

router.post("/generate", auth, requireRole("student"), asyncHandler(c.generateTest));
router.get("/:testId", auth, requireRole("student"), asyncHandler(c.getTest));

module.exports = router;


