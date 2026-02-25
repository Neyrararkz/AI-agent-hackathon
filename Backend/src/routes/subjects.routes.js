const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const c = require("../controllers/subjects.controller");

router.get("/", asyncHandler(c.listSubjects));
router.get("/:subjectId/topics", asyncHandler(c.listTopics));

module.exports = router;