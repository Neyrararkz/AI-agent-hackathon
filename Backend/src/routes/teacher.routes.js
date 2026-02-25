const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { auth, requireRole } = require("../middleware/auth");
const c = require("../controllers/teacher.controller");

router.post("/groups", auth, requireRole("teacher"), asyncHandler(c.createGroup));
router.get("/groups", auth, requireRole("teacher"), asyncHandler(c.listGroups));

router.post("/groups/:groupId/members", auth, requireRole("teacher"), asyncHandler(c.addMember));
router.get("/groups/:groupId/members", auth, requireRole("teacher"), asyncHandler(c.listMembers));

router.get("/groups/:groupId/analytics/overview", auth, requireRole("teacher"), asyncHandler(c.overview));
router.get("/groups/:groupId/analytics/weak-topics", auth, requireRole("teacher"), asyncHandler(c.weakTopics));
router.get("/groups/:groupId/analytics/trend", auth, requireRole("teacher"), asyncHandler(c.trend));
router.get("/groups/:groupId/analytics/at-risk", auth, requireRole("teacher"), asyncHandler(c.atRisk));

module.exports = router;